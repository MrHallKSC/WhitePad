import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HubConnection } from '@microsoft/signalr';
import { createSignalRConnection } from '../services/signalr';
import { StudentLocked, WaitingRoomStateChanged } from '../shared/types/messages';
import JoinPage from './JoinPage';
import DrawingPage from './DrawingPage';

function StudentApp() {
  const [searchParams] = useSearchParams();
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [showKickedModal, setShowKickedModal] = useState(false);
  const [initialIsLocked, setInitialIsLocked] = useState(false);
  const [initialWaitingRoomUnlocked, setInitialWaitingRoomUnlocked] = useState(false);
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

    connection.on('kicked', handleKicked);

    return () => {
      connection.off('kicked', handleKicked);
    };
  }, [connection]);

  // Set up early listeners to capture initial state when student joins
  // These listeners are set up BEFORE join happens, so they catch the initial messages
  useEffect(() => {
    if (!connection) return;

    const handleStudentLocked = (message: StudentLocked) => {
      console.log('[STUDENT APP] StudentLocked message received:', message);
      // Update initial state for any student lock message (will be filtered by studentId in DrawingPage)
      setInitialIsLocked(message.isLocked);
    };

    const handleWaitingRoomStateChanged = (message: WaitingRoomStateChanged) => {
      console.log('[STUDENT APP] WaitingRoomStateChanged message received:', message);
      setInitialWaitingRoomUnlocked(message.waitingRoomUnlocked);
    };

    connection.on('studentLocked', handleStudentLocked);
    connection.on('waitingRoomStateChanged', handleWaitingRoomStateChanged);

    return () => {
      connection.off('studentLocked', handleStudentLocked);
      connection.off('waitingRoomStateChanged', handleWaitingRoomStateChanged);
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
        initialIsLocked={initialIsLocked}
        initialWaitingRoomUnlocked={initialWaitingRoomUnlocked}
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
