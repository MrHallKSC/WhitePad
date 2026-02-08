import { useState, useEffect, useRef } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { createSignalRConnection } from '../services/signalr';
import { ParticipantJoined, ParticipantLeft, Student, ConfidenceChanged, StudentLocked } from '../shared/types/messages';
import JoinMode from './JoinMode';
import ViewerMode from './ViewerMode';

interface RoomDashboardProps {
  roomId: string;
  roomName: string;
  joinToken: string;
  joinUrl: string;
}

type ViewMode = 'join' | 'viewer';

function RoomDashboard({ roomId, roomName, joinToken, joinUrl }: RoomDashboardProps) {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('join');
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(true);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const setupConnection = async () => {
      const conn = createSignalRConnection('/hub/whiteboard');

      conn.on('participantJoined', async (data: ParticipantJoined) => {
        console.log('[ROOM DASHBOARD] ParticipantJoined event:', data);
        const student: Student = {
          studentId: data.studentId,
          displayName: data.displayName,
          connectedAt: data.connectedAt,
          inputMode: data.inputMode,
          isLocked: false // Backend will send StudentLocked message if needed
        };
        setStudents(prev => [...prev, student]);
      });

      conn.on('participantLeft', (data: ParticipantLeft) => {
        console.log('ParticipantLeft event received:', data);
        setStudents(prev => {
          const filtered = prev.filter(s => s.studentId !== data.studentId);
          console.log(`Removing student ${data.studentId}. Students before: ${prev.length}, after: ${filtered.length}`);
          return filtered;
        });
      });

      conn.on('confidenceChanged', (message: ConfidenceChanged) => {
        setStudents(prev =>
          prev.map(s =>
            s.studentId === message.studentId
              ? { ...s, confidenceLevel: message.confidenceLevel }
              : s
          )
        );
      });

      conn.on('studentLocked', (message: StudentLocked) => {
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

  const handleWaitingRoomToggle = async (enabled: boolean) => {
    setWaitingRoomEnabled(enabled);

    if (connection) {
      try {
        await connection.invoke('SetWaitingRoomEnabled', roomId, enabled);
        console.log(`Waiting room ${enabled ? 'enabled' : 'disabled'}`);
      } catch (err) {
        console.error('Failed to toggle waiting room:', err);
      }
    }
  };

  const handleSwitchToViewer = async () => {
    // If waiting room was enabled, unlock the waiting room when entering viewer mode
    if (waitingRoomEnabled && connection) {
      try {
        await connection.invoke('UnlockWaitingRoom', roomId);
        console.log('Unlocked waiting room when entering viewer mode');
      } catch (err) {
        console.error('Failed to unlock waiting room:', err);
      }
    }
    setViewMode('viewer');
  };

  if (error) {
    return (
      <div className="dashboard-container">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {viewMode === 'join' ? (
        <JoinMode
          roomName={roomName}
          joinToken={joinToken}
          joinUrl={joinUrl}
          students={students}
          waitingRoomEnabled={waitingRoomEnabled}
          onWaitingRoomToggle={handleWaitingRoomToggle}
          onSwitchToViewer={handleSwitchToViewer}
        />
      ) : (
        <ViewerMode
          roomName={roomName}
          roomId={roomId}
          students={students}
          connection={connection}
          onSwitchToJoin={() => setViewMode('join')}
        />
      )}
    </div>
  );
}

export default RoomDashboard;
