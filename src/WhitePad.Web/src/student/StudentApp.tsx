import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import JoinPage from './JoinPage';
import DrawingPage from './DrawingPage';
import { useStudentConnection } from './hooks/useStudentConnection';

function StudentApp() {
  const [searchParams] = useSearchParams();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [initialIsLocked, setInitialIsLocked] = useState(false);
  const [initialWaitingRoomEnabled, setInitialWaitingRoomEnabled] = useState(false);
  const [initialWaitingRoomUnlocked, setInitialWaitingRoomUnlocked] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState<string | null>(null);
  const [showKickedModal, setShowKickedModal] = useState(false);

  const roomId = searchParams.get('roomId');
  const joinToken = searchParams.get('token');

  const handleJoined = useCallback((session: {
    studentId: string;
    displayName: string;
    isLocked: boolean;
    waitingRoomEnabled: boolean;
    waitingRoomUnlocked: boolean;
    currentQuestion: string | null;
  }) => {
    setStudentId(session.studentId);
    setDisplayName(session.displayName);
    setInitialIsLocked(session.isLocked);
    setInitialWaitingRoomEnabled(session.waitingRoomEnabled);
    setInitialWaitingRoomUnlocked(session.waitingRoomUnlocked);
    setInitialQuestion(session.currentQuestion);
  }, []);

  const handleKickedModalClose = () => {
    setShowKickedModal(false);
    setStudentId(null);
    setDisplayName(null);
    setInitialIsLocked(false);
    setInitialWaitingRoomEnabled(false);
    setInitialWaitingRoomUnlocked(false);
    setInitialQuestion(null);
  };

  // Stable callback for kicked event
  const handleKicked = useCallback(() => {
    // Show kicked modal
    setShowKickedModal(true);
  }, []);

  const { connection, error } = useStudentConnection(handleKicked);

  // Note: DrawingPage handles studentLocked and waitingRoomStateChanged events
  // We only set initial values here, which are passed as props to DrawingPage
  // DrawingPage will then maintain its own state and listen to updates

  if (!roomId || !joinToken) {
    return (
      <div className="error-message">
        Invalid join URL. Please use the link provided by your teacher.
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        {error}
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
        initialWaitingRoomEnabled={initialWaitingRoomEnabled}
        initialWaitingRoomUnlocked={initialWaitingRoomUnlocked}
        initialQuestion={initialQuestion}
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
