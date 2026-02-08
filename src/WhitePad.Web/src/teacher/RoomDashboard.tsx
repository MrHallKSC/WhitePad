import { useState } from 'react';
import JoinMode from './JoinMode';
import ViewerMode from './ViewerMode';
import { useTeacherRoomConnection } from './hooks/useTeacherRoomConnection';

interface RoomDashboardProps {
  roomId: string;
  roomName: string;
  joinToken: string;
  joinUrl: string;
}

type ViewMode = 'join' | 'viewer';

function RoomDashboard({ roomId, roomName, joinToken, joinUrl }: RoomDashboardProps) {
  const { connection, students, error, actions } = useTeacherRoomConnection(roomId);
  const [viewMode, setViewMode] = useState<ViewMode>('join');
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(true);

  const handleWaitingRoomToggle = async (enabled: boolean) => {
    setWaitingRoomEnabled(enabled);
    await actions.setWaitingRoomEnabled(enabled);
  };

  const handleSwitchToViewer = async () => {
    // If waiting room was enabled, unlock the waiting room when entering viewer mode
    if (waitingRoomEnabled) {
      await actions.unlockWaitingRoom();
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
      <div style={{ display: viewMode === 'join' ? 'block' : 'none', flex: 1, minHeight: 0 }}>
        <JoinMode
          roomName={roomName}
          joinToken={joinToken}
          joinUrl={joinUrl}
          students={students}
          waitingRoomEnabled={waitingRoomEnabled}
          onWaitingRoomToggle={handleWaitingRoomToggle}
          onSwitchToViewer={handleSwitchToViewer}
        />
      </div>
      <div style={{ display: viewMode === 'viewer' ? 'block' : 'none', flex: 1, minHeight: 0 }}>
        <ViewerMode
          roomName={roomName}
          roomId={roomId}
          students={students}
          connection={connection}
          onSwitchToJoin={() => setViewMode('join')}
        />
      </div>
    </div>
  );
}

export default RoomDashboard;
