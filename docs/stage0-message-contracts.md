# WhitePad Message Contracts (SignalR Events)

This document defines all TypeScript/C# interface definitions for SignalR messages used in WhitePad.

## Overview

SignalR communication is bidirectional:
- **Client → Server**: Student/teacher invoke hub methods
- **Server → Client**: Server invokes client methods (callbacks)

All messages are strongly typed using TypeScript interfaces (client) and C# classes (server).

---

## 1. Connection and Presence Events

### JoinRoomRequest (Client → Server)

**Student sends this when joining a room.**

```typescript
interface JoinRoomRequest {
  roomId: string;        // GUID of the room
  joinToken: string;     // Short-lived token from QR code
}
```

**C# Equivalent:**
```csharp
public class JoinRoomRequest
{
    public string RoomId { get; set; }
    public string JoinToken { get; set; }
}
```

**Hub Method:**
```csharp
public async Task<JoinRoomResponse> JoinRoomAsStudent(JoinRoomRequest request)
```

---

### JoinRoomResponse (Server → Client)

**Server responds to student join request.**

```typescript
interface JoinRoomResponse {
  success: boolean;
  studentId?: string;          // Unique ID for this student (if success)
  displayName?: string;        // Auto-generated name: "Student 1", "Student 2", etc.
  roomSettings?: RoomSettings; // Current room state (locked, frozen, etc.)
  error?: string;              // Error message (if success = false)
}

interface RoomSettings {
  isLocked: boolean;   // Is writing disabled?
  isFrozen: boolean;   // Is streaming disabled?
  maxStudents: number; // Room capacity (default 28)
}
```

**C# Equivalent:**
```csharp
public class JoinRoomResponse
{
    public bool Success { get; set; }
    public string? StudentId { get; set; }
    public string? DisplayName { get; set; }
    public RoomSettings? RoomSettings { get; set; }
    public string? Error { get; set; }
}

public class RoomSettings
{
    public bool IsLocked { get; set; }
    public bool IsFrozen { get; set; }
    public int MaxStudents { get; set; } = 28;
}
```

**Possible Errors:**
- `"Invalid or expired join token"`
- `"Room not found"`
- `"Room is full (max 28 students)"`

---

### JoinRoomAsTeacherRequest (Client → Server)

**Teacher joins an existing room (after creation).**

```typescript
interface JoinRoomAsTeacherRequest {
  roomId: string;         // GUID of the room
  teacherAccessKey?: string; // Optional: shared secret for MVP (before SSO)
}
```

**C# Equivalent:**
```csharp
public class JoinRoomAsTeacherRequest
{
    public string RoomId { get; set; }
    public string? TeacherAccessKey { get; set; }
}
```

**Hub Method:**
```csharp
public async Task JoinRoomAsTeacher(JoinRoomAsTeacherRequest request)
```

---

### ParticipantJoined (Server → Teacher)

**Server notifies teacher when a student joins.**

```typescript
interface ParticipantJoined {
  studentId: string;
  displayName: string;      // "Student 1", "Student 2", etc.
  connectedAt: string;      // ISO 8601 timestamp
  inputMode: 'draw' | 'type'; // Default: 'draw'
}
```

**C# Equivalent:**
```csharp
public class ParticipantJoined
{
    public string StudentId { get; set; }
    public string DisplayName { get; set; }
    public DateTime ConnectedAt { get; set; }
    public string InputMode { get; set; } = "draw";
}
```

**Client Handler (Teacher):**
```typescript
connection.on('ParticipantJoined', (participant: ParticipantJoined) => {
  // Add new student tile to grid
});
```

---

### ParticipantLeft (Server → Teacher)

**Server notifies teacher when a student disconnects.**

```typescript
interface ParticipantLeft {
  studentId: string;
  reason: 'disconnect' | 'kick' | 'roomEnded';
  leftAt: string; // ISO 8601 timestamp
}
```

**C# Equivalent:**
```csharp
public class ParticipantLeft
{
    public string StudentId { get; set; }
    public string Reason { get; set; } // "disconnect", "kick", "roomEnded"
    public DateTime LeftAt { get; set; }
}
```

**Client Handler (Teacher):**
```typescript
connection.on('ParticipantLeft', (info: ParticipantLeft) => {
  // Remove student tile or grey it out
});
```

---

### Heartbeat (Client ⇄ Server, Optional)

**Periodic ping to keep connection alive (optional, SignalR has built-in heartbeat).**

```typescript
interface Heartbeat {
  timestamp: string; // ISO 8601 timestamp
}
```

