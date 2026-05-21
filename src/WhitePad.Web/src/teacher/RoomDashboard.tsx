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
  const { connection, students, boards, error } = useTeacherRoomConnection(roomId);
  const [viewMode, setViewMode] = useState<ViewMode>('join');

  if (error) {
    return (
      <div className="dashboard-container">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {viewMode === 'join' && (
        <JoinMode
          roomName={roomName}
          joinToken={joinToken}
          joinUrl={joinUrl}
          students={students}
          onSwitchToViewer={() => setViewMode('viewer')}
        />
      )}
      {viewMode === 'viewer' && (
        <ViewerMode
          roomName={roomName}
          roomId={roomId}
          joinUrl={joinUrl}
          students={students}
          boards={boards}
          connection={connection}
          onSwitchToJoin={() => setViewMode('join')}
        />
      )}
    </div>
  );
}

export default RoomDashboard;
