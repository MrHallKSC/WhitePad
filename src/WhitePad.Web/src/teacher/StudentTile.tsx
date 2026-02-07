import { useRef, useEffect, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { Student, StrokeBatch, StrokeUndone, BoardCleared, ShapeDrawn, Shape } from '../shared/types/messages';

interface StudentTileProps {
  student: Student;
  connection: HubConnection | null;
  roomId: string;
}

interface ContextMenuPosition {
  x: number;
  y: number;
}

function StudentTile({ student, connection, roomId }: StudentTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Map<string, StrokeBatch>>(new Map());
  const shapesRef = useRef<Map<string, Shape>>(new Map());
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);

  const renderShape = (ctx: CanvasRenderingContext2D, shape: Shape, canvasWidth: number, canvasHeight: number) => {
    if (shape.points.length === 0) return;

    ctx.strokeStyle = shape.color;
    ctx.lineWidth = (shape.lineWidth || 2) * 0.4; // Scale down for smaller teacher view
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    strokesRef.current.forEach((batch) => {
      if (batch.points.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = batch.color || '#000000';
      ctx.lineWidth = (batch.lineWidth || 2) * 0.4; // Scale down for smaller teacher view
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const firstPoint = batch.points[0];
      ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);

      for (let i = 1; i < batch.points.length; i++) {
        const point = batch.points[i];
        ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
      }

      ctx.stroke();
    });

    // Redraw all shapes
    shapesRef.current.forEach((shape) => {
      renderShape(ctx, shape, canvas.width, canvas.height);
    });
  };

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

  const handleLockToggle = async () => {
    if (!connection) return;

    try {
      if (student.isLocked) {
        await connection.invoke('UnlockStudent', roomId, student.studentId);
      } else {
        await connection.invoke('LockStudent', roomId, student.studentId);
      }
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    }
    setContextMenu(null);
  };

  const handleKick = async () => {
    if (!connection) return;

    try {
      await connection.invoke('KickStudent', roomId, student.studentId);
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
      await connection.invoke('ClearStudentBoard', roomId, student.studentId);
    } catch (err) {
      console.error('Failed to clear student board:', err);
    }
    setContextMenu(null);
  };

  // Close context menu when clicking anywhere
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => handleCloseContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  useEffect(() => {
    if (!connection) return;

    const handleStrokeBatch = (batch: StrokeBatch) => {
      if (batch.studentId !== student.studentId) return;

      // Store the batch
      const existingBatch = strokesRef.current.get(batch.strokeId);
      if (existingBatch) {
        existingBatch.points.push(...batch.points);
        existingBatch.isComplete = batch.isComplete;
      } else {
        strokesRef.current.set(batch.strokeId, { ...batch, points: [...batch.points] });
      }

      // Redraw entire canvas to ensure consistency
      redrawCanvas();
    };

    const handleStrokeUndone = (message: StrokeUndone) => {
      if (message.studentId !== student.studentId) return;

      // Remove the stroke from storage
      strokesRef.current.delete(message.strokeId);

      // Redraw entire canvas without that stroke
      redrawCanvas();
    };

    const handleBoardCleared = (message: BoardCleared) => {
      if (message.studentId !== student.studentId) return;

      // Clear all strokes and shapes for this student
      strokesRef.current.clear();
      shapesRef.current.clear();

      // Clear the canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
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
      };
      shapesRef.current.set(shape.shapeId, shape);

      // Redraw entire canvas to include the new shape
      redrawCanvas();
    };

    connection.on('ReceiveStrokeBatch', handleStrokeBatch);
    connection.on('StrokeUndone', handleStrokeUndone);
    connection.on('BoardCleared', handleBoardCleared);
    connection.on('ReceiveShape', handleShapeDrawn);

    return () => {
      connection.off('ReceiveStrokeBatch', handleStrokeBatch);
      connection.off('StrokeUndone', handleStrokeUndone);
      connection.off('BoardCleared', handleBoardCleared);
      connection.off('ReceiveShape', handleShapeDrawn);
    };
  }, [connection, student.studentId]);

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
  }, []);

  return (
    <>
      <div
        className={`student-tile ${student.isLocked ? 'locked' : ''}`}
        onContextMenu={handleContextMenu}
      >
        <div className="student-tile-header">
          {student.isLocked && '🔒 '}{student.displayName}
        </div>
        <canvas
          ref={canvasRef}
          className="student-canvas"
          width={200}
          height={150}
        />
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