**C# Equivalent:**
```csharp
public class Heartbeat
{
    public DateTime Timestamp { get; set; }
}
```

---

## 2. Stroke Events (Drawing Mode)

### StrokeBatch (Student → Server → Teacher)

**Student sends batched stroke points (every 50ms while drawing).**

```typescript
interface StrokeBatch {
  studentId: string;       // Included by server (not sent by client)
  strokeId: string;        // Unique ID for this stroke (GUID)
  points: StrokePoint[];   // Array of points
  color: string;           // Hex color (e.g., "#000000" for black)
  lineWidth: number;       // Pen width (e.g., 2.0)
  isComplete: boolean;     // True when stroke ends (pen up)
}

interface StrokePoint {
  x: number;       // Normalized coordinate (0-1), relative to canvas width
  y: number;       // Normalized coordinate (0-1), relative to canvas height
  pressure: number; // Apple Pencil pressure (0-1), default 0.5 if not available
  timestamp?: number; // Optional: milliseconds since stroke start (for interpolation)
}
```

**C# Equivalent:**
```csharp
public class StrokeBatch
{
    public string StudentId { get; set; }  // Set by server
    public string StrokeId { get; set; }
    public List<StrokePoint> Points { get; set; }
    public string Color { get; set; }
    public double LineWidth { get; set; }
    public bool IsComplete { get; set; }
}

public class StrokePoint
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Pressure { get; set; }
    public int? Timestamp { get; set; }
}
```

**Hub Method (Student → Server):**
```csharp
public async Task SendStrokeBatch(StrokeBatch batch)
```

**Client Handler (Teacher):**
```typescript
connection.on('ReceiveStrokeBatch', (batch: StrokeBatch) => {
  // Render stroke points on the student's tile canvas
});
```

**Notes:**
- **Normalized coordinates**: `x` and `y` are 0-1 (screen-independent). Client multiplies by canvas dimensions to get pixel coordinates.
- **Batching**: Client accumulates points for 50ms, then sends in one message. This reduces bandwidth (instead of sending each point individually).
- **Pressure**: Used by Perfect Freehand to vary line thickness.

---

### ClearBoard (Server → Student)

**Teacher commands a student to clear their board.**

```typescript
interface ClearBoard {
  studentId?: string; // If specified, clear only this student; if null, clear all
}
```

**C# Equivalent:**
```csharp
public class ClearBoard
{
    public string? StudentId { get; set; }
}
```

**Client Handler (Student):**
```typescript
connection.on('ClearBoard', () => {
  // Clear the canvas or text area
});
```

---

## 3. Text Input Events (Type Mode)

### TextUpdate (Student → Server → Teacher)

**Student sends text content (debounced every 500ms while typing).**

```typescript
interface TextUpdate {
  studentId: string;    // Included by server (not sent by client)
  text: string;         // Current text content (full content, not delta)
  charCount: number;    // Optional: character count
  updatedAt: string;    // ISO 8601 timestamp
}
```

