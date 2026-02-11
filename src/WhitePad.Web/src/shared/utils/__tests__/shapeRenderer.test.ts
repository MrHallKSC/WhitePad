import { describe, expect, it } from 'vitest';
import { renderShape } from '../shapeRenderer';
import { Shape } from '../../types/messages';

type Call = { name: string; args: unknown[] };

function createMockContext() {
  const calls: Call[] = [];
  const ctx: Partial<CanvasRenderingContext2D> = {
    beginPath: () => calls.push({ name: 'beginPath', args: [] }),
    moveTo: (...args: unknown[]) => calls.push({ name: 'moveTo', args }),
    lineTo: (...args: unknown[]) => calls.push({ name: 'lineTo', args }),
    rect: (...args: unknown[]) => calls.push({ name: 'rect', args }),
    arc: (...args: unknown[]) => calls.push({ name: 'arc', args }),
    stroke: () => calls.push({ name: 'stroke', args: [] }),
    setLineDash: (...args: unknown[]) => calls.push({ name: 'setLineDash', args }),
  };

  return { ctx: ctx as CanvasRenderingContext2D, calls };
}

describe('renderShape', () => {
  it('does nothing when no points are provided', () => {
    const { ctx, calls } = createMockContext();
    const shape: Shape = {
      shapeId: 's1',
      studentId: 'st1',
      type: 'line',
      points: [],
      color: '#000000',
      lineWidth: 2,
      isComplete: true,
    };

    renderShape(ctx, shape, 100, 200);

    expect(calls.length).toBe(0);
  });

  it('renders a line with correct scaling', () => {
    const { ctx, calls } = createMockContext();
    const shape: Shape = {
      shapeId: 's1',
      studentId: 'st1',
      type: 'line',
      points: [
        { x: 0.1, y: 0.2, pressure: 0 },
        { x: 0.5, y: 0.6, pressure: 0 },
      ],
      color: '#000000',
      lineWidth: 2,
      isComplete: true,
    };

    renderShape(ctx, shape, 100, 200);

    const moveTo = calls.find(c => c.name === 'moveTo');
    const lineTo = calls.find(c => c.name === 'lineTo');
    expect(moveTo?.args).toEqual([10, 40]);
    expect(lineTo?.args).toEqual([50, 120]);
  });

  it('renders a rectangle using min/max corners', () => {
    const { ctx, calls } = createMockContext();
    const shape: Shape = {
      shapeId: 's2',
      studentId: 'st1',
      type: 'rectangle',
      points: [
        { x: 0.8, y: 0.9, pressure: 0 },
        { x: 0.2, y: 0.1, pressure: 0 },
      ],
      color: '#000000',
      lineWidth: 2,
      isComplete: true,
    };

    renderShape(ctx, shape, 100, 200);

    const rect = calls.find(c => c.name === 'rect');
    expect(rect?.args?.[0]).toBe(20);
    expect(rect?.args?.[1]).toBe(20);
    expect(rect?.args?.[2]).toBeCloseTo(60, 6);
    expect(rect?.args?.[3]).toBe(160);
  });

  it('renders a circle with correct radius', () => {
    const { ctx, calls } = createMockContext();
    const shape: Shape = {
      shapeId: 's3',
      studentId: 'st1',
      type: 'circle',
      points: [
        { x: 0.5, y: 0.5, pressure: 0 },
        { x: 0.5, y: 0.75, pressure: 0 },
      ],
      color: '#000000',
      lineWidth: 2,
      isComplete: true,
    };

    renderShape(ctx, shape, 100, 200);

    const arc = calls.find(c => c.name === 'arc');
    expect(arc?.args).toEqual([50, 100, 50, 0, Math.PI * 2]);
  });

  it('renders an arrow with main line and arrowhead segments', () => {
    const { ctx, calls } = createMockContext();
    const shape: Shape = {
      shapeId: 's4',
      studentId: 'st1',
      type: 'arrow',
      points: [
        { x: 0.1, y: 0.2, pressure: 0 },
        { x: 0.4, y: 0.2, pressure: 0 },
      ],
      color: '#000000',
      lineWidth: 2,
      isComplete: true,
    };

    renderShape(ctx, shape, 100, 200);

    const moveTo = calls.find(c => c.name === 'moveTo');
    const lineTos = calls.filter(c => c.name === 'lineTo');
    expect(moveTo?.args).toEqual([10, 40]);
    expect(lineTos[0]?.args).toEqual([40, 40]);
    expect(lineTos.length).toBe(3);
  });

  it('renders L-axes with two perpendicular lines', () => {
    const { ctx, calls } = createMockContext();
    const shape: Shape = {
      shapeId: 's5',
      studentId: 'st1',
      type: 'axesL',
      points: [
        { x: 0.1, y: 0.8, pressure: 0 },
        { x: 0.9, y: 0.2, pressure: 0 },
      ],
      color: '#000000',
      lineWidth: 2,
      isComplete: true,
    };

    renderShape(ctx, shape, 100, 200);

    const moveTos = calls.filter(c => c.name === 'moveTo');
    const lineTos = calls.filter(c => c.name === 'lineTo');
    expect(moveTos[0]?.args).toEqual([10, 160]);
    expect(lineTos[0]?.args).toEqual([90, 160]);
    expect(moveTos[1]?.args).toEqual([10, 160]);
    expect(lineTos[1]?.args).toEqual([10, 40]);
  });

  it('renders cross-axes using center and extents', () => {
    const { ctx, calls } = createMockContext();
    const shape: Shape = {
      shapeId: 's6',
      studentId: 'st1',
      type: 'axesCross',
      points: [
        { x: 0.5, y: 0.5, pressure: 0 },
        { x: 0.7, y: 0.8, pressure: 0 },
      ],
      color: '#000000',
      lineWidth: 2,
      isComplete: true,
    };

    renderShape(ctx, shape, 100, 200);

    const moveTos = calls.filter(c => c.name === 'moveTo');
    const lineTos = calls.filter(c => c.name === 'lineTo');
    expect(moveTos[0]?.args).toEqual([30, 100]);
    expect(lineTos[0]?.args).toEqual([70, 100]);
    expect(moveTos[1]?.args).toEqual([50, 40]);
    expect(lineTos[1]?.args).toEqual([50, 160]);
  });

  it('applies dashed mode and resets line dash after stroke', () => {
    const { ctx, calls } = createMockContext();
    const shape: Shape = {
      shapeId: 's7',
      studentId: 'st1',
      type: 'line',
      points: [
        { x: 0, y: 0, pressure: 0 },
        { x: 1, y: 1, pressure: 0 },
      ],
      color: '#000000',
      lineWidth: 2,
      isComplete: true,
    };

    renderShape(ctx, shape, 100, 200, { isDashed: true });

    const lineDashCalls = calls.filter(c => c.name === 'setLineDash');
    expect(lineDashCalls[0]?.args).toEqual([[5, 5]]);
    expect(lineDashCalls.at(-1)?.args).toEqual([[]]);
  });
});
