import { useRef, useEffect, useState, useCallback } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { StrokeBatcher } from '../shared/utils/strokeBatching';
import { StrokePoint, StrokeBatch, StudentLocked, Shape, WaitingRoomStateChanged } from '../shared/types/messages';
import Toolbar, { ToolType, BackgroundType } from './Toolbar';

interface DrawingPageProps {
  roomId: string;
  studentId: string;
  displayName: string;
  connection: HubConnection;
  initialIsLocked?: boolean;
  initialWaitingRoomUnlocked?: boolean;
}

interface StoredStroke {
  strokeId: string;
  batches: StrokeBatch[];
  color: string;
  lineWidth: number;
}

function DrawingPage({ studentId, displayName, connection, roomId, initialIsLocked = false, initialWaitingRoomUnlocked = false }: DrawingPageProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const batcherRef = useRef<StrokeBatcher | null>(null);
  const currentStrokeIdRef = useRef<string | null>(null);
  const isDrawingRef = useRef(false);
  const pointerDownInProgressRef = useRef(false); // Prevent re-entrancy

  // Drawing state
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentThickness, setCurrentThickness] = useState(2);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentBackground, setCurrentBackground] = useState<BackgroundType>('none');
  const [confidenceLevel, setConfidenceLevel] = useState<'none' | 'red' | 'amber' | 'green'>('none');
  const [isLocked, setIsLocked] = useState(initialIsLocked);
  const [waitingRoomUnlocked, setWaitingRoomUnlocked] = useState(initialWaitingRoomUnlocked);

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

  // Create refs for pointer handler dependencies to stabilize them
  const currentColorRef = useRef(currentColor);
  const currentThicknessRef = useRef(currentThickness);
  const currentToolRef = useRef(currentTool);
  const isLockedRef = useRef(isLocked);
  const studentIdRef = useRef(studentId);
  const connectionRef = useRef(connection);

  // Keep refs in sync with state
  useEffect(() => {
    strokeHistoryRef.current = strokeHistory;
  }, [strokeHistory]);

  useEffect(() => {
    currentBackgroundRef.current = currentBackground;
  }, [currentBackground]);

  useEffect(() => {
    currentColorRef.current = currentColor;
  }, [currentColor]);

  useEffect(() => {
    currentThicknessRef.current = currentThickness;
  }, [currentThickness]);

  useEffect(() => {
    currentToolRef.current = currentTool;
  }, [currentTool]);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    studentIdRef.current = studentId;
  }, [studentId]);

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  // Redraw background canvas when background changes
  useEffect(() => {
    renderBackgroundCanvas();
  }, [currentBackground]);

  // Listen for lock state changes
  useEffect(() => {
    const handleStudentLocked = (message: StudentLocked) => {
      console.log('[DRAWING PAGE] StudentLocked message received:', message);
      if (message.studentId === studentId) {
        console.log('[DRAWING PAGE] Lock state changing from', isLocked, 'to', message.isLocked);
        setIsLocked(message.isLocked);
      } else {
        console.log('[DRAWING PAGE] StudentLocked message for different student, ignoring');
      }
    };

    console.log('[DRAWING PAGE] Setting up StudentLocked listener for student:', studentId);
    connection.on('studentLocked', handleStudentLocked);

    return () => {
      console.log('[DRAWING PAGE] Cleaning up StudentLocked listener');
      connection.off('studentLocked', handleStudentLocked);
    };
  }, [connection, studentId]);

  // Listen for waiting room state changes
  useEffect(() => {
    const handleWaitingRoomStateChanged = (message: WaitingRoomStateChanged) => {
      console.log('[DRAWING PAGE] WaitingRoomStateChanged message received:', message);
      setWaitingRoomUnlocked(message.waitingRoomUnlocked);

      // If waiting room is disabled entirely, unlock the student
      if (!message.waitingRoomEnabled) {
        setIsLocked(false);
      }
    };

    console.log('[DRAWING PAGE] Setting up WaitingRoomStateChanged listener');
    connection.on('waitingRoomStateChanged', handleWaitingRoomStateChanged);

    return () => {
      console.log('[DRAWING PAGE] Cleaning up WaitingRoomStateChanged listener');
      connection.off('waitingRoomStateChanged', handleWaitingRoomStateChanged);
    };
  }, [connection]);

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

    connection.on('boardCleared', handleBoardCleared);

    return () => {
      connection.off('boardCleared', handleBoardCleared);
    };
  }, [connection, studentId]);

  // Manual resize handler that can be called when needed
  const handleCanvasResize = useRef(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip if currently drawing
    if (isDrawingRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const currentHistory = strokeHistoryRef.current;

    // Only resize if dimensions actually changed
    if (canvas.width === rect.width && canvas.height === rect.height) {
      return;
    }
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

  // Initialize canvas when transitioning from waiting room to drawing mode
  useEffect(() => {
    if (!isLocked && canvasRef.current) {
      // Small delay to ensure canvas is rendered in DOM
      setTimeout(() => {
        handleCanvasResize.current();
      }, 50);
    }
  }, [isLocked]);

  const redrawCanvas = useCallback((strokeIds?: string[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use provided strokeIds or current strokeHistory from ref
    const idsToRender = strokeIds !== undefined ? strokeIds : strokeHistoryRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes and shapes in history order
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

        if (allPoints.length === 0) return;

        ctx.beginPath();
        const firstPoint = allPoints[0];
        ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);

        for (let i = 1; i < allPoints.length; i++) {
          const point = allPoints[i];
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        }

        ctx.stroke();
        return;
      }

      // Try to find as shape
      const shape = shapesRef.current.get(id);
      if (shape) {
        renderShape(ctx, shape, canvas.width, canvas.height, false);
        return;
      }
    });
  }, []); // No dependencies - uses refs for all data

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

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Prevent re-entrancy - if we're already processing a pointer down, ignore this one
    if (pointerDownInProgressRef.current) {
      return;
    }

    pointerDownInProgressRef.current = true;

    if (isLockedRef.current) {
      pointerDownInProgressRef.current = false;
      return; // Prevent drawing when locked
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      pointerDownInProgressRef.current = false;
      return;
    }

    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pressure = e.pressure || 0.5;
    const point = getNormalizedPoint(e.clientX, e.clientY, pressure);

    const tool = currentToolRef.current;
    const color = currentColorRef.current;
    const thickness = currentThicknessRef.current;
    const sid = studentIdRef.current;
    const conn = connectionRef.current;

    // Handle shape tools
    if (tool === 'line' || tool === 'rectangle' || tool === 'circle' || tool === 'arrow' || tool === 'axesL' || tool === 'axesCross') {
      const shapeId = `${sid}-shape-${Date.now()}`;
      const newShape: Shape = {
        shapeId,
        studentId: sid,
        type: tool,
        points: [point],
        color: color,
        lineWidth: thickness,
        isComplete: false,
      };
      setShapeInProgress(newShape);
      pointerDownInProgressRef.current = false;
      return;
    }

    // Use destination-out composite mode for eraser to actually erase pixels
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokeId = `${sid}-${Date.now()}`;
    currentStrokeIdRef.current = strokeId; // Store for later use in pointerUp

    // Store stroke for undo/redo
    const newStroke: StoredStroke = {
      strokeId,
      batches: [],
      color: color,
      lineWidth: thickness,
    };
    strokesRef.current.set(strokeId, newStroke);

    // DON'T update state during pointer down - defer to pointer up
    // This prevents re-renders during active pointer interaction
    // setStrokeHistory(prev => [...prev, strokeId]);
    // setUndoneStrokes([]); // Clear redo stack when new stroke is made

    batcherRef.current = new StrokeBatcher(strokeId, (batch) => {
      // Add color and lineWidth to the batch
      const batchWithStyle: StrokeBatch = {
        studentId: sid,
        strokeId: batch.strokeId || strokeId,
        points: batch.points || [],
        isComplete: batch.isComplete || false,
        color: color,
        lineWidth: thickness,
      };

      // Store batch locally
      const stroke = strokesRef.current.get(strokeId);
      if (stroke) {
        stroke.batches.push(batchWithStyle);
      }

      // Send to server
      conn.invoke('SendStrokeBatch', batchWithStyle).catch(err => {
        console.error('Failed to send stroke batch:', err);
      });
    });

    batcherRef.current.addPoint(point);
    drawPoint(e.clientX - canvas.getBoundingClientRect().left,
             e.clientY - canvas.getBoundingClientRect().top);

    pointerDownInProgressRef.current = false;
  }, []); // Empty deps - uses refs for all values

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isLockedRef.current) return; // Prevent interaction when locked

    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();

    const rect = canvas.getBoundingClientRect();

    // Update cursor position for eraser preview ONLY when using eraser
    if (currentToolRef.current === 'eraser') {
      setCursorPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

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
  }, [shapeInProgress, redrawCanvas]); // shapeInProgress and redrawCanvas as deps

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isLockedRef.current) return; // Prevent interaction when locked

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
      connectionRef.current.invoke('SendShape', completedShape).catch(err => {
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

    // Update state AFTER pointer up to avoid re-renders during active pointer interaction
    if (currentStrokeIdRef.current) {
      const completedStrokeId = currentStrokeIdRef.current; // Capture value before clearing
      currentStrokeIdRef.current = null; // Clear immediately to prevent double-add
      setStrokeHistory(prev => [...prev, completedStrokeId]);
      setUndoneStrokes([]); // Clear redo stack
    }

    isDrawingRef.current = false;
  }, [shapeInProgress, redrawCanvas]); // shapeInProgress and redrawCanvas as deps

  // Toolbar event handlers
  const handleColorChange = useCallback((color: string) => {
    setCurrentColor(color);
    setCurrentTool(prev => prev === 'eraser' ? 'pen' : prev);
  }, []);

  const handleThicknessChange = useCallback((thickness: number) => {
    setCurrentThickness(thickness);
  }, []);

  const handleToolChange = useCallback((tool: ToolType) => {
    setCurrentTool(tool);
  }, []);

  const handleConfidenceChange = useCallback((level: 'none' | 'red' | 'amber' | 'green') => {
    setConfidenceLevel(level);
    connection.invoke('SetConfidence', level).catch(err => {
      console.error('Failed to set confidence:', err);
    });
  }, [connection]);

  const handleUndo = useCallback(() => {
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
  }, [strokeHistory, connection]);

  const handleRedo = useCallback(() => {
    if (undoneStrokes.length === 0) return;

    const strokeToRedo = undoneStrokes[undoneStrokes.length - 1];
    const newHistory = [...strokeHistory, strokeToRedo];

    setUndoneStrokes(prev => prev.slice(0, -1));
    setStrokeHistory(newHistory);

    // Redraw with the new history immediately
    redrawCanvas(newHistory);
  }, [undoneStrokes, strokeHistory]);

  const handleClear = useCallback(() => {
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
  }, [connection]);

  const handleMouseEnter = useCallback(() => {
    // Cursor will be shown when mouse enters
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursorPosition(null);
  }, []);

  // Stable callback for toolbar resize that calls the ref function
  const handleToolbarResize = useCallback(() => {
    handleCanvasResize.current();
  }, []);

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
  }, [handleUndo, handleRedo]);

  // Track isLocked changes
  useEffect(() => {
    console.log('[DRAWING PAGE] isLocked state changed to:', isLocked);
  }, [isLocked]);

  // Handle join room button click
  const handleJoinRoom = async () => {
    try {
      await connection.invoke('JoinFromWaitingRoom');
      console.log('[DRAWING PAGE] Joined from waiting room');
    } catch (err) {
      console.error('[DRAWING PAGE] Failed to join from waiting room:', err);
    }
  };

  // Show waiting room screen when locked
  if (isLocked) {
    if (waitingRoomUnlocked) {
      // Teacher has unlocked the waiting room - show "Join Room" button
      return (
        <div className="waiting-room-screen">
          <div className="waiting-room-content">
            <div className="waiting-room-icon">✅</div>
            <h1 className="waiting-room-title">Ready to Join!</h1>
            <p className="waiting-room-message">
              Teacher has started! Click to join
            </p>
            <p className="waiting-room-name">Joined as: <strong>{displayName}</strong></p>
            <button
              type="button"
              className="join-room-button"
              onClick={handleJoinRoom}
            >
              Join Room
            </button>
          </div>
        </div>
      );
    } else {
      // Waiting for teacher to unlock
      return (
        <div className="waiting-room-screen">
          <div className="waiting-room-content">
            <div className="waiting-room-icon">🔒</div>
            <h1 className="waiting-room-title">Waiting Room</h1>
            <p className="waiting-room-message">
              Waiting for teacher to start activity
            </p>
            <p className="waiting-room-name">Joined as: <strong>{displayName}</strong></p>
          </div>
        </div>
      );
    }
  }

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
        onToolbarResized={handleToolbarResize}
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
      </div>
    </div>
  );
}

export default DrawingPage;