**C# Equivalent:**
```csharp
public class TextUpdate
{
    public string StudentId { get; set; }
    public string Text { get; set; }
    public int CharCount { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

**Hub Method (Student → Server):**
```csharp
public async Task SendTextUpdate(TextUpdate update)
```

**Client Handler (Teacher):**
```typescript
connection.on('ReceiveTextUpdate', (update: TextUpdate) => {
  // Render text in the student's tile (replace canvas with text preview)
});
```

**Notes:**
- Text is **debounced** (sent max every 500ms) to reduce message frequency.
- Text is **full content**, not incremental (easier to handle reconnections).
- Teacher sees the text rendered in the student's tile (not editable, just display).

---

## 4. Teacher Commands (Teacher → Server → Students)

### SetLock (Teacher → Server → Students)

**Lock or unlock writing for all students.**

```typescript
interface SetLock {
  isLocked: boolean;
}
```

**C# Equivalent:**
```csharp
public class SetLock
{
    public bool IsLocked { get; set; }
}
```

**Hub Method (Teacher → Server):**
```csharp
public async Task SetLock(bool isLocked)
```

**Client Handler (Student):**
```typescript
connection.on('RoomLocked', (isLocked: boolean) => {
  // Disable/enable input (drawing and typing)
  // Show "Locked by teacher" overlay if true
});
```

---

### SetFreeze (Teacher → Server → Students)

**Freeze or unfreeze room (stops streaming AND input).**

```typescript
interface SetFreeze {
  isFrozen: boolean;
}
```

**C# Equivalent:**
```csharp
public class SetFreeze
{
    public bool IsFrozen { get; set; }
}
```

**Hub Method (Teacher → Server):**
```csharp
public async Task SetFreeze(bool isFrozen)
```

**Client Handler (Student):**
```typescript
connection.on('RoomFrozen', (isFrozen: boolean) => {
  // Stop sending strokes/text updates
  // Disable input
  // Show "Frozen" overlay if true
});
```

---

### ClearAll (Teacher → Server → Students)

**Clear all student boards.**

```typescript
// No payload needed
```

**Hub Method (Teacher → Server):**
```csharp
public async Task ClearAll()
```

**Client Handler (Student):**
```typescript
connection.on('ClearBoard', () => {
  // Clear canvas or text area
});
```

---

### ClearOne (Teacher → Server → Specific Student)

**Clear a specific student's board.**

```typescript
interface ClearOne {
  studentId: string;
}
```

**C# Equivalent:**
```csharp
public class ClearOne
{
    public string StudentId { get; set; }
}
```

**Hub Method (Teacher → Server):**
```csharp
public async Task ClearOne(string studentId)
```

**Client Handler (Student):**
```typescript
connection.on('ClearBoard', () => {
  // Clear canvas or text area (only received by targeted student)
});
```

---

### KickParticipant (Teacher → Server → Specific Student)

**Disconnect a specific student.**

```typescript
interface KickParticipant {
  studentId: string;
  reason?: string; // Optional: reason for kick (e.g., "inappropriate content")
}
```

**C# Equivalent:**
```csharp
public class KickParticipant
{
    public string StudentId { get; set; }
    public string? Reason { get; set; }
}
```

**Hub Method (Teacher → Server):**
```csharp
public async Task KickParticipant(string studentId, string? reason = null)
```

**Client Handler (Student):**
```typescript
connection.on('Kicked', (reason: string) => {
  // Show "Disconnected by teacher: {reason}" message
  // Close SignalR connection
  // Disable rejoin with current token
});
```

---

### RotateJoinToken (Teacher → Server)

**Invalidate current join token and generate a new one.**

```typescript
// No payload needed (teacher initiates)
```

**Hub Method (Teacher → Server):**
```csharp
public async Task RotateJoinToken()
```

**Response (Server → Teacher):**
```typescript
interface JoinTokenRotated {
  newJoinToken: string; // New token for QR code
  joinUrl: string;      // Full URL with new token
}
```

**C# Equivalent:**
```csharp
public class JoinTokenRotated
{
    public string NewJoinToken { get; set; }
    public string JoinUrl { get; set; }
}
```

**Client Handler (Teacher):**
```typescript
connection.on('JoinTokenRotated', (data: JoinTokenRotated) => {
  // Regenerate QR code with new URL
});
```

**Effect on Students:**
- Currently connected students: NOT disconnected (can continue)
- New join attempts with old token: REJECTED

---

## 5. Room Management (Teacher Only)

### CreateRoomRequest (Teacher → Server)

**Teacher creates a new room.**

```typescript
interface CreateRoomRequest {
  teacherAccessKey?: string; // Optional: shared secret for MVP (before SSO)
  maxStudents?: number;      // Default: 28
}
```

**C# Equivalent:**
```csharp
public class CreateRoomRequest
{
    public string? TeacherAccessKey { get; set; }
    public int MaxStudents { get; set; } = 28;
}
```

**Hub Method (Teacher → Server):**
```csharp
public async Task<CreateRoomResponse> CreateRoom(CreateRoomRequest request)
```

---

### CreateRoomResponse (Server → Teacher)

**Server responds with room details.**

```typescript
interface CreateRoomResponse {
  roomId: string;       // Unique room ID (GUID)
  joinToken: string;    // Short token for QR code
  joinUrl: string;      // Full URL: https://server/join?room=xxx&token=yyy
  createdAt: string;    // ISO 8601 timestamp
  expiresAt: string;    // ISO 8601 timestamp (4 hours from creation)
}
```

**C# Equivalent:**
```csharp
public class CreateRoomResponse
{
    public string RoomId { get; set; }
    public string JoinToken { get; set; }
    public string JoinUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}
