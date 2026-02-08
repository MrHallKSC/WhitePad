import { useState } from 'react';
import RoomCreatePage from './RoomCreatePage';
import RoomDashboard from './RoomDashboard';

type TeacherSession = {
  roomId: string;
  roomName: string;
  joinToken: string;
  joinUrl: string;
};

function TeacherApp() {
  const [session, setSession] = useState<TeacherSession | null>(null);

  if (!session) {
    return <RoomCreatePage onRoomCreated={(id, name, token, url) => {
      setSession({
        roomId: id,
        roomName: name,
        joinToken: token,
        joinUrl: url,
      });
    }} />;
  }

  return (
    <RoomDashboard
      roomId={session.roomId}
      roomName={session.roomName}
      joinToken={session.joinToken}
      joinUrl={session.joinUrl}
    />
  );
}

export default TeacherApp;
