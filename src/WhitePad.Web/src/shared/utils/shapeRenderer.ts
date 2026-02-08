import { Shape } from '../types/messages';

type RenderShapeOptions = {
  isDashed?: boolean;
  lineWidthScale?: number;
};

export function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  canvasWidth: number,
  canvasHeight: number,
  options: RenderShapeOptions = {}
) {
  if (shape.points.length === 0) {
    return;
  }

  const { isDashed = false, lineWidthScale = 1 } = options;
  const shapeLineWidth = shape.lineWidth || 2;

  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shapeLineWidth * lineWidthScale;
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
      if (shape.points.length >= 2) {
        const start = shape.points[0];
        const end = shape.points[1];
        const startX = start.x * canvasWidth;
        const startY = start.y * canvasHeight;
        const endX = end.x * canvasWidth;
        const endY = end.y * canvasHeight;

        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);

        const headLength = Math.max(15, shapeLineWidth * 4);
        const angle = Math.atan2(endY - startY, endX - startX);

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
      if (shape.points.length >= 2) {
        const origin = shape.points[0];
        const extent = shape.points[1];
        const originX = origin.x * canvasWidth;
        const originY = origin.y * canvasHeight;
        const extentX = extent.x * canvasWidth;
        const extentY = extent.y * canvasHeight;

        ctx.moveTo(originX, originY);
        ctx.lineTo(extentX, originY);
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX, extentY);
      }
      break;
    case 'axesCross':
      if (shape.points.length >= 2) {
        const center = shape.points[0];
        const extent = shape.points[1];
        const centerX = center.x * canvasWidth;
        const centerY = center.y * canvasHeight;
        const extentX = extent.x * canvasWidth;
        const extentY = extent.y * canvasHeight;
        const dx = Math.abs(extentX - centerX);
        const dy = Math.abs(extentY - centerY);

        ctx.moveTo(centerX - dx, centerY);
        ctx.lineTo(centerX + dx, centerY);
        ctx.moveTo(centerX, centerY - dy);
        ctx.lineTo(centerX, centerY + dy);
      }
      break;
  }

  ctx.stroke();

  if (isDashed) {
    ctx.setLineDash([]);
  }
}
