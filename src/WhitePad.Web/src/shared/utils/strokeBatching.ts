import { StrokeBatch, StrokePoint } from '../types/messages';

export class StrokeBatcher {
  private points: StrokePoint[] = [];
  private batchInterval = 50;
  private timer: number | null = null;

  constructor(
    private strokeId: string,
    private onBatch: (batch: Partial<StrokeBatch>) => void
  ) {}

  addPoint(point: StrokePoint) {
    this.points.push(point);

    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchInterval);
    }
  }

  flush(isComplete = false) {
    if (this.points.length > 0) {
      this.onBatch({
        strokeId: this.strokeId,
        points: [...this.points],
        isComplete,
        // color and lineWidth will be added by the caller
      });
      this.points = [];
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
