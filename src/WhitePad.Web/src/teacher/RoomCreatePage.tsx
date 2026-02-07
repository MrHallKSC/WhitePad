import { useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { createSignalRConnection } from '../services/signalr';
import { CreateRoomResponse } from '../shared/types/messages';

interface RoomCreatePageProps {
  onRoomCreated: (roomId: string, joinToken: string) => void;
}

function RoomCreatePage({ onRoomCreated }: RoomCreatePageProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    let connection: HubConnection | null = null;

    try {
      connection = createSignalRConnection('/hub/whiteboard');
      await connection.start();

      const response: CreateRoomResponse = await connection.invoke('CreateRoom');

      onRoomCreated(response.roomId, response.joinToken);
    } catch (err) {
      console.error('Failed to create room:', err);
      setError('Failed to create room. Please try again.');
      setIsCreating(false);

      if (connection) {
        await connection.stop();
      }
    }
  };

  return (
    <div className="create-room-container">
      <h1>WhitePad Teacher</h1>
      <button
        className="create-room-btn"
        onClick={handleCreateRoom}
        disabled={isCreating}
      >
        {isCreating ? 'Creating Room...' : 'Create Room'}
      </button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default RoomCreatePage;
