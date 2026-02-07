import { useRef, useEffect, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { StrokeBatcher } from '../shared/utils/strokeBatching';
import { StrokePoint, StrokeBatch } from '../shared/types/messages';
import Toolbar from './Toolbar';

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

function DrawingPage({ roomId, studentId, displayName, connection }: DrawingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const batcherRef = useRef<StrokeBatcher | null>(null);
  const isDrawingRef = useRef(false);

  // Drawing state
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentThickness, setCurrentThickness] = useState(2);
  const [isErasing, setIsErasing] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState<'none' | 'red' | 'amber' | 'green'>('none');

  // Undo/redo state
  const strokesRef = useRef<Map<string, StoredStroke>>(new Map());
  const [strokeHistory, setStrokeHistory] = useState<string[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<string[]>([]);

  // Cursor state for eraser
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to window size
    const resizeCanvas = () => {
      const toolbarHeight = 70; // Approximate toolbar height
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - toolbarHeight;

      // Redraw all strokes after resize
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes in history order
    strokeHistory.forEach(strokeId => {
      const stroke = strokesRef.current.get(strokeId);
      if (!stroke) return;

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
    });
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use white color for eraser, current color for pen
    const drawColor = isErasing ? '#FFFFFF' : currentColor;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = currentThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokeId = `${studentId}-${Date.now()}`;

    // Store stroke for undo/redo
    const newStroke: StoredStroke = {
      strokeId,
      batches: [],
      color: drawColor,
      lineWidth: currentThickness,
    };
    strokesRef.current.set(strokeId, newStroke);
    setStrokeHistory(prev => [...prev, strokeId]);
    setUndoneStrokes([]); // Clear redo stack when new stroke is made

    batcherRef.current = new StrokeBatcher(strokeId, (batch) => {
      // Add color and lineWidth to the batch
      const batchWithStyle: StrokeBatch = {
        ...batch,
        color: drawColor,
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

    const pressure = e.pressure || 0.5;
    const point = getNormalizedPoint(e.clientX, e.clientY, pressure);

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

    if (!batcherRef.current) return;

    const pressure = e.pressure || 0.5;
    const point = getNormalizedPoint(e.clientX, e.clientY, pressure);

    batcherRef.current.addPoint(point);
    drawPoint(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    canvas.releasePointerCapture(e.pointerId);

    if (batcherRef.current) {
      batcherRef.current.flush(true);
      batcherRef.current = null;
    }

    isDrawingRef.current = false;
  };

  // Toolbar event handlers
  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    if (isErasing) {
      setIsErasing(false);
    }
  };

  const handleThicknessChange = (thickness: number) => {
    setCurrentThickness(thickness);
  };

  const handleToggleEraser = () => {
    setIsErasing(!isErasing);
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
    setStrokeHistory(prev => prev.slice(0, -1));
    setUndoneStrokes(prev => [...prev, lastStrokeId]);

    redrawCanvas();

    // Notify server so teacher view updates
    connection.invoke('UndoStroke', lastStrokeId).catch(err => {
      console.error('Failed to send undo:', err);
    });
  };

  const handleRedo = () => {
    if (undoneStrokes.length === 0) return;

    const strokeToRedo = undoneStrokes[undoneStrokes.length - 1];
    setUndoneStrokes(prev => prev.slice(0, -1));
    setStrokeHistory(prev => [...prev, strokeToRedo]);

    redrawCanvas();
  };

  const handleClear = () => {
    strokesRef.current.clear();
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
        currentColor={currentColor}
        currentThickness={currentThickness}
        isErasing={isErasing}
        currentConfidence={confidenceLevel}
        onColorChange={handleColorChange}
        onThicknessChange={handleThicknessChange}
        onToggleEraser={handleToggleEraser}
        onConfidenceChange={handleConfidenceChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={strokeHistory.length > 0}
        canRedo={undoneStrokes.length > 0}
      />
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className={`drawing-canvas ${isErasing ? 'erasing' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
        {isErasing && cursorPosition && (
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
