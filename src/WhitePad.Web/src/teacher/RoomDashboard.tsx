import { useState, useEffect, useRef } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { createSignalRConnection } from '../services/signalr';
import { ParticipantJoined, ParticipantLeft, Student, ConfidenceChanged, StudentLocked } from '../shared/types/messages';
import StudentGrid from './StudentGrid';
import ConfidenceSummary from './ConfidenceSummary';

interface RoomDashboardProps {
  roomId: string;
  joinToken: string;
}

function RoomDashboard({ roomId, joinToken }: RoomDashboardProps) {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const setupConnection = async () => {
      const conn = createSignalRConnection('/hub/whiteboard');

      conn.on('ParticipantJoined', (data: ParticipantJoined) => {
        const student: Student = {
          studentId: data.studentId,
          displayName: data.displayName,
          connectedAt: data.connectedAt,
          inputMode: data.inputMode
        };
        setStudents(prev => [...prev, student]);
      });

      conn.on('ParticipantLeft', (data: ParticipantLeft) => {
        console.log('ParticipantLeft event received:', data);
        setStudents(prev => {
          const filtered = prev.filter(s => s.studentId !== data.studentId);
          console.log(`Removing student ${data.studentId}. Students before: ${prev.length}, after: ${filtered.length}`);
          return filtered;
        });
      });

      conn.on('ConfidenceChanged', (message: ConfidenceChanged) => {
        setStudents(prev =>
          prev.map(s =>
            s.studentId === message.studentId
              ? { ...s, confidenceLevel: message.confidenceLevel }
              : s
          )
        );
      });

      conn.on('StudentLocked', (message: StudentLocked) => {
        setStudents(prev =>
          prev.map(s =>
            s.studentId === message.studentId
              ? { ...s, isLocked: message.isLocked }
              : s
          )
        );
      });

      try {
        await conn.start();
        await conn.invoke('JoinRoomAsTeacher', roomId);
        connectionRef.current = conn;
        setConnection(conn);
      } catch (err) {
        console.error('Failed to connect:', err);
        setError('Failed to connect to room');
      }
    };

    setupConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [roomId]);

  const joinUrl = `${window.location.origin}/join?roomId=${roomId}&token=${joinToken}`;

  const handleLockAll = async () => {
    if (!connection) return;
    try {
      await connection.invoke('LockAllStudents', roomId);
    } catch (err) {
      console.error('Failed to lock all students:', err);
    }
  };

  const handleUnlockAll = async () => {
    if (!connection) return;
    try {
      await connection.invoke('UnlockAllStudents', roomId);
    } catch (err) {
      console.error('Failed to unlock all students:', err);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>WhitePad Dashboard</h1>
        <div className="dashboard-info-row">
          <div className="room-info">
            <p><strong>Room ID:</strong> {roomId}</p>
            <p><strong>Join URL:</strong> {joinUrl}</p>
            <p className="student-count">Students Connected: {students.length}</p>
          </div>
          <ConfidenceSummary students={students} />
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <StudentGrid students={students} connection={connection} roomId={roomId} />

      <div className="classroom-controls">
        <h3>Classroom Controls</h3>
        <div className="control-buttons">
          <button type="button" className="button secondary" onClick={handleLockAll}>
            🔒 Lock All Students
          </button>
          <button type="button" className="button secondary" onClick={handleUnlockAll}>
            🔓 Unlock All Students
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoomDashboard;