```

---

### EndRoom (Teacher → Server)

**Teacher manually ends the room (disconnects all students, deletes data).**

```typescript
// No payload needed
```

**Hub Method (Teacher → Server):**
```csharp
public async Task EndRoom()
```

**Effect:**
- All students receive `RoomEnded` event and are disconnected
- Room data is deleted from server memory
- Teacher is redirected to room creation page

**Client Handler (Student):**
```typescript
connection.on('RoomEnded', () => {
  // Show "Room ended by teacher" message
  // Close connection
});
```

---

## 6. State Sync Events

### RequestBoardState (Server → Student)

**Server requests current board state from student (on reconnect or teacher refresh).**

```typescript
// No payload (sent to specific student)
```

**Client Handler (Student):**
```typescript
connection.on('RequestBoardState', async () => {
  // Collect current strokes or text
  // Send BoardStateSnapshot back to server
  await connection.invoke('SendBoardState', snapshot);
});
```

---

### BoardStateSnapshot (Student → Server → Teacher)

**Student sends current board state (strokes or text).**

```typescript
interface BoardStateSnapshot {
  studentId: string;         // Included by server
  inputMode: 'draw' | 'type';
  strokes?: StrokeBatch[];   // If inputMode = 'draw'
  text?: string;             // If inputMode = 'type'
  capturedAt: string;        // ISO 8601 timestamp
}
```

**C# Equivalent:**
```csharp
public class BoardStateSnapshot
{
    public string StudentId { get; set; }
    public string InputMode { get; set; }
    public List<StrokeBatch>? Strokes { get; set; }
    public string? Text { get; set; }
    public DateTime CapturedAt { get; set; }
}
```

**Hub Method (Student → Server):**
```csharp
public async Task SendBoardState(BoardStateSnapshot snapshot)
```

**Client Handler (Teacher):**
```typescript
connection.on('ReceiveBoardState', (snapshot: BoardStateSnapshot) => {
  // Restore student tile with snapshot data
});
```

---

## 7. Input Mode Toggle (Student Only)

### SetInputMode (Student → Server → Teacher)

**Student switches between draw and type modes.**

```typescript
interface SetInputMode {
  inputMode: 'draw' | 'type';
}
```

**C# Equivalent:**
```csharp
public class SetInputMode
{
    public string InputMode { get; set; } // "draw" or "type"
}
```

**Hub Method (Student → Server):**
```csharp
public async Task SetInputMode(string inputMode)
```

**Client Handler (Teacher):**
```typescript
connection.on('StudentInputModeChanged', (data: { studentId: string, inputMode: 'draw' | 'type' }) => {
  // Update tile UI to show ✏️ or ⌨️ icon
  // Clear previous content (strokes or text)
});
```

---

## 8. Error Handling

### ErrorMessage (Server → Client)

**Server sends error messages to clients.**

```typescript
interface ErrorMessage {
  code: string;          // Error code (e.g., "RATE_LIMIT_EXCEEDED")
  message: string;       // Human-readable error message
  severity: 'warning' | 'error' | 'fatal';
}
```

**C# Equivalent:**
```csharp
public class ErrorMessage
{
    public string Code { get; set; }
    public string Message { get; set; }
    public string Severity { get; set; } // "warning", "error", "fatal"
}
```

**Client Handler:**
```typescript
connection.on('Error', (error: ErrorMessage) => {
  if (error.severity === 'fatal') {
    // Disconnect and show error
  } else {
    // Show warning toast
  }
});
```

**Common Error Codes:**
- `RATE_LIMIT_EXCEEDED`: Student sending too many messages (>100/sec)
- `INVALID_TOKEN`: Join token is invalid or expired
- `ROOM_FULL`: Room has reached max capacity (28 students)
- `ROOM_NOT_FOUND`: Room ID does not exist
- `UNAUTHORIZED`: Teacher access key is invalid

---

## 9. Connection State Events (SignalR Built-In)

SignalR provides built-in connection state events. These are **not** custom messages but are important to handle.

### onreconnecting

**Fired when connection is lost and SignalR is attempting to reconnect.**

```typescript
connection.onreconnecting((error) => {
  console.log('Connection lost, reconnecting...', error);
  // Show "Reconnecting..." indicator
});
```

### onreconnected

**Fired when connection is successfully re-established.**

```typescript
connection.onreconnected((connectionId) => {
  console.log('Reconnected:', connectionId);
  // Show "Connected" indicator
  // Request state sync (if needed)
});
```

### onclose

**Fired when connection is permanently closed.**

```typescript
connection.onclose((error) => {
  console.log('Connection closed:', error);
  // Show "Disconnected" error
  // Stop attempting to send messages
});
```

---

## 10. Message Flow Examples

### Example 1: Student Joins Room

1. Student scans QR code → opens `https://server/join?room=abc&token=xyz`
2. Student establishes SignalR connection
3. **Student → Server**: `JoinRoomAsStudent({ roomId: "abc", joinToken: "xyz" })`
4. Server validates token, creates student record
5. **Server → Student**: `JoinRoomResponse({ success: true, studentId: "123", displayName: "Student 1", roomSettings: { isLocked: false, isFrozen: false, maxStudents: 28 } })`
6. **Server → Teacher**: `ParticipantJoined({ studentId: "123", displayName: "Student 1", connectedAt: "2024-01-15T10:30:00Z", inputMode: "draw" })`

