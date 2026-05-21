import { describe, expect, it } from 'vitest';
import {
  applyClearToBoard,
  applyStrokeBatchToBoard,
  applyUndoToBoard,
  emptyTeacherBoard,
  ERASER_COLOR_SENTINEL,
  isEraserBatch,
} from '../teacherBoardState';
import { StrokeBatch } from '../../shared/types/messages';

function stroke(overrides: Partial<StrokeBatch>): StrokeBatch {
  return {
    studentId: 'student-1',
    strokeId: 'stroke-1',
    points: [{ x: 0.1, y: 0.2, pressure: 0.5 }],
    color: '#000000',
    lineWidth: 2,
    isComplete: false,
    ...overrides,
  };
}

describe('teacherBoardState', () => {
  it('keeps eraser strokes in replay order after earlier drawing', () => {
    let board = emptyTeacherBoard();

    board = applyStrokeBatchToBoard(board, stroke({ strokeId: 'draw-1' }));
    board = applyStrokeBatchToBoard(board, stroke({
      strokeId: 'erase-1',
      color: ERASER_COLOR_SENTINEL,
      lineWidth: -8,
      isEraser: true,
    }));

    expect(board.drawOrder).toEqual(['draw-1', 'erase-1']);
    expect(isEraserBatch(board.strokes['erase-1'])).toBe(true);
  });

  it('appends continuation batches without duplicating draw order', () => {
    let board = emptyTeacherBoard();

    board = applyStrokeBatchToBoard(board, stroke({ strokeId: 'draw-1' }));
    board = applyStrokeBatchToBoard(board, stroke({
      strokeId: 'draw-1',
      points: [{ x: 0.3, y: 0.4, pressure: 0.5 }],
      isComplete: true,
    }));

    expect(board.drawOrder).toEqual(['draw-1']);
    expect(board.strokes['draw-1'].points).toHaveLength(2);
    expect(board.strokes['draw-1'].isComplete).toBe(true);
  });

  it('can undo and clear stored teacher board state', () => {
    let board = emptyTeacherBoard();
    board = applyStrokeBatchToBoard(board, stroke({ strokeId: 'draw-1' }));
    board = applyStrokeBatchToBoard(board, stroke({ strokeId: 'draw-2' }));

    board = applyUndoToBoard(board, { studentId: 'student-1', strokeId: 'draw-1' });

    expect(board.drawOrder).toEqual(['draw-2']);
    expect(board.strokes['draw-1']).toBeUndefined();

    board = applyClearToBoard(board, { studentId: 'student-1' });

    expect(board.drawOrder).toEqual([]);
    expect(board.strokes).toEqual({});
  });

  it('creates a fresh empty board for reconnect clearing', () => {
    let board = emptyTeacherBoard();
    board = applyStrokeBatchToBoard(board, stroke({ strokeId: 'draw-1' }));

    board = emptyTeacherBoard();

    expect(board.drawOrder).toEqual([]);
    expect(board.strokes).toEqual({});
    expect(board.shapes).toEqual({});
  });
});
