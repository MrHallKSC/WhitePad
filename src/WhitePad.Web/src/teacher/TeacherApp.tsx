import { useState } from 'react';
import RoomCreatePage from './RoomCreatePage';
import RoomDashboard from './RoomDashboard';

function TeacherApp() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  if (!roomId || !roomName || !joinToken || !joinUrl) {
    return <RoomCreatePage onRoomCreated={(id, name, token, url) => {
      setRoomId(id);
      setRoomName(name);
      setJoinToken(token);
      setJoinUrl(url);
    }} />;
  }

  return <RoomDashboard roomId={roomId} roomName={roomName} joinToken={joinToken} joinUrl={joinUrl} />;
}

export default TeacherApp;
