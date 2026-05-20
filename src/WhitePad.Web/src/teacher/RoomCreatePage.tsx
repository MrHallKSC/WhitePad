import { useState } from 'react';
import { HubConnection } from '@microsoft/signalr';
import { createSignalRConnection } from '../services/signalr';
import { CreateRoomResponse } from '../shared/types/messages';
import Modal from '../shared/components/Modal';
import { HubMethods } from '../shared/constants/hubContract';
import { storeTeacherToken } from './teacherTokenStore';

interface RoomCreatePageProps {
  onRoomCreated: (roomId: string, roomName: string, joinToken: string, joinUrl: string) => void;
}

function RoomCreatePage({ onRoomCreated }: RoomCreatePageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [useLocalhostJoinUrl, setUseLocalhostJoinUrl] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setRoomName('');
    setError(null);
  };

  const handleCloseModal = () => {
    if (!isCreating) {
      setIsModalOpen(false);
      setRoomName('');
      setError(null);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    setIsCreating(true);
    setError(null);

    let connection: HubConnection | null = null;

    try {
      connection = createSignalRConnection('/hub/whiteboard');
      await connection.start();

      let response: CreateRoomResponse;
      try {
        response = await connection.invoke(
          HubMethods.CreateRoom,
          roomName.trim(),
          useLocalhostJoinUrl
        );
      } catch (err) {
        // Backward-compatible fallback for older backend that only accepts one CreateRoom argument.
        response = await connection.invoke(HubMethods.CreateRoom, roomName.trim());
      }

      let joinUrl = response.joinUrl;
      if (import.meta.env.DEV) {
        const parsed = new URL(joinUrl);
        joinUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
      } else if (useLocalhostJoinUrl) {
        const parsed = new URL(joinUrl);
        parsed.hostname = 'localhost';
        joinUrl = parsed.toString();
      }

      if (!response.teacherToken) {
        throw new Error('Server did not issue a teacher token; aborting.');
      }
      storeTeacherToken(response.roomId, response.teacherToken);

      onRoomCreated(response.roomId, response.roomName, response.joinToken, joinUrl);
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
    <>
      <div className="create-room-container">
        <h1>WhitePad Teacher</h1>
        <div className="create-room-toggle">
          <label className="checkbox-label" htmlFor="testingMode">
            <input
              id="testingMode"
              type="checkbox"
              checked={useLocalhostJoinUrl}
              onChange={(e) => setUseLocalhostJoinUrl(e.target.checked)}
              disabled={isCreating}
            />
            <span className="checkbox-text">
              Testing mode (use localhost URL)
              <span className="checkbox-hint">Off = local network IP URL</span>
            </span>
          </label>
        </div>
        <button
          type="button"
          className="create-room-btn"
          onClick={handleOpenModal}
        >
          Create Room
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Create New Room">
        <form onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label htmlFor="roomName">Room Name</label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Math Class - Period 3"
              disabled={isCreating}
              autoFocus
              maxLength={100}
            />
            <p className="form-hint">This name will be shown to students and on the projector</p>
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={handleCloseModal}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={isCreating || !roomName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default RoomCreatePage;
