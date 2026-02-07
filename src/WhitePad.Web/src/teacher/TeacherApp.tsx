import { useState } from 'react';
import RoomCreatePage from './RoomCreatePage';
import RoomDashboard from './RoomDashboard';

function TeacherApp() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinToken, setJoinToken] = useState<string | null>(null);

  if (!roomId || !joinToken) {
    return <RoomCreatePage onRoomCreated={(id, token) => {
      setRoomId(id);
      setJoinToken(token);
    }} />;
  }

  return <RoomDashboard roomId={roomId} joinToken={joinToken} />;
}

export default TeacherApp;
