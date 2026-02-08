import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { StudentLocked, WaitingRoomStateChanged } from '../../shared/types/messages';
import { HubEvents, HubMethods } from '../../shared/constants/hubContract';

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
  const [isLocked, setIsLocked] = useState(initialIsLocked);
  const [isInWaitingRoomFlow, setIsInWaitingRoomFlow] = useState(
    initialWaitingRoomEnabled && initialIsLocked
  );
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(initialWaitingRoomEnabled);
  const [waitingRoomUnlocked, setWaitingRoomUnlocked] = useState(initialWaitingRoomUnlocked);

  // Keep initial join state in sync if the student/session changes.
  useEffect(() => {
    setIsLocked(initialIsLocked);
    setIsInWaitingRoomFlow(initialWaitingRoomEnabled && initialIsLocked);
    setWaitingRoomEnabled(initialWaitingRoomEnabled);
    setWaitingRoomUnlocked(initialWaitingRoomUnlocked);
  }, [studentId, initialIsLocked, initialWaitingRoomEnabled, initialWaitingRoomUnlocked]);

  useEffect(() => {
    const handleStudentLocked = (message: StudentLocked) => {
      if (message.studentId === studentId) {
        setIsLocked(message.isLocked);
        if (!message.isLocked) {
          setIsInWaitingRoomFlow(false);
        }
      }
    };

    connection.on(HubEvents.StudentLocked, handleStudentLocked);
    return () => {
      connection.off(HubEvents.StudentLocked, handleStudentLocked);
    };
  }, [connection, studentId]);

  useEffect(() => {
    const handleWaitingRoomStateChanged = (message: WaitingRoomStateChanged) => {
      setWaitingRoomEnabled(message.waitingRoomEnabled);
      setWaitingRoomUnlocked(message.waitingRoomUnlocked);

      if (!message.waitingRoomEnabled) {
        setIsLocked(false);
        setIsInWaitingRoomFlow(false);
      } else if (!message.waitingRoomUnlocked) {
        // Waiting room has been (re)enabled and students are gated again.
        setIsInWaitingRoomFlow(true);
      }
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
    isLocked,
    setIsLocked,
    isInWaitingRoomFlow,
    waitingRoomEnabled,
    waitingRoomUnlocked,
    joinFromWaitingRoom,
  };
}
