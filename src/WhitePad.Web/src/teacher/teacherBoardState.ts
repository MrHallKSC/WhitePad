import { BackgroundType, BoardCleared, PaperColor, Shape, ShapeDrawn, StrokeBatch, StrokeUndone } from '../shared/types/messages';

export type TeacherBoardState = {
  strokes: Record<string, StrokeBatch>;
  shapes: Record<string, Shape>;
  drawOrder: string[];
  backgroundType: BackgroundType;
  paperColor: PaperColor;
};

export type TeacherBoardStates = Record<string, TeacherBoardState>;

export const EMPTY_TEACHER_BOARD: TeacherBoardState = {
  strokes: {},
  shapes: {},
  drawOrder: [],
  backgroundType: 'none',
  paperColor: 'white',
};

export const ERASER_COLOR_SENTINEL = '__WHITEPAD_ERASER__';
export const ERASER_STROKE_MARKER = '-eraser-';

export function isEraserBatch(batch: StrokeBatch) {
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

export function emptyTeacherBoard(): TeacherBoardState {
  return {
    strokes: {},
    shapes: {},
    drawOrder: [],
    backgroundType: 'none',
    paperColor: 'white',
  };
}

export function applyStrokeBatchToBoard(board: TeacherBoardState, batch: StrokeBatch): TeacherBoardState {
  const isEraser = isEraserBatch(batch);
  const backgroundType = batch.backgroundType ?? board.backgroundType;
  const paperColor = batch.paperColor ?? board.paperColor;

  if (batch.points.length === 0) {
    return {
      ...board,
      backgroundType,
      paperColor,
    };
  }

  const existing = board.strokes[batch.strokeId];
  const nextStroke: StrokeBatch = existing
    ? {
        ...existing,
        points: [...existing.points, ...batch.points],
        isComplete: batch.isComplete,
        isEraser: existing.isEraser || isEraser,
        color: batch.color === ERASER_COLOR_SENTINEL ? ERASER_COLOR_SENTINEL : existing.color,
        lineWidth: batch.lineWidth < 0 ? batch.lineWidth : existing.lineWidth,
        backgroundType,
        paperColor,
      }
    : {
        ...batch,
        points: [...batch.points],
        isEraser,
        backgroundType,
        paperColor,
      };

  return {
    ...board,
    strokes: {
      ...board.strokes,
      [batch.strokeId]: nextStroke,
    },
    drawOrder: existing ? board.drawOrder : [...board.drawOrder, batch.strokeId],
    backgroundType,
    paperColor,
  };
}

export function applyShapeToBoard(board: TeacherBoardState, shapeDrawn: ShapeDrawn): TeacherBoardState {
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

  return {
    ...board,
    shapes: {
      ...board.shapes,
      [shape.shapeId]: shape,
    },
    drawOrder: board.shapes[shape.shapeId] ? board.drawOrder : [...board.drawOrder, shape.shapeId],
    backgroundType: shape.backgroundType ?? board.backgroundType,
    paperColor: shape.paperColor ?? board.paperColor,
  };
}

export function applyUndoToBoard(board: TeacherBoardState, message: StrokeUndone): TeacherBoardState {
  const { [message.strokeId]: _removedStroke, ...strokes } = board.strokes;
  const { [message.strokeId]: _removedShape, ...shapes } = board.shapes;

  return {
    ...board,
    strokes,
    shapes,
    drawOrder: board.drawOrder.filter(id => id !== message.strokeId),
  };
}

export function applyClearToBoard(board: TeacherBoardState, _message: BoardCleared): TeacherBoardState {
  return {
    ...board,
    strokes: {},
    shapes: {},
    drawOrder: [],
  };
}

export function updateStudentBoard(
  boards: TeacherBoardStates,
  studentId: string,
  update: (board: TeacherBoardState) => TeacherBoardState
): TeacherBoardStates {
  return {
    ...boards,
    [studentId]: update(boards[studentId] ?? emptyTeacherBoard()),
  };
}
