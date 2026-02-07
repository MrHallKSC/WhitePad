import { useRef, useEffect } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { Student, StrokeBatch } from '../shared/types/messages';

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
      ctx.lineWidth = batch.lineWidth;
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

    connection.on('ReceiveStrokeBatch', handleStrokeBatch);

    return () => {
      connection.off('ReceiveStrokeBatch', handleStrokeBatch);
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
    </div>
  );
}

export default StudentTile;
