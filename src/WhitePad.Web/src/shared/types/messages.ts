// TypeScript interfaces mirroring C# DTOs

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp?: number;
}

export interface StrokeBatch {
  studentId: string;
  strokeId: string;
  points: StrokePoint[];
  color: string;
  lineWidth: number;
  isComplete: boolean;
}

export interface JoinRoomRequest {
  roomId: string;
  joinToken: string;
  displayName?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  studentId?: string;
  displayName?: string;
  roomSettings?: RoomSettings;
  error?: string;
}

export interface RoomSettings {
  isLocked: boolean;
  isFrozen: boolean;
  maxStudents: number;
}

export interface CreateRoomResponse {
  roomId: string;
  joinToken: string;
  joinUrl: string;
  createdAt: string;
}

export interface ParticipantJoined {
  studentId: string;
  displayName: string;
  connectedAt: string;
  inputMode: string;
}

export interface ParticipantLeft {
  studentId: string;
  reason: string;
  leftAt: string;
}

export interface ConfidenceChanged {
  studentId: string;
  confidenceLevel: 'none' | 'red' | 'amber' | 'green';
}

export interface StrokeUndone {
  studentId: string;
  strokeId: string;
}

export interface BoardCleared {
  studentId: string;
}

export interface Student {
  studentId: string;
  displayName: string;
  connectionId?: string;
  connectedAt: string;
  inputMode: string;
  confidenceLevel?: 'none' | 'red' | 'amber' | 'green';
}
