import { useRef, useEffect } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { Student, StrokeBatch, StrokeUndone, BoardCleared } from '../shared/types/messages';

interface StudentTileProps {
  student: Student;
  connection: HubConnection | null;
}

function StudentTile({ student, connection }: StudentTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Map<string, StrokeBatch>>(new Map());

  useEffect(() => {
    if (!connection) return;

    const handleStrokeBatch = (batch: StrokeBatch) => {
      if (batch.studentId !== student.studentId) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculate startIndex BEFORE modifying the existing batch
      const existingBatch = strokesRef.current.get(batch.strokeId);
      const startIndex = existingBatch ? existingBatch.points.length : 0;

      // Store the batch
      if (existingBatch) {
        existingBatch.points.push(...batch.points);
        existingBatch.isComplete = batch.isComplete;
      } else {
        strokesRef.current.set(batch.strokeId, { ...batch, points: [...batch.points] });
      }

      // Render the new points
      const currentBatch = strokesRef.current.get(batch.strokeId)!;

      ctx.strokeStyle = batch.color;
      ctx.lineWidth = batch.lineWidth * 0.4; // Scale down for smaller teacher view
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Always start a new path
      ctx.beginPath();

      if (startIndex === 0) {
        // First batch - start from the first point
        if (currentBatch.points.length > 0) {
          const firstPoint = currentBatch.points[0];
          ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
        }
        // Draw lines starting from point[1]
        for (let i = 1; i < currentBatch.points.length; i++) {
          const point = currentBatch.points[i];
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        }
      } else {
        // Continuation batch - start from the last point we already drew
        const lastPoint = currentBatch.points[startIndex - 1];
        ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height);

        // Draw lines to the new points
        for (let i = startIndex; i < currentBatch.points.length; i++) {
          const point = currentBatch.points[i];
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        }
      }

      ctx.stroke();

      // Clean up completed strokes
      if (batch.isComplete) {
        // Keep the stroke for potential re-rendering, but could implement cleanup here
      }
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

        ctx.strokeStyle = batch.color;
        ctx.lineWidth = batch.lineWidth * 0.4; // Scale down for smaller teacher view
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        const firstPoint = batch.points[0];
        ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);

        for (let i = 1; i < batch.points.length; i++) {
          const point = batch.points[i];
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        }

        ctx.stroke();
      });
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

      // Clear all strokes for this student
      strokesRef.current.clear();

      // Clear the canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };

    connection.on('ReceiveStrokeBatch', handleStrokeBatch);
    connection.on('StrokeUndone', handleStrokeUndone);
    connection.on('BoardCleared', handleBoardCleared);

    return () => {
      connection.off('ReceiveStrokeBatch', handleStrokeBatch);
      connection.off('StrokeUndone', handleStrokeUndone);
      connection.off('BoardCleared', handleBoardCleared);
    };
  }, [connection, student.studentId]);

  return (
    <div className="student-tile">
      <div className="student-tile-header">{student.displayName}</div>
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
  );
}

export default StudentTile;
