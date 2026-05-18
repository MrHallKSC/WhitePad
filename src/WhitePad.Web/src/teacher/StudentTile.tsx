import { useRef, useEffect, useState, useCallback } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { Student, StrokeBatch, StrokeUndone, BoardCleared, ShapeDrawn, Shape, BackgroundType, PaperColor } from '../shared/types/messages';
import { renderShape } from '../shared/utils/shapeRenderer';
import { HubEvents, HubMethods } from '../shared/constants/hubContract';

interface StudentTileProps {
  student: Student;
  connection: HubConnection | null;
  roomId: string;
  isFocused?: boolean;
  isFocusActive?: boolean;
  onRequestFocus?: (studentId: string) => void;
  onExitFocus?: () => void;
}

interface ContextMenuPosition {
  x: number;
  y: number;
}

const ERASER_COLOR_SENTINEL = '__WHITEPAD_ERASER__';
const ERASER_STROKE_MARKER = '-eraser-';
const PAPER_COLORS: Record<PaperColor, string> = {
  white: '#FFFFFF',
  buff: '#F4E4BC',
};

function isEraserBatch(batch: StrokeBatch) {
  const runtimeBatch = batch as StrokeBatch & { IsEraser?: boolean; iseraser?: boolean };
  return (
    batch.isEraser === true ||
    runtimeBatch.IsEraser === true ||
    runtimeBatch.iseraser === true ||
    batch.color === ERASER_COLOR_SENTINEL ||
    batch.strokeId.toLowerCase().includes(ERASER_STROKE_MARKER) ||
    batch.lineWidth < 0
  );
}

