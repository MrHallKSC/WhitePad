// TypeScript interfaces mirroring C# DTOs
import type { RoomSettings } from './room';

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

export interface JoinRoomResponse {
  success: boolean;
  studentId?: string;
  displayName?: string;
  roomSettings?: RoomSettings;
  isLocked?: boolean;
  waitingRoomEnabled?: boolean;
  waitingRoomUnlocked?: boolean;
  currentQuestion?: string | null;
  error?: string;
}

export interface CreateRoomResponse {
  roomId: string;
  roomName: string;
  joinToken: string;
  joinUrl: string;
  createdAt: string;
}

export interface ParticipantJoined {
  studentId: string;
  displayName: string;
  connectedAt: string;
  inputMode: string;
  hasAnswered?: boolean;
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

export interface StudentLocked {
  studentId: string;
  isLocked: boolean;
}

export interface WaitingRoomStateChanged {
  waitingRoomEnabled: boolean;
  waitingRoomUnlocked: boolean;
}

export interface QuestionChanged {
  question: string | null;
}

export interface AnsweredChanged {
  studentId: string;
  hasAnswered: boolean;
}

export interface Student {
  studentId: string;
  displayName: string;
  connectionId?: string;
  connectedAt: string;
  inputMode: string;
  confidenceLevel?: 'none' | 'red' | 'amber' | 'green';
  isLocked?: boolean;
  hasAnswered?: boolean;
}

export interface Shape {
  shapeId: string;
  studentId: string;
  type: 'line' | 'rectangle' | 'circle' | 'arrow' | 'axesL' | 'axesCross';
  points: StrokePoint[];
  color: string;
  lineWidth: number;
  isComplete: boolean;
}

export type ShapeDrawn = Shape;
