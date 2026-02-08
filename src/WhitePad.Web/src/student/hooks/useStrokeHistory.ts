import { Dispatch, MutableRefObject, SetStateAction, useState } from 'react';
import { useLatest } from '../../shared/hooks/useLatest';

type StrokeHistoryState = {
  strokeHistory: string[];
  setStrokeHistory: Dispatch<SetStateAction<string[]>>;
  strokeHistoryRef: MutableRefObject<string[]>;
  undoneStrokes: string[];
  setUndoneStrokes: Dispatch<SetStateAction<string[]>>;
};

export function useStrokeHistory(): StrokeHistoryState {
  const [strokeHistory, setStrokeHistory] = useState<string[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<string[]>([]);
  const strokeHistoryRef = useLatest(strokeHistory);

  return {
    strokeHistory,
    setStrokeHistory,
    strokeHistoryRef,
    undoneStrokes,
    setUndoneStrokes,
  };
}