function StudentTile({
  student,
  connection,
  roomId,
  isFocused = false,
  isFocusActive = false,
  onRequestFocus,
  onExitFocus,
}: StudentTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Map<string, StrokeBatch>>(new Map());
  const shapesRef = useRef<Map<string, Shape>>(new Map());
  const drawOrderRef = useRef<string[]>([]);
  const backgroundTypeRef = useRef<BackgroundType>('none');
  const paperColorRef = useRef<PaperColor>('white');
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const paperColor = PAPER_COLORS[paperColorRef.current];
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, width, height);

    if (backgroundTypeRef.current === 'none') {
      return;
    }

    ctx.save();
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 0.5;

    const spacing = 35;
    switch (backgroundTypeRef.current) {
      case 'dotted':
        ctx.fillStyle = '#d0d0d0';
        for (let x = spacing; x < width; x += spacing) {
          for (let y = spacing; y < height; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      case 'lined':
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;
      case 'squares':
        for (let x = spacing; x < width; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;
    }

    ctx.restore();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lineWidthScale = isFocused ? 1 : 0.4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx, canvas.width, canvas.height);

    // Redraw strokes and shapes in the order the student created them.
    drawOrderRef.current.forEach((id) => {
      const batch = strokesRef.current.get(id);
      if (batch) {
        if (batch.points.length === 0) return;

        const isEraser = isEraserBatch(batch);

        ctx.beginPath();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = isEraser ? PAPER_COLORS[batch.paperColor ?? paperColorRef.current] : batch.color || '#000000';
        ctx.lineWidth = Math.abs(batch.lineWidth || 2) * lineWidthScale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const firstPoint = batch.points[0];
        ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);

        for (let i = 1; i < batch.points.length; i++) {
          const point = batch.points[i];
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        }

        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        return;
      }

      const shape = shapesRef.current.get(id);
      if (shape) {
        renderShape(ctx, shape, canvas.width, canvas.height, { lineWidthScale });
      }
    });
  }, [drawBackground, isFocused]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleRequestFocus = () => {
    if (!onRequestFocus) return;
    onRequestFocus(student.studentId);
    setContextMenu(null);
  };

  const handleExitFocus = () => {
    if (!onExitFocus) return;
    onExitFocus();
    setContextMenu(null);
  };

  const handleLockToggle = async () => {
    if (!connection) return;

    try {
      if (student.isLocked) {
        await connection.invoke(HubMethods.UnlockStudent, roomId, student.studentId);
      } else {
        await connection.invoke(HubMethods.LockStudent, roomId, student.studentId);
      }
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    }
    setContextMenu(null);
  };

  const handleKick = async () => {
    if (!connection) return;

    try {
      await connection.invoke(HubMethods.KickStudent, roomId, student.studentId);
    } catch (err) {
      console.error('Failed to kick student:', err);
    }
    setContextMenu(null);
  };

  const handleClear = async () => {
    if (!connection) return;

    if (!confirm(`Clear ${student.displayName}'s board? This cannot be undone.`)) {
      setContextMenu(null);
      return;
    }

    try {
      await connection.invoke(HubMethods.ClearStudentBoard, roomId, student.studentId);
    } catch (err) {
      console.error('Failed to clear student board:', err);
    }
    setContextMenu(null);
  };

  const handleResizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const availableWidth = Math.max(1, Math.floor(rect.width));
    const availableHeight = Math.max(1, Math.floor(rect.height));
    const aspectRatio = 4 / 3;

    let width = availableWidth;
    let height = Math.floor(width / aspectRatio);
    if (height > availableHeight) {
      height = availableHeight;
      width = Math.floor(height * aspectRatio);
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      redrawCanvas();
    }
  }, [redrawCanvas]);

  // Close context menu when clicking anywhere
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => handleCloseContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    handleResizeCanvas();

    if (typeof ResizeObserver === 'undefined') {
      const handleWindowResize = () => handleResizeCanvas();
      window.addEventListener('resize', handleWindowResize);
      return () => window.removeEventListener('resize', handleWindowResize);
    }

    const observer = new ResizeObserver(() => handleResizeCanvas());
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [handleResizeCanvas, isFocused]);

  useEffect(() => {
    if (!connection) return;

    const handleStrokeBatch = (batch: StrokeBatch) => {
      if (batch.studentId !== student.studentId) return;

      const isEraser = isEraserBatch(batch);
      if (batch.backgroundType) {
        backgroundTypeRef.current = batch.backgroundType;
      }
      if (batch.paperColor) {
        paperColorRef.current = batch.paperColor;
      }

      if (batch.points.length === 0) {
        redrawCanvas();
        return;
      }

      // Store the batch
      const existingBatch = strokesRef.current.get(batch.strokeId);
      if (existingBatch) {
        existingBatch.points.push(...batch.points);
        existingBatch.isComplete = batch.isComplete;
        existingBatch.isEraser = isEraser;
        if (batch.lineWidth < 0) {
          existingBatch.lineWidth = batch.lineWidth;
        }
        if (batch.color === ERASER_COLOR_SENTINEL) {
          existingBatch.color = ERASER_COLOR_SENTINEL;
        }
      } else {
        strokesRef.current.set(batch.strokeId, {
          ...batch,
          points: [...batch.points],
          isEraser,
        });
        drawOrderRef.current.push(batch.strokeId);
      }

      // Redraw entire canvas to ensure consistency
      redrawCanvas();
    };

    const handleStrokeUndone = (message: StrokeUndone) => {
      if (message.studentId !== student.studentId) return;

      // Undo can target either a strokeId or a shapeId from the student's history.
      strokesRef.current.delete(message.strokeId);
      shapesRef.current.delete(message.strokeId);
      drawOrderRef.current = drawOrderRef.current.filter(id => id !== message.strokeId);

      // Redraw entire canvas without that item
      redrawCanvas();
    };

    const handleBoardCleared = (message: BoardCleared) => {
      if (message.studentId !== student.studentId) return;

      // Clear all strokes and shapes for this student
      strokesRef.current.clear();
      shapesRef.current.clear();
      drawOrderRef.current = [];

      redrawCanvas();
    };

    const handleShapeDrawn = (shapeDrawn: ShapeDrawn) => {
      if (shapeDrawn.studentId !== student.studentId) return;

      // Store the shape
      const shape: Shape = {
        shapeId: shapeDrawn.shapeId,
        studentId: shapeDrawn.studentId,
        type: shapeDrawn.type,
        points: [...shapeDrawn.points],
        color: shapeDrawn.color,
        lineWidth: shapeDrawn.lineWidth,
        isComplete: shapeDrawn.isComplete,
        backgroundType: shapeDrawn.backgroundType,
        paperColor: shapeDrawn.paperColor,
      };
      if (shape.backgroundType) {
        backgroundTypeRef.current = shape.backgroundType;
      }
      if (shape.paperColor) {
        paperColorRef.current = shape.paperColor;
      }
      shapesRef.current.set(shape.shapeId, shape);
      drawOrderRef.current.push(shape.shapeId);

      // Redraw entire canvas to include the new shape
      redrawCanvas();
    };

    connection.on(HubEvents.ReceiveStrokeBatch, handleStrokeBatch);
    connection.on(HubEvents.StrokeUndone, handleStrokeUndone);
    connection.on(HubEvents.BoardCleared, handleBoardCleared);
    connection.on(HubEvents.ReceiveShape, handleShapeDrawn);

    return () => {
      connection.off(HubEvents.ReceiveStrokeBatch, handleStrokeBatch);
      connection.off(HubEvents.StrokeUndone, handleStrokeUndone);
      connection.off(HubEvents.BoardCleared, handleBoardCleared);
      connection.off(HubEvents.ReceiveShape, handleShapeDrawn);
    };
  }, [connection, student.studentId, redrawCanvas]);

  // Periodic redraw to handle window dragging and other events that might clear the canvas
  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas || strokesRef.current.size === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Check if canvas is empty by sampling strategic pixels across the canvas
      // Sample 25 points in a grid pattern
      let hasContent = false;
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const px = Math.floor((x + 0.5) * canvas.width / 5);
          const py = Math.floor((y + 0.5) * canvas.height / 5);
          const imageData = ctx.getImageData(px, py, 1, 1);
          if (imageData.data[3] > 0) { // Check alpha channel
            hasContent = true;
            break;
          }
        }
        if (hasContent) break;
      }

      // If canvas is empty but we have strokes, redraw
      if (!hasContent && strokesRef.current.size > 0) {
        redrawCanvas();
      }
    }, 50); // Check every 50ms for faster detection

    return () => clearInterval(interval);
  }, [redrawCanvas]);

  return (
    <>
      <div
        className={`student-tile ${student.isLocked ? 'locked' : ''} ${isFocused ? 'focused' : ''} ${isFocusActive && !isFocused ? 'hidden' : ''}`}
        onContextMenu={handleContextMenu}
        onDoubleClick={() => {
          if (!isFocused) handleRequestFocus();
        }}
      >
        {isFocused && (
          <div className="focus-controls">
            <button
              type="button"
              className="button secondary"
              onClick={handleExitFocus}
            >
              Back to Class View
            </button>
            <div className="focus-controls-actions">
              <button
                type="button"
                className="button secondary"
                onClick={handleLockToggle}
              >
                {student.isLocked ? 'Unlock' : 'Lock'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={handleClear}
              >
                Clear Board
              </button>
              <button
                type="button"
                className="button danger"
                onClick={handleKick}
              >
                Kick
              </button>
            </div>
          </div>
        )}
        <div className="student-tile-header">
          {student.isLocked && '🔒 '}{student.displayName}
        </div>
        <div className="student-canvas-wrapper" ref={canvasWrapperRef}>
          <canvas
            ref={canvasRef}
            className="student-canvas"
            width={200}
            height={150}
          />
        </div>
        {student.confidenceLevel && student.confidenceLevel !== 'none' && (
          <div
            className={`confidence-indicator ${student.confidenceLevel}`}
            title={`Confidence: ${student.confidenceLevel}`}
          />
        )}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <button
            type="button"
            className="context-menu-item"
            onClick={isFocused ? handleExitFocus : handleRequestFocus}
          >
            {isFocused ? 'Back to Class View' : 'Focus Student'}
          </button>
          <button
            type="button"
            className="context-menu-item"
            onClick={handleLockToggle}
          >
            {student.isLocked ? 'Unlock' : 'Lock'}
          </button>
          <button
            type="button"
            className="context-menu-item"
            onClick={handleClear}
          >
            Clear Board
          </button>
          <button
            type="button"
            className="context-menu-item kick"
            onClick={handleKick}
          >
            Kick
          </button>
        </div>
      )}
    </>
  );
}

export default StudentTile;
