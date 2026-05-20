import { useEffect, useRef, useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { createSignalRConnection } from '../../services/signalr';
import {
  ParticipantJoined,
  ParticipantLeft,
  Student,
  ConfidenceChanged,
  StudentLocked,
  AnsweredChanged,
} from '../../shared/types/messages';
import { HubEvents, HubMethods } from '../../shared/constants/hubContract';
import { readTeacherToken } from '../teacherTokenStore';

type TeacherRoomConnectionState = {
  connection: HubConnection | null;
  students: Student[];
  error: string | null;
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
        hasAnswered: data.hasAnswered ?? false,
        confidenceLevel: data.confidenceLevel ?? 'none',
      };
      setStudents(prev => [
        ...prev.filter(existing => existing.studentId !== student.studentId),
        student
      ]);
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

    const handleAnsweredChanged = (message: AnsweredChanged) => {
      setStudents(prev =>
        prev.map(s =>
          s.studentId === message.studentId
            ? { ...s, hasAnswered: message.hasAnswered }
            : s
        )
      );
    };

    conn.on(HubEvents.AnsweredChanged, handleAnsweredChanged);
    // Safety: handle PascalCase event name as well.
    conn.on('AnsweredChanged', handleAnsweredChanged);

    const setupConnection = async () => {
      const teacherToken = readTeacherToken(roomId);
      if (!teacherToken) {
        console.error('No teacher token available for room', roomId);
        setError('This dashboard is no longer authorised. Create a new room.');
        return;
      }

      try {
        await conn.start();
        await conn.invoke(HubMethods.JoinRoomAsTeacher, roomId, teacherToken);

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

  return {
    connection,
    students,
    error,
  };
}