---

### Example 2: Student Draws on Canvas

1. Student draws with Apple Pencil
2. Client batches points for 50ms
3. **Student → Server**: `SendStrokeBatch({ strokeId: "stroke-1", points: [{ x: 0.5, y: 0.3, pressure: 0.7 }, ...], color: "#000000", lineWidth: 2, isComplete: false })`
4. Server validates points, adds `studentId`
5. **Server → Teacher**: `ReceiveStrokeBatch({ studentId: "123", strokeId: "stroke-1", points: [...], color: "#000000", lineWidth: 2, isComplete: false })`
6. Teacher renders points on student tile canvas

---

### Example 3: Teacher Locks Room

1. Teacher clicks "Lock" button
2. **Teacher → Server**: `SetLock(true)`
3. Server updates room settings
4. **Server → All Students**: `RoomLocked(true)`
5. Students disable drawing/typing input, show "Locked" overlay
6. **Server → Teacher**: (optional) `CommandAck({ command: "lock", success: true })`

---

### Example 4: Teacher Kicks Student

1. Teacher clicks "Kick" on student tile
2. **Teacher → Server**: `KickParticipant("123", "inappropriate content")`
3. **Server → Student 123**: `Kicked("inappropriate content")`
4. Student 123 shows error message, disconnects
5. **Server → Teacher**: `ParticipantLeft({ studentId: "123", reason: "kick", leftAt: "..." })`
6. Teacher removes student tile from grid

---

## 11. Validation Rules

### Stroke Points
- `x` must be in range [0, 1]
- `y` must be in range [0, 1]
- `pressure` must be in range [0, 1] (default 0.5 if missing)
- Invalid points are **dropped** (not rejected; just ignored)

### Rate Limiting
- Max **100 messages/sec** per student
- If exceeded:
  - **Warning** (first offense): `ErrorMessage({ code: "RATE_LIMIT_EXCEEDED", severity: "warning" })`
  - **Throttle** (second offense): Server drops messages
  - **Disconnect** (third offense): Student is kicked

### Join Token
- Must match room's current `joinToken`
- If token has been rotated, join is **rejected**
- Error: `"Invalid or expired join token"`

### Room Capacity
- Max 28 students per room (configurable via `maxStudents`)
- If full, join is **rejected**
- Error: `"Room is full (max 28 students)"`

---

## 12. Summary Table

| Event | Direction | Sender | Receiver | Purpose |
|-------|-----------|--------|----------|---------|
| `JoinRoomRequest` | Client → Server | Student | Server | Student joins room |
| `JoinRoomResponse` | Server → Client | Server | Student | Confirm join |
| `ParticipantJoined` | Server → Client | Server | Teacher | Notify new student |
| `ParticipantLeft` | Server → Client | Server | Teacher | Notify student left |
| `StrokeBatch` | Client → Server → Client | Student | Teacher | Stream drawing strokes |
| `TextUpdate` | Client → Server → Client | Student | Teacher | Stream typed text |
| `ClearBoard` | Server → Client | Server | Student(s) | Clear board command |
| `SetLock` | Client → Server → Client | Teacher | Students | Lock/unlock input |
| `SetFreeze` | Client → Server → Client | Teacher | Students | Freeze/unfreeze room |
| `KickParticipant` | Client → Server → Client | Teacher | Student | Disconnect student |
| `RotateJoinToken` | Client → Server | Teacher | Server | Generate new token |
| `CreateRoom` | Client → Server | Teacher | Server | Create new room |
| `EndRoom` | Client → Server → Client | Teacher | Students | End room |
| `RequestBoardState` | Server → Client | Server | Student | Request current state |
| `BoardStateSnapshot` | Client → Server → Client | Student | Teacher | Send current state |
| `SetInputMode` | Client → Server → Client | Student | Teacher | Toggle draw/type mode |
| `Error` | Server → Client | Server | Student/Teacher | Error notification |

---

## Next Steps

- ✅ Stage 0 complete: Message contracts defined
- **Stage 1**: Implement SignalR hub methods and client handlers
- **Stage 2**: Add stroke batching and text debouncing logic
- **Stage 3**: Implement all teacher commands and student responses
