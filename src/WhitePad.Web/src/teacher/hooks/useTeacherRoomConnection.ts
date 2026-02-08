import { useCallback, useEffect, useRef, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { createSignalRConnection } from '../../services/signalr';
import { ParticipantJoined, ParticipantLeft, Student, ConfidenceChanged, StudentLocked } from '../../shared/types/messages';
import { HubEvents, HubMethods } from '../../shared/constants/hubContract';

type TeacherRoomActions = {
  setWaitingRoomEnabled: (enabled: boolean) => Promise<void>;
  unlockWaitingRoom: () => Promise<void>;
};

type TeacherRoomConnectionState = {
  connection: HubConnection | null;
  students: Student[];
  error: string | null;
  actions: TeacherRoomActions;
};

export function useTeacherRoomConnection(roomId: string): TeacherRoomConnectionState {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    let isDisposed = false;
    const conn = createSignalRConnection('/hub/whiteboard');
    setStudents([]);
    setConnection(null);
    setError(null);

    conn.on(HubEvents.ParticipantJoined, (data: ParticipantJoined) => {
      const student: Student = {
        studentId: data.studentId,
        displayName: data.displayName,
        connectedAt: data.connectedAt,
        inputMode: data.inputMode,
        isLocked: false,
      };
      setStudents(prev => [...prev, student]);
    });

    conn.on(HubEvents.ParticipantLeft, (data: ParticipantLeft) => {
      setStudents(prev => prev.filter(s => s.studentId !== data.studentId));
    });

    conn.on(HubEvents.ConfidenceChanged, (message: ConfidenceChanged) => {
      setStudents(prev =>
        prev.map(s =>
          s.studentId === message.studentId
            ? { ...s, confidenceLevel: message.confidenceLevel }
            : s
        )
      );
    });

    conn.on(HubEvents.StudentLocked, (message: StudentLocked) => {
      setStudents(prev =>
        prev.map(s =>
          s.studentId === message.studentId
            ? { ...s, isLocked: message.isLocked }
            : s
        )
      );
    });

    const setupConnection = async () => {
      try {
        await conn.start();
        await conn.invoke(HubMethods.JoinRoomAsTeacher, roomId);

        if (isDisposed) {
          await conn.stop();
          return;
        }

        connectionRef.current = conn;
        setConnection(conn);
      } catch (err) {
        console.error('Failed to connect:', err);
        setError('Failed to connect to room');
      }
    };

    setupConnection();

    return () => {
      isDisposed = true;
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      } else {
        conn.stop();
      }
    };
  }, [roomId]);

  const setWaitingRoomEnabled = useCallback(async (enabled: boolean) => {
    if (!connectionRef.current) {
      return;
    }

    try {
      await connectionRef.current.invoke(HubMethods.SetWaitingRoomEnabled, roomId, enabled);
      console.log(`Waiting room ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error('Failed to toggle waiting room:', err);
    }
  }, [roomId]);

  const unlockWaitingRoom = useCallback(async () => {
    if (!connectionRef.current) {
      return;
    }

    try {
      await connectionRef.current.invoke(HubMethods.UnlockWaitingRoom, roomId);
      console.log('Unlocked waiting room when entering viewer mode');
    } catch (err) {
      console.error('Failed to unlock waiting room:', err);
    }
  }, [roomId]);

  return {
    connection,
    students,
    error,
    actions: {
      setWaitingRoomEnabled,
      unlockWaitingRoom,
    },
  };
}
