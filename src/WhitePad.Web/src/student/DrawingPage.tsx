import { useRef, useEffect, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { StrokeBatcher } from '../shared/utils/strokeBatching';
import { StrokePoint, StrokeBatch, StudentLocked, Shape } from '../shared/types/messages';
import Toolbar, { ToolType, BackgroundType } from './Toolbar';

interface DrawingPageProps {
  roomId: string;
  studentId: string;
  displayName: string;
  connection: HubConnection;
}

interface StoredStroke {
  strokeId: string;
  batches: StrokeBatch[];
  color: string;
  lineWidth: number;
}

function DrawingPage({ studentId, displayName, connection }: DrawingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const batcherRef = useRef<StrokeBatcher | null>(null);
  const isDrawingRef = useRef(false);

  // Drawing state
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentThickness, setCurrentThickness] = useState(2);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentBackground, setCurrentBackground] = useState<BackgroundType>('none');
  const [confidenceLevel, setConfidenceLevel] = useState<'none' | 'red' | 'amber' | 'green'>('none');
  const [isLocked, setIsLocked] = useState(false);

  // Undo/redo state
  const strokesRef = useRef<Map<string, StoredStroke>>(new Map());
  const [strokeHistory, setStrokeHistory] = useState<string[]>([]);
  const strokeHistoryRef = useRef<string[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<string[]>([]);
  const currentBackgroundRef = useRef<BackgroundType>('none');

  // Cursor state for eraser
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // Shape state
  const shapesRef = useRef<Map<string, Shape>>(new Map());
  const [shapeInProgress, setShapeInProgress] = useState<Shape | null>(null);

  // Keep strokeHistoryRef in sync with strokeHistory
  useEffect(() => {
    strokeHistoryRef.current = strokeHistory;
  }, [strokeHistory]);

  // Keep currentBackgroundRef in sync with currentBackground
  useEffect(() => {
    currentBackgroundRef.current = currentBackground;
  }, [currentBackground]);

  // Redraw background canvas when background changes
  useEffect(() => {
    renderBackgroundCanvas();
  }, [currentBackground]);

  // Listen for lock state changes
  useEffect(() => {
    const handleStudentLocked = (message: StudentLocked) => {
      if (message.studentId === studentId) {
        setIsLocked(message.isLocked);
      }
    };

    connection.on('StudentLocked', handleStudentLocked);

    return () => {
      connection.off('StudentLocked', handleStudentLocked);
    };
  }, [connection, studentId]);

  // Listen for teacher-initiated board clear
  useEffect(() => {
    const handleBoardCleared = (message: { studentId: string }) => {
      if (message.studentId === studentId) {
        // Clear local state
        strokesRef.current.clear();
        shapesRef.current.clear();
        setStrokeHistory([]);
        setUndoneStrokes([]);

        // Clear canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
    };

    connection.on('BoardCleared', handleBoardCleared);

    return () => {
      connection.off('BoardCleared', handleBoardCleared);
    };
  }, [connection, studentId]);

  // Manual resize handler that can be called when needed
  const handleCanvasResize = useRef(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('[RESIZE] Canvas ref is null');
      return;
    }

    // Skip if currently drawing
    if (isDrawingRef.current) {
      console.log('[RESIZE] Skipping - currently drawing');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const currentHistory = strokeHistoryRef.current;
    console.log('[RESIZE] Canvas dimensions:', {
      currentWidth: canvas.width,
      currentHeight: canvas.height,
      newWidth: rect.width,
      newHeight: rect.height,
      strokeHistoryLength: currentHistory.length,
      strokesInMap: strokesRef.current.size
    });

    // Only resize if dimensions actually changed
    if (canvas.width === rect.width && canvas.height === rect.height) {
      console.log('[RESIZE] Dimensions unchanged, skipping');
      return;
    }

    console.log('[RESIZE] Resizing canvas and redrawing with', currentHistory.length, 'strokes...');
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Also resize background canvas to match
    const backgroundCanvas = backgroundCanvasRef.current;
    if (backgroundCanvas) {
      backgroundCanvas.width = rect.width;
      backgroundCanvas.height = rect.height;
      // Redraw background on the background canvas
      const bgCtx = backgroundCanvas.getContext('2d');
      if (bgCtx) {
        drawBackground(bgCtx, backgroundCanvas.width, backgroundCanvas.height, currentBackgroundRef.current);
      }
    }

    // Get context and redraw manually using the ref
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentHistory.forEach(strokeId => {
      const stroke = strokesRef.current.get(strokeId);
      if (!stroke) {
        console.log('[RESIZE-REDRAW] Stroke not found:', strokeId);
        return;
      }

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const allPoints: StrokePoint[] = [];
      stroke.batches.forEach(batch => {
        allPoints.push(...batch.points);
      });

      if (allPoints.length === 0) return;

      ctx.beginPath();
      const firstPoint = allPoints[0];
      ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);

      for (let i = 1; i < allPoints.length; i++) {
        const point = allPoints[i];
        ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
      }

      ctx.stroke();
    });

    console.log('[RESIZE] Redraw complete');
  });

  // Initial setup and window resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let resizeTimeout: number | null = null;

    // Initial resize
    handleCanvasResize.current();

    // Handle actual window resize (browser window size change)
    const handleWindowResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = window.setTimeout(() => {
        handleCanvasResize.current();
      }, 150);
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, []);

  const redrawCanvas = (strokeIds?: string[]) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('[REDRAW] Canvas ref is null');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[REDRAW] Cannot get 2D context');
      return;
    }

    // Use provided strokeIds or current strokeHistory
    const idsToRender = strokeIds !== undefined ? strokeIds : strokeHistory;

    console.log('[REDRAW] Starting redraw:', {
      strokeIdsProvided: strokeIds !== undefined,
      idsToRenderCount: idsToRender.length,
      strokesInMap: strokesRef.current.size,
      canvasSize: { width: canvas.width, height: canvas.height }
    });

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes and shapes in history order
    let drawnCount = 0;
    idsToRender.forEach(id => {
      // Try to find as stroke first
      const stroke = strokesRef.current.get(id);
      if (stroke) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw all points from all batches
        const allPoints: StrokePoint[] = [];
        stroke.batches.forEach(batch => {
          allPoints.push(...batch.points);
        });

        if (allPoints.length === 0) {
          console.log('[REDRAW] Stroke has no points:', id);
          return;
        }

        ctx.beginPath();
        const firstPoint = allPoints[0];
        ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);

        for (let i = 1; i < allPoints.length; i++) {
          const point = allPoints[i];
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        }

        ctx.stroke();
        drawnCount++;
        return;
      }

      // Try to find as shape
      const shape = shapesRef.current.get(id);
      if (shape) {
        renderShape(ctx, shape, canvas.width, canvas.height, false);
        drawnCount++;
        return;
      }

      console.log('[REDRAW] Item not found in maps:', id);
    });

    console.log('[REDRAW] Completed. Drew', drawnCount, 'strokes');
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, backgroundType: BackgroundType) => {
    if (backgroundType === 'none') return;

    ctx.save();
    ctx.strokeStyle = '#e5e5e5'; // Light gray, faint
    ctx.lineWidth = 0.5;

    const spacing = 35; // ~35px spacing similar to notebook paper on iPad

    switch (backgroundType) {
      case 'dotted':
        // Draw dots in a grid
        for (let x = spacing; x < width; x += spacing) {
          for (let y = spacing; y < height; y += spacing) {
            ctx.fillStyle = '#d0d0d0';
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;

      case 'lined':
        // Draw horizontal lines like ruled paper
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;

      case 'squares':
        // Draw grid lines
        // Vertical lines
        for (let x = spacing; x < width; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        // Horizontal lines
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;
    }

    ctx.restore();
  };

  // Render background on separate background canvas
  const renderBackgroundCanvas = () => {
    const canvas = backgroundCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the background canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the background pattern
    drawBackground(ctx, canvas.width, canvas.height, currentBackground);
  };

  const renderShape = (ctx: CanvasRenderingContext2D, shape: Shape, canvasWidth: number, canvasHeight: number, isDashed: boolean = false) => {
    if (shape.points.length === 0) return;

    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isDashed) {
      ctx.setLineDash([5, 5]);
    }

    ctx.beginPath();

    switch (shape.type) {
      case 'line':
        if (shape.points.length >= 2) {
          const start = shape.points[0];
          const end = shape.points[1];
          ctx.moveTo(start.x * canvasWidth, start.y * canvasHeight);
          ctx.lineTo(end.x * canvasWidth, end.y * canvasHeight);
        }
        break;

      case 'rectangle':
        if (shape.points.length >= 2) {
          const start = shape.points[0];
          const end = shape.points[1];
          const x = Math.min(start.x, end.x) * canvasWidth;
          const y = Math.min(start.y, end.y) * canvasHeight;
          const width = Math.abs(end.x - start.x) * canvasWidth;
          const height = Math.abs(end.y - start.y) * canvasHeight;
          ctx.rect(x, y, width, height);
        }
        break;

      case 'circle':
        if (shape.points.length >= 2) {
          const center = shape.points[0];
          const edge = shape.points[1];
          const dx = (edge.x - center.x) * canvasWidth;
          const dy = (edge.y - center.y) * canvasHeight;
          const radius = Math.sqrt(dx * dx + dy * dy);
          ctx.arc(center.x * canvasWidth, center.y * canvasHeight, radius, 0, Math.PI * 2);
        }
        break;

      case 'arrow':
        // Arrow with line and arrowhead
        if (shape.points.length >= 2) {
          const start = shape.points[0];
          const end = shape.points[1];
          const startX = start.x * canvasWidth;
          const startY = start.y * canvasHeight;
          const endX = end.x * canvasWidth;
          const endY = end.y * canvasHeight;

          // Draw the line
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);

          // Calculate arrowhead
          const headLength = Math.max(15, shape.lineWidth * 4); // Arrow head size proportional to line width
          const angle = Math.atan2(endY - startY, endX - startX);

          // Draw arrowhead (two lines forming a V)
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle - Math.PI / 6),
            endY - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle + Math.PI / 6),
            endY - headLength * Math.sin(angle + Math.PI / 6)
          );
        }
        break;

      case 'axesL':
        // L-shaped axes with origin at bottom-left
        if (shape.points.length >= 2) {
          const origin = shape.points[0];
          const extent = shape.points[1];
          const originX = origin.x * canvasWidth;
          const originY = origin.y * canvasHeight;
          const extentX = extent.x * canvasWidth;
          const extentY = extent.y * canvasHeight;

          // Horizontal axis (to the right)
          ctx.moveTo(originX, originY);
          ctx.lineTo(extentX, originY);

          // Vertical axis (upward)
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX, extentY);
        }
        break;

      case 'axesCross':
        // Cross-shaped axes with origin at center
        if (shape.points.length >= 2) {
          const center = shape.points[0];
          const extent = shape.points[1];
          const centerX = center.x * canvasWidth;
          const centerY = center.y * canvasHeight;
          const extentX = extent.x * canvasWidth;
          const extentY = extent.y * canvasHeight;

          // Calculate the distance from center to extent
          const dx = Math.abs(extentX - centerX);
          const dy = Math.abs(extentY - centerY);

          // Horizontal axis (left and right from center)
          ctx.moveTo(centerX - dx, centerY);
          ctx.lineTo(centerX + dx, centerY);

          // Vertical axis (up and down from center)
          ctx.moveTo(centerX, centerY - dy);
          ctx.lineTo(centerX, centerY + dy);
        }
        break;
    }

    ctx.stroke();

    if (isDashed) {
      ctx.setLineDash([]);
    }
  };

  const getNormalizedPoint = (clientX: number, clientY: number, pressure: number): StrokePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
      pressure,
    };
  };

  const drawPoint = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isDrawingRef.current) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      isDrawingRef.current = true;
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isLocked) return; // Prevent drawing when locked

    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pressure = e.pressure || 0.5;
    const point = getNormalizedPoint(e.clientX, e.clientY, pressure);

    // Handle shape tools
    if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arrow' || currentTool === 'axesL' || currentTool === 'axesCross') {
      const shapeId = `${studentId}-shape-${Date.now()}`;
      const newShape: Shape = {
        shapeId,
        studentId,
        type: currentTool,
        points: [point],
        color: currentColor,
        lineWidth: currentThickness,
        isComplete: false,
      };
      setShapeInProgress(newShape);
      return;
    }

    // Use destination-out composite mode for eraser to actually erase pixels
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokeId = `${studentId}-${Date.now()}`;

    // Store stroke for undo/redo
    const newStroke: StoredStroke = {
      strokeId,
      batches: [],
      color: currentColor,
      lineWidth: currentThickness,
    };
    strokesRef.current.set(strokeId, newStroke);
    setStrokeHistory(prev => [...prev, strokeId]);
    setUndoneStrokes([]); // Clear redo stack when new stroke is made

    batcherRef.current = new StrokeBatcher(strokeId, (batch) => {
      // Add color and lineWidth to the batch
      const batchWithStyle: StrokeBatch = {
        studentId: studentId,
        strokeId: batch.strokeId || strokeId,
        points: batch.points || [],
        isComplete: batch.isComplete || false,
        color: currentColor,
        lineWidth: currentThickness,
      };

      // Store batch locally
      const stroke = strokesRef.current.get(strokeId);
      if (stroke) {
        stroke.batches.push(batchWithStyle);
      }

      // Send to server
      connection.invoke('SendStrokeBatch', batchWithStyle).catch(err => {
        console.error('Failed to send stroke batch:', err);
      });
    });

    batcherRef.current.addPoint(point);
    drawPoint(e.clientX - canvas.getBoundingClientRect().left,
             e.clientY - canvas.getBoundingClientRect().top);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();

    // Update cursor position for eraser preview
    const rect = canvas.getBoundingClientRect();
    setCursorPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    const pressure = e.pressure || 0.5;
    const point = getNormalizedPoint(e.clientX, e.clientY, pressure);

    // Handle shape preview
    if (shapeInProgress) {
      const updatedShape = {
        ...shapeInProgress,
        points: [shapeInProgress.points[0], point],
      };
      setShapeInProgress(updatedShape);

      // Redraw canvas with preview
      const ctx = canvas.getContext('2d');
      if (ctx) {
        redrawCanvas();
        renderShape(ctx, updatedShape, canvas.width, canvas.height, true);
      }
      return;
    }

    if (!batcherRef.current) return;

    batcherRef.current.addPoint(point);
    drawPoint(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    canvas.releasePointerCapture(e.pointerId);

    // Handle shape completion
    if (shapeInProgress) {
      const pressure = e.pressure || 0.5;
      const point = getNormalizedPoint(e.clientX, e.clientY, pressure);

      const completedShape: Shape = {
        ...shapeInProgress,
        points: [shapeInProgress.points[0], point],
        isComplete: true,
      };

      // Store in shapes
      shapesRef.current.set(completedShape.shapeId, completedShape);

      // Add to history for undo/redo
      setStrokeHistory(prev => [...prev, completedShape.shapeId]);
      setUndoneStrokes([]); // Clear redo stack

      // Send to server
      connection.invoke('SendShape', completedShape).catch(err => {
        console.error('Failed to send shape:', err);
      });

      setShapeInProgress(null);

      // Redraw canvas and manually render the new shape (since state hasn't updated yet)
      redrawCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        renderShape(ctx, completedShape, canvas.width, canvas.height, false);
      }

      return;
    }

    if (batcherRef.current) {
      batcherRef.current.flush(true);
      batcherRef.current = null;
    }

    isDrawingRef.current = false;
  };

  // Toolbar event handlers
  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    if (currentTool === 'eraser') {
      setCurrentTool('pen');
    }
  };

  const handleThicknessChange = (thickness: number) => {
    setCurrentThickness(thickness);
  };

  const handleToolChange = (tool: ToolType) => {
    setCurrentTool(tool);
  };

  const handleConfidenceChange = (level: 'none' | 'red' | 'amber' | 'green') => {
    setConfidenceLevel(level);
    connection.invoke('SetConfidence', level).catch(err => {
      console.error('Failed to set confidence:', err);
    });
  };

  const handleUndo = () => {
    if (strokeHistory.length === 0) return;

    const lastStrokeId = strokeHistory[strokeHistory.length - 1];
    const newHistory = strokeHistory.slice(0, -1);

    setStrokeHistory(newHistory);
    setUndoneStrokes(prev => [...prev, lastStrokeId]);

    // Redraw with the new history immediately
    redrawCanvas(newHistory);

    // Notify server so teacher view updates
    connection.invoke('UndoStroke', lastStrokeId).catch(err => {
      console.error('Failed to send undo:', err);
    });
  };

  const handleRedo = () => {
    if (undoneStrokes.length === 0) return;

    const strokeToRedo = undoneStrokes[undoneStrokes.length - 1];
    const newHistory = [...strokeHistory, strokeToRedo];

    setUndoneStrokes(prev => prev.slice(0, -1));
    setStrokeHistory(newHistory);

    // Redraw with the new history immediately
    redrawCanvas(newHistory);
  };

  const handleClear = () => {
    strokesRef.current.clear();
    shapesRef.current.clear();
    setStrokeHistory([]);
    setUndoneStrokes([]);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Notify server so teacher view updates
    connection.invoke('ClearBoard').catch(err => {
      console.error('Failed to send clear:', err);
    });
  };

  const handleMouseEnter = () => {
    // Cursor will be shown when mouse enters
  };

  const handleMouseLeave = () => {
    setCursorPosition(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokeHistory, undoneStrokes]);

  return (
    <div className="drawing-container">
      <Toolbar
        displayName={displayName}
        currentColor={currentColor}
        currentThickness={currentThickness}
        currentTool={currentTool}
        currentConfidence={confidenceLevel}
        currentBackground={currentBackground}
        onColorChange={handleColorChange}
        onThicknessChange={handleThicknessChange}
        onToolChange={handleToolChange}
        onConfidenceChange={handleConfidenceChange}
        onBackgroundChange={setCurrentBackground}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onToolbarResized={handleCanvasResize.current}
        canUndo={strokeHistory.length > 0}
        canRedo={undoneStrokes.length > 0}
      />
      <div className="canvas-wrapper">
        <canvas
          ref={backgroundCanvasRef}
          className="background-canvas"
        />
        <canvas
          ref={canvasRef}
          className={`drawing-canvas ${currentTool === 'eraser' ? 'erasing' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
        {currentTool === 'eraser' && cursorPosition && (
          <div
            className="eraser-cursor"
            style={{
              left: `${cursorPosition.x}px`,
              top: `${cursorPosition.y}px`,
              width: `${currentThickness * 2}px`,
              height: `${currentThickness * 2}px`,
            }}
          />
        )}
        {isLocked && (
          <div className="locked-overlay">
            <div className="locked-message">
              <span className="lock-icon">🔒</span>
              <span className="lock-text">Locked by Teacher - Pens down</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DrawingPage;
