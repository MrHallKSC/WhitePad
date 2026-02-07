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
  const [showKickedModal, setShowKickedModal] = useState(false);
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

  const handleKickedModalClose = () => {
    setShowKickedModal(false);
    setStudentId(null);
    setDisplayName(null);
  };

  // Handle being kicked by teacher
  useEffect(() => {
    if (!connection) return;

    const handleKicked = () => {
      // Show kicked modal
      setShowKickedModal(true);
    };

    connection.on('Kicked', handleKicked);

    return () => {
      connection.off('Kicked', handleKicked);
    };
  }, [connection]);

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
    <>
      <DrawingPage
        roomId={roomId}
        studentId={studentId}
        displayName={displayName}
        connection={connection}
      />

      {showKickedModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>You were kicked</h2>
            <p>The teacher has removed you from the session.</p>
            <button type="button" className="button primary" onClick={handleKickedModalClose}>
              Okay
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default StudentApp;
