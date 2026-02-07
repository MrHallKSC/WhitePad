/**
 * Converts screen pixel coordinates to normalized 0-1 coordinates
 */
export function pixelToNormalized(
  pixelX: number,
  pixelY: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: pixelX / canvasWidth,
    y: pixelY / canvasHeight,
  };
}

/**
 * Converts normalized 0-1 coordinates to screen pixel coordinates
 */
export function normalizedToPixel(
  normalizedX: number,
  normalizedY: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: normalizedX * canvasWidth,
    y: normalizedY * canvasHeight,
  };
}
