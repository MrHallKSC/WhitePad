import { useState, useEffect, useRef } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { JoinRoomResponse } from '../shared/types/messages';

interface JoinPageProps {
  roomId: string;
  joinToken: string;
  connection: HubConnection;
  onJoined: (studentId: string, displayName: string) => void;
}

function JoinPage({ roomId, joinToken, connection, onJoined }: JoinPageProps) {
  const [error, setError] = useState<string | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (hasJoinedRef.current) return; // Prevent duplicate joins

    const joinRoom = async () => {
      try {
        hasJoinedRef.current = true; // Mark as joining

        const response: JoinRoomResponse = await connection.invoke(
          'JoinRoomAsStudent',
          roomId,
          joinToken
        );

        if (!response.success) {
          setError(response.error || 'Failed to join room');
          hasJoinedRef.current = false; // Reset on error
          return;
        }

        onJoined(response.studentId!, response.displayName!);
      } catch (err) {
        console.error('Failed to join room:', err);
        setError('Failed to join room. Please check the link and try again.');
        hasJoinedRef.current = false; // Reset on error
      }
    };

    joinRoom();
  }, [roomId, joinToken, connection, onJoined]);

  return (
    <div className="join-container">
      {error ? (
        <p className="error-message">{error}</p>
      ) : (
        <p>Joining room...</p>
      )}
    </div>
  );
}

export default JoinPage;
