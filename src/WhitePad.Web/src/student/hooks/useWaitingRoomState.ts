import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { StudentLocked, WaitingRoomStateChanged } from '../../shared/types/messages';
import { HubEvents, HubMethods } from '../../shared/constants/hubContract';
import {
  applyStudentLocked,
  applyWaitingRoomStateChanged,
  createInitialWaitingRoomState,
} from './waitingRoomStateMachine';

type WaitingRoomState = {
  isLocked: boolean;
  setIsLocked: Dispatch<SetStateAction<boolean>>;
  isInWaitingRoomFlow: boolean;
  waitingRoomEnabled: boolean;
  waitingRoomUnlocked: boolean;
  joinFromWaitingRoom: () => Promise<void>;
};

type UseWaitingRoomStateOptions = {
  connection: HubConnection;
  studentId: string;
  initialIsLocked?: boolean;
  initialWaitingRoomEnabled?: boolean;
  initialWaitingRoomUnlocked?: boolean;
};

export function useWaitingRoomState({
  connection,
  studentId,
  initialIsLocked = false,
  initialWaitingRoomEnabled = false,
  initialWaitingRoomUnlocked = false,
}: UseWaitingRoomStateOptions): WaitingRoomState {
  const [uiState, setUiState] = useState(() =>
    createInitialWaitingRoomState(
      initialIsLocked,
      initialWaitingRoomEnabled,
      initialWaitingRoomUnlocked
    )
  );

  // Keep initial join state in sync if the student/session changes.
  useEffect(() => {
    setUiState(
      createInitialWaitingRoomState(
        initialIsLocked,
        initialWaitingRoomEnabled,
        initialWaitingRoomUnlocked
      )
    );
  }, [studentId, initialIsLocked, initialWaitingRoomEnabled, initialWaitingRoomUnlocked]);

  useEffect(() => {
    const handleStudentLocked = (message: StudentLocked) => {
      if (message.studentId === studentId) {
        setUiState(prev => applyStudentLocked(prev, message.isLocked));
      }
    };

    connection.on(HubEvents.StudentLocked, handleStudentLocked);
    return () => {
      connection.off(HubEvents.StudentLocked, handleStudentLocked);
    };
  }, [connection, studentId]);

  useEffect(() => {
    const handleWaitingRoomStateChanged = (message: WaitingRoomStateChanged) => {
      setUiState(prev => applyWaitingRoomStateChanged(prev, message));
    };

    connection.on(HubEvents.WaitingRoomStateChanged, handleWaitingRoomStateChanged);
    return () => {
      connection.off(HubEvents.WaitingRoomStateChanged, handleWaitingRoomStateChanged);
    };
  }, [connection]);

  const joinFromWaitingRoom = useCallback(async () => {
    await connection.invoke(HubMethods.JoinFromWaitingRoom);
  }, [connection]);

  return {
    isLocked: uiState.isLocked,
    setIsLocked: (value) => {
      if (typeof value === 'function') {
        setUiState(prev => applyStudentLocked(prev, value(prev.isLocked)));
        return;
      }

      setUiState(prev => applyStudentLocked(prev, value));
    },
    isInWaitingRoomFlow: uiState.isInWaitingRoomFlow,
    waitingRoomEnabled: uiState.waitingRoomEnabled,
    waitingRoomUnlocked: uiState.waitingRoomUnlocked,
    joinFromWaitingRoom,
  };
}
