export interface RoomSettings {
  isLocked: boolean;
  isFrozen: boolean;
  maxStudents: number;
}

export interface Room {
  roomId: string;
  joinToken: string;
  settings: RoomSettings;
  createdAt: Date;
}
