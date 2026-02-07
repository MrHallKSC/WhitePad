import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HubConnection } from '@microsoft/signalr';
import { createSignalRConnection } from '../services/signalr';
import JoinPage from './JoinPage';
import DrawingPage from './DrawingPage';

function StudentApp() {
  const [searchParams] = useSearchParams();
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const connectionRef = useRef<HubConnection | null>(null);

  const roomId = searchParams.get('roomId');
  const joinToken = searchParams.get('token');

  useEffect(() => {
    // Create and maintain one connection for the entire student session
    const setupConnection = async () => {
      const conn = createSignalRConnection('/hub/whiteboard');
      await conn.start();
      connectionRef.current = conn;
      setConnection(conn);
    };

    setupConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  const handleJoined = useCallback((id: string, name: string) => {
    setStudentId(id);
    setDisplayName(name);
  }, []);

  if (!roomId || !joinToken) {
    return (
      <div className="error-message">
        Invalid join URL. Please use the link provided by your teacher.
      </div>
    );
  }

  if (!connection) {
    return <div className="join-container"><p>Connecting...</p></div>;
  }

  if (!studentId || !displayName) {
    return (
      <JoinPage
        roomId={roomId}
        joinToken={joinToken}
        connection={connection}
        onJoined={handleJoined}
      />
    );
  }

  return (
    <DrawingPage
      roomId={roomId}
      studentId={studentId}
      displayName={displayName}
      connection={connection}
    />
  );
}

export default StudentApp;
