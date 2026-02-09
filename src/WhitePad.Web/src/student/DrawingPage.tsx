import { useRef, useEffect, useState, useCallback } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { StrokeBatcher } from '../shared/utils/strokeBatching';
import { StrokePoint, StrokeBatch, Shape, QuestionChanged } from '../shared/types/messages';
import { renderShape } from '../shared/utils/shapeRenderer';
import { debugLog } from '../shared/utils/debugLog';
import { HubEvents, HubMethods } from '../shared/constants/hubContract';
import Toolbar, { ToolType, BackgroundType } from './Toolbar';
import { useStrokeHistory } from './hooks/useStrokeHistory';
import { useWaitingRoomState } from './hooks/useWaitingRoomState';
import { useLatest } from '../shared/hooks/useLatest';

interface DrawingPageProps {
  roomId: string;
  studentId: string;
  displayName: string;
  connection: HubConnection;
  initialIsLocked?: boolean;
  initialWaitingRoomEnabled?: boolean;
  initialWaitingRoomUnlocked?: boolean;
  initialQuestion?: string | null;
}

interface StoredStroke {
  strokeId: string;
  batches: StrokeBatch[];
  color: string;
  lineWidth: number;
}

function DrawingPage({
  studentId,
  displayName,
  connection,
  roomId: _roomId,
  initialIsLocked = false,
  initialWaitingRoomEnabled = false,
  initialWaitingRoomUnlocked = false,
  initialQuestion = null,
}: DrawingPageProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const batcherRef = useRef<StrokeBatcher | null>(null);
  const currentStrokeIdRef = useRef<string | null>(null);
  const isDrawingRef = useRef(false);
  const pointerDownInProgressRef = useRef(false); // Prevent re-entrancy
  const activePointerIdRef = useRef<number | null>(null);

  // Drawing state
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentThickness, setCurrentThickness] = useState(2);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentBackground, setCurrentBackground] = useState<BackgroundType>('none');
  const [confidenceLevel, setConfidenceLevel] = useState<'none' | 'red' | 'amber' | 'green'>('none');
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(initialQuestion);

  const {
    isLocked,
    isInWaitingRoomFlow,
    waitingRoomUnlocked,
    joinFromWaitingRoom,
  } = useWaitingRoomState({
    connection,
    studentId,
    initialIsLocked,
    initialWaitingRoomEnabled,
    initialWaitingRoomUnlocked,
  });

  const isWaitingRoomLocked = isLocked && isInWaitingRoomFlow;
  const isClassroomLocked = isLocked && !isInWaitingRoomFlow;

  // Undo/redo state
  const strokesRef = useRef<Map<string, StoredStroke>>(new Map());
  const {
    strokeHistory,
    setStrokeHistory,
    strokeHistoryRef,
    undoneStrokes,
    setUndoneStrokes,
  } = useStrokeHistory();
  const currentBackgroundRef = useLatest<BackgroundType>(currentBackground);

  // Cursor state for eraser
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // Shape state
  const shapesRef = useRef<Map<string, Shape>>(new Map());
  const [shapeInProgress, setShapeInProgress] = useState<Shape | null>(null);

  // Create refs for pointer handler dependencies to stabilize them
  const currentColorRef = useLatest(currentColor);
  const currentThicknessRef = useLatest(currentThickness);
  const currentToolRef = useLatest(currentTool);
  const isLockedRef = useLatest(isLocked);
  const studentIdRef = useLatest(studentId);
  const connectionRef = useLatest(connection);

  // Redraw background canvas when background changes
  useEffect(() => {
    renderBackgroundCanvas();
  }, [currentBackground]);

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

    connection.on(HubEvents.BoardCleared, handleBoardCleared);

    return () => {
      connection.off(HubEvents.BoardCleared, handleBoardCleared);
    };
  }, [connection, studentId]);

  // Listen for teacher question updates
  useEffect(() => {
    const handleQuestionChanged = (message: QuestionChanged) => {
      setCurrentQuestion(message.question ?? null);
    };

    connection.on(HubEvents.QuestionChanged, handleQuestionChanged);
    return () => {
      connection.off(HubEvents.QuestionChanged, handleQuestionChanged);
    };
  }, [connection]);

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
        debugLog('DrawingPage', 'Resize redraw skipped missing stroke', strokeId);
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
        renderShape(ctx, shape, canvas.width, canvas.height);
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

  const isAllowedInputPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') return true;
    if (e.pointerType === 'touch') return e.isPrimary;
    if (e.pointerType === 'mouse') return e.button === 0;
    return false;
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

    if (!isAllowedInputPointer(e)) {
      pointerDownInProgressRef.current = false;
      return;
    }

    // Palm/multi-touch rejection: keep a single active pointer.
    if (activePointerIdRef.current !== null) {
      e.preventDefault();
      pointerDownInProgressRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      pointerDownInProgressRef.current = false;
      return;
    }

    activePointerIdRef.current = e.pointerId;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      activePointerIdRef.current = null;
      pointerDownInProgressRef.current = false;
      return;
    }

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
      conn.invoke(HubMethods.SendStrokeBatch, batchWithStyle).catch(err => {
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

    if (activePointerIdRef.current === null || e.pointerId !== activePointerIdRef.current) {
      return;
    }

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
        renderShape(ctx, updatedShape, canvas.width, canvas.height, { isDashed: true });
      }
      return;
    }

    if (!batcherRef.current) return;

    batcherRef.current.addPoint(point);
    drawPoint(e.clientX - rect.left, e.clientY - rect.top);
  }, [shapeInProgress, redrawCanvas]); // shapeInProgress and redrawCanvas as deps

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (activePointerIdRef.current === null || e.pointerId !== activePointerIdRef.current) {
      return;
    }

    e.preventDefault();
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

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
      connectionRef.current.invoke(HubMethods.SendShape, completedShape).catch(err => {
        console.error('Failed to send shape:', err);
      });

      setShapeInProgress(null);

      // Redraw canvas and manually render the new shape (since state hasn't updated yet)
      redrawCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        renderShape(ctx, completedShape, canvas.width, canvas.height);
      }

      activePointerIdRef.current = null;
      pointerDownInProgressRef.current = false;
      isDrawingRef.current = false;
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

    activePointerIdRef.current = null;
    pointerDownInProgressRef.current = false;
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
    if (isLockedRef.current) return;

    setConfidenceLevel(level);
    connection.invoke(HubMethods.SetConfidence, level).catch(err => {
      console.error('Failed to set confidence:', err);
    });
  }, [connection]);

  const handleUndo = useCallback(() => {
    if (isLockedRef.current) return;
    if (strokeHistory.length === 0) return;

    const lastStrokeId = strokeHistory[strokeHistory.length - 1];
    const newHistory = strokeHistory.slice(0, -1);

    setStrokeHistory(newHistory);
    setUndoneStrokes(prev => [...prev, lastStrokeId]);

    // Redraw with the new history immediately
    redrawCanvas(newHistory);

    // Notify server so teacher view updates
    connection.invoke(HubMethods.UndoStroke, lastStrokeId).catch(err => {
      console.error('Failed to send undo:', err);
    });
  }, [strokeHistory, connection]);

  const handleRedo = useCallback(() => {
    if (isLockedRef.current) return;
    if (undoneStrokes.length === 0) return;

    const strokeToRedo = undoneStrokes[undoneStrokes.length - 1];
    const newHistory = [...strokeHistory, strokeToRedo];

    setUndoneStrokes(prev => prev.slice(0, -1));
    setStrokeHistory(newHistory);

    // Redraw with the new history immediately
    redrawCanvas(newHistory);
  }, [undoneStrokes, strokeHistory]);

  const handleClear = useCallback(() => {
    if (isLockedRef.current) return;

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
    connection.invoke(HubMethods.ClearBoard).catch(err => {
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
      if (isLockedRef.current) return;

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
    debugLog('DrawingPage', 'isLocked changed', isLocked);
  }, [isLocked]);

  // Handle join room button click
  const handleJoinRoom = async () => {
    try {
      await joinFromWaitingRoom();
      debugLog('DrawingPage', 'Joined from waiting room');
    } catch (err) {
      console.error('[DRAWING PAGE] Failed to join from waiting room:', err);
    }
  };

  // Show waiting room screen when locked
  if (isWaitingRoomLocked) {
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
    <div className={`drawing-container ${isClassroomLocked ? 'drawing-locked' : ''}`}>
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
        {currentQuestion && currentQuestion.trim().length > 0 && (
          <div className="question-banner">
            {currentQuestion}
          </div>
        )}
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
        {isClassroomLocked && (
          <div className="locked-overlay">
            <div className="locked-message">
              <span className="lock-icon">🔒</span>
              <span className="lock-text">Drawing is locked by your teacher</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DrawingPage;
