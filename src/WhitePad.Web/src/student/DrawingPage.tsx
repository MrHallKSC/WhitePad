import { useRef, useEffect } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { StrokeBatcher } from '../shared/utils/strokeBatching';
import { StrokePoint } from '../shared/types/messages';

interface DrawingPageProps {
  roomId: string;
  studentId: string;
  displayName: string;
  connection: HubConnection;
}

function DrawingPage({ roomId, studentId, displayName, connection }: DrawingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const batcherRef = useRef<StrokeBatcher | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

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

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokeId = `${studentId}-${Date.now()}`;
    batcherRef.current = new StrokeBatcher(strokeId, (batch) => {
      connection.invoke('SendStrokeBatch', batch).catch(err => {
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
    if (!canvas || !batcherRef.current) return;

    e.preventDefault();

    const pressure = e.pressure || 0.5;
    const point = getNormalizedPoint(e.clientX, e.clientY, pressure);

    batcherRef.current.addPoint(point);
    drawPoint(e.clientX - canvas.getBoundingClientRect().left,
             e.clientY - canvas.getBoundingClientRect().top);
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

  return (
    <div className="drawing-container">
      <div className="student-info">
        {displayName} - Room: {roomId}
      </div>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

export default DrawingPage;
