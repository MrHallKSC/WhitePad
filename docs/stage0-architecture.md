# WhitePad System Architecture

## Overview
WhitePad is a realtime web application that enables teachers to see live updates of student work on iPads. The system uses a client-server architecture with WebSocket-based communication for low-latency updates.

## High-Level Architecture Diagram

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         TEACHER DEVICE                          â”‚
â”‚                    (Windows Desktop/Laptop)                     â”‚
â”‚                                                                 â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚          Teacher Web App (React + TypeScript)             â”‚ â”‚
â”‚  â”‚                                                           â”‚ â”‚
â”‚  â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚ â”‚
â”‚  â”‚  â”‚ Room Create â”‚  â”‚ Student Grid â”‚  â”‚ Spotlight View  â”‚ â”‚ â”‚
â”‚  â”‚  â”‚    Page     â”‚  â”‚  (28 tiles)  â”‚  â”‚   (enlarged)    â”‚ â”‚ â”‚
â”‚  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚ â”‚
â”‚  â”‚                                                           â”‚ â”‚
â”‚  â”‚  Control Bar: [Lock] [Freeze] [Clear All] [End Room]    â”‚ â”‚
â”‚  â”‚                                                           â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                             â”‚                                   â”‚
â”‚                             â”‚ HTTPS / WSS                       â”‚
â”‚                             â”‚ (SignalR Client)                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚
                              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         WHITEPAD SERVER                         â”‚
â”‚                  (ASP.NET Core 8.0 + SignalR)                   â”‚
â”‚                                                                 â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚                    SignalR Hub                            â”‚ â”‚
â”‚  â”‚              (WhiteboardHub.cs)                           â”‚ â”‚
â”‚  â”‚                                                           â”‚ â”‚
â”‚  â”‚  - JoinRoom(roomId, token)                               â”‚ â”‚
â”‚  â”‚  - SendStrokeBatch(strokeData)                           â”‚ â”‚
â”‚  â”‚  - SendTextUpdate(text)                                  â”‚ â”‚
â”‚  â”‚  - ExecuteCommand(command, targetStudentId?)             â”‚ â”‚
â”‚  â”‚                                                           â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                             â”‚                                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚                  Room State Manager                       â”‚ â”‚
â”‚  â”‚              (In-Memory for MVP)                          â”‚ â”‚
â”‚  â”‚                                                           â”‚ â”‚
â”‚  â”‚  Dictionary<roomId, Room> {                              â”‚ â”‚
â”‚  â”‚    - participants: List<Student>                         â”‚ â”‚
â”‚  â”‚    - settings: { isLocked, isFrozen }                    â”‚ â”‚
â”‚  â”‚    - joinToken: string                                   â”‚ â”‚
â”‚  â”‚    - teacherSessionId: string                            â”‚ â”‚
â”‚  â”‚  }                                                        â”‚ â”‚
â”‚  â”‚                                                           â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                             â”‚                                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚                  Static File Server                       â”‚ â”‚
â”‚  â”‚           (Serves React build from wwwroot/)              â”‚ â”‚
â”‚  â”‚                                                           â”‚ â”‚
â”‚  â”‚  - /teacher  â†’ teacher UI                                â”‚ â”‚
â”‚  â”‚  - /join     â†’ student UI                                â”‚ â”‚
â”‚  â”‚  - /assets/* â†’ React bundles, CSS, images                â”‚ â”‚
â”‚  â”‚                                                           â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                                                 â”‚
â”‚  Deployment:                                                    â”‚
â”‚  - Stages 1-4: Kestrel standalone (https://localhost:5001)     â”‚
â”‚  - Stage 4:   Bind to 0.0.0.0:5001 for iPad access            â”‚
â”‚  - Stage 7+:   Behind IIS reverse proxy (production)           â”‚
â”‚                                                                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â–²
                              â”‚ HTTPS / WSS
                              â”‚ (SignalR Client)
                              â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                      STUDENT DEVICES (iPads)                    â”‚
â”‚                        (Safari, iPadOS 18)                      â”‚
â”‚                                                                 â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚ Student 1  â”‚  â”‚ Student 2  â”‚  â”‚ Student 3  â”‚  â”‚   ...    â”‚ â”‚
â”‚  â”‚            â”‚  â”‚            â”‚  â”‚            â”‚  â”‚          â”‚ â”‚
â”‚  â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”‚  â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”‚  â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”‚  â”‚ â”Œâ”€â”€â”€â”€â”€â”€â” â”‚ â”‚
â”‚  â”‚ â”‚ Canvas â”‚ â”‚  â”‚ â”‚ Canvas â”‚ â”‚  â”‚ â”‚TextAreaâ”‚ â”‚  â”‚ â”‚Canvasâ”‚ â”‚ â”‚
â”‚  â”‚ â”‚(Draw)  â”‚ â”‚  â”‚ â”‚(Draw)  â”‚ â”‚  â”‚ â”‚ (Type) â”‚ â”‚  â”‚ â”‚      â”‚ â”‚ â”‚
â”‚  â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚  â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚  â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚  â”‚ â””â”€â”€â”€â”€â”€â”€â”˜ â”‚ â”‚
â”‚  â”‚            â”‚  â”‚            â”‚  â”‚            â”‚  â”‚          â”‚ â”‚
â”‚  â”‚ [âœï¸ Draw]  â”‚  â”‚ [âœï¸ Draw]  â”‚  â”‚ [âŒ¨ï¸ Type]  â”‚  â”‚ [âœï¸ Draw]â”‚ â”‚
â”‚  â”‚ Status: âœ“  â”‚  â”‚ Status: âœ“  â”‚  â”‚ Status: âœ“  â”‚  â”‚Status: âœ“ â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                                                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Component Descriptions

### 1. Student Web App (React + TypeScript)

**Location**: `src/WhitePad.Web/src/student/`

**Responsibilities**:
- Join a room via QR code scan or manual link entry
- Render drawing canvas OR text input area (user-selectable)
- Capture pointer events (Apple Pencil + touch) with pressure sensitivity
- Stream stroke data or text updates to server via SignalR
- Receive and execute teacher commands (lock, freeze, clear, kick)
- Display connection status and command overlays

**Key Technologies**:
- React 18 (UI framework)
- TypeScript (type safety)
- Perfect Freehand (smooth stroke rendering)
- @microsoft/signalr (realtime client)
- Pointer Events API (Apple Pencil support)

**Communication Flow**:
1. Student opens `https://server/join?room=xxx&token=yyy`
2. Establishes SignalR connection to server
3. Sends `JoinRoomRequest` with room ID and token
4. Receives `JoinRoomResponse` with student ID
5. Streams `StrokeBatch` or `TextUpdate` messages while drawing/typing
6. Listens for command messages (`SetLock`, `SetFreeze`, `ClearBoard`, etc.)

---

### 2. Teacher Web App (React + TypeScript)

**Location**: `src/WhitePad.Web/src/teacher/`

**Responsibilities**:
- Create rooms and generate QR codes
- Display real-time grid of student tiles (up to 28)
- Render live updates of student boards (draw or type mode)
- Send commands to students (lock, freeze, clear, kick, rotate token)
- Spotlight individual students (enlarged view)
- Rename student tiles (local display only)

**Key Technologies**:
- React 18 (UI framework)
- TypeScript (type safety)
- @microsoft/signalr (realtime client)
- qrcode.react (QR code generation)
- Offscreen Canvas API (thumbnail rendering optimization)

**Communication Flow**:
1. Teacher opens `https://server/teacher`
2. Clicks "Create Room" â†’ server generates room ID and join token
3. Establishes SignalR connection as teacher for this room
4. Receives `ParticipantJoined` and `ParticipantLeft` events
5. Receives `StrokeBatch` or `TextUpdate` from each student
6. Sends command messages (`SetLock`, `ClearAll`, `KickParticipant`, etc.)
7. Receives `BoardStateSnapshot` on reconnect or refresh

---

### 3. SignalR Hub (ASP.NET Core)

**Location**: `src/WhitePad.Server/Hubs/WhiteboardHub.cs`

**Responsibilities**:
- Manage SignalR connections (students and teachers)
- Route messages between students and teacher within a room
- Validate join tokens and enforce room capacity (max 28 students)
- Maintain room state (participants, settings, board data)
- Handle disconnections and reconnections
- Implement rate limiting (max 100 messages/sec per student)

**Key Methods**:
```csharp
// Connection
Task<JoinRoomResponse> JoinRoomAsStudent(string roomId, string joinToken);
Task JoinRoomAsTeacher(string roomId);

// Student â†’ Teacher
Task SendStrokeBatch(StrokeBatch batch);
Task SendTextUpdate(TextUpdate update);

// Teacher â†’ Students
Task SetLock(bool isLocked);
Task SetFreeze(bool isFrozen);
Task ClearAll();
Task ClearOne(string studentId);
Task KickParticipant(string studentId);
Task RotateJoinToken();

// State sync
Task RequestBoardState();  // Teacher â†’ Server â†’ Student
Task SendBoardState(BoardStateSnapshot snapshot);  // Student â†’ Server â†’ Teacher
```

**SignalR Groups**:
- Each room is a SignalR group: `room:{roomId}`
- Teacher joins: `room:{roomId}:teacher`
- Students join: `room:{roomId}`
- Allows targeted broadcasting (teacher-only vs all students)

---

### 4. Room State Manager (In-Memory Service)

**Location**: `src/WhitePad.Server/Services/RoomStateManager.cs`

**Responsibilities**:
- Store and manage room data (in-memory for MVP)
- Generate unique room IDs (GUID) and join tokens
- Track participants (students and teacher)
- Enforce room rules (capacity, token validity)
- Auto-expire rooms after 4 hours of inactivity
- Handle teacher reconnects (last connection wins)

**Data Structure**:
```csharp
public class Room
{
    public string RoomId { get; set; }
    public string JoinToken { get; set; }
    public string TeacherSessionId { get; set; }
    public List<Student> Participants { get; set; }
    public RoomSettings Settings { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivityAt { get; set; }
}

public class Student
{
    public string StudentId { get; set; }
    public string DisplayName { get; set; }  // "Student 1", "Student 2", etc.
    public string ConnectionId { get; set; }
    public string InputMode { get; set; }  // "draw" or "type"
    public DateTime ConnectedAt { get; set; }
    public DateTime LastSeenAt { get; set; }
}

public class RoomSettings
{
    public bool IsLocked { get; set; }
    public bool IsFrozen { get; set; }
    public int MaxStudents { get; set; } = 28;
}
```

**Future Enhancement**: Replace in-memory storage with Redis or SQL Server for:
- Multi-server deployment (load balancing)
- Persistence across server restarts
- Audit logging and retention

---

### 5. Static File Server (Kestrel / IIS)

**Location**: `src/WhitePad.Server/wwwroot/`

**Responsibilities**:
- Serve the React application (compiled build)
- Serve static assets (JS bundles, CSS, images, fonts)
- Route `/teacher` and `/join` to index.html (SPA routing)

**Deployment**:
- **Local (Stages 1-4)**: Kestrel serves files directly from `wwwroot/`
- **Production (Stage 7+)**: IIS reverse proxy â†’ Kestrel

---

## Network Flow

### Student Joins Room

```
[Student iPad] â”€â”€â”€â”€â”€(1)â”€â”€â”€â”€â”€> [Server]
   "Scan QR code"            Validate token
                             Generate studentId

[Student iPad] <â”€â”€â”€â”€(2)â”€â”€â”€â”€â”€ [Server]
   JoinRoomResponse          Add to room
   { studentId }

[Server] â”€â”€â”€â”€â”€â”€(3)â”€â”€â”€â”€â”€â”€> [Teacher]
   ParticipantJoined
   { studentId, displayName }
```

### Student Draws (Stroke Streaming)

```
[Student iPad] â”€â”€â”€â”€â”€(1)â”€â”€â”€â”€â”€> [Server]
   StrokeBatch (every 50ms)  Validate points
   { points[], strokeId }    Rate limit check

[Server] â”€â”€â”€â”€â”€â”€(2)â”€â”€â”€â”€â”€â”€> [Teacher]
   StrokeBatch              Update grid tile
   { studentId, points[] }
```

### Teacher Sends Command (e.g., Lock Room)

```
[Teacher] â”€â”€â”€â”€â”€(1)â”€â”€â”€â”€â”€> [Server]
   SetLock(true)          Update room.settings.isLocked

[Server] â”€â”€â”€â”€â”€â”€(2)â”€â”€â”€â”€â”€â”€> [All Students in Room]
   RoomLocked             Disable input
   { isLocked: true }     Show overlay

[Server] â”€â”€â”€â”€â”€â”€(3)â”€â”€â”€â”€â”€â”€> [Teacher]
   CommandAck             Confirm command executed
   { command: "lock" }
```

### Teacher Reconnects (State Sync)

```
[Teacher] â”€â”€â”€â”€â”€(1)â”€â”€â”€â”€â”€> [Server]
   Reconnect to room      Invalidate old teacherSessionId
                          Generate new teacherSessionId

[Server] â”€â”€â”€â”€â”€â”€(2)â”€â”€â”€â”€â”€â”€> [All Students]
   RequestBoardState      Send current board data

[Students] â”€â”€â”€â”€(3)â”€â”€â”€â”€â”€> [Server]
   BoardStateSnapshot     Aggregate snapshots
   { strokes[] / text }

[Server] â”€â”€â”€â”€â”€â”€(4)â”€â”€â”€â”€â”€â”€> [Teacher]
   BoardStateSnapshot[]   Restore grid view
   (one per student)
```

---

## Deployment Models

### Model 1: Local Development (Stages 1-3)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚       Developer PC (Windows)               â”‚
â”‚                                            â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   Kestrel (ASP.NET Core)             â”‚ â”‚
â”‚  â”‚   https://localhost:5001             â”‚ â”‚
â”‚  â”‚                                      â”‚ â”‚
â”‚  â”‚   - SignalR Hub                      â”‚ â”‚
â”‚  â”‚   - Static files (wwwroot/)          â”‚ â”‚
â”‚  â”‚   - In-memory room state             â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                            â”‚
â”‚  Accessed by:                              â”‚
â”‚  - Teacher: https://localhost:5001/teacher â”‚
â”‚  - Students: https://localhost:5001/join   â”‚
â”‚    (same machine, multiple browser tabs)   â”‚
â”‚                                            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Certificate**: .NET dev certificate (self-signed, trusted on localhost)

---

### Model 2: Home Wi-Fi Testing (Stage 4)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚       Developer PC (Windows)               â”‚
â”‚       Local IP: 192.168.1.100              â”‚
â”‚                                            â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   Kestrel (ASP.NET Core)             â”‚ â”‚
â”‚  â”‚   https://0.0.0.0:5001               â”‚ â”‚
â”‚  â”‚   (bind to all interfaces)           â”‚ â”‚
â”‚  â”‚                                      â”‚ â”‚
â”‚  â”‚   - SignalR Hub                      â”‚ â”‚
â”‚  â”‚   - Static files (wwwroot/)          â”‚ â”‚
â”‚  â”‚   - In-memory room state             â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                            â”‚
â”‚  Windows Firewall:                         â”‚
â”‚  - Allow inbound TCP 5001                  â”‚
â”‚                                            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â”‚
                  â”‚ Home Wi-Fi Network
                  â”‚
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
         â”‚                 â”‚
         â–¼                 â–¼
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚ iPad 1  â”‚       â”‚ iPad 2  â”‚
   â”‚ (Safari)â”‚       â”‚ (Safari)â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

   URL: https://192.168.1.100:5001/join?room=xxx&token=yyy
   Certificate: Self-signed (manual accept warning)
```

**Certificate**: .NET dev certificate (self-signed, iPads show warning, manually accept once)

---

### Model 3: Production IIS Deployment (Stage 7+)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚               School Windows Server 2016+                 â”‚
â”‚               Hostname: whiteboard.school.local           â”‚
â”‚               IP: 10.50.100.10 (internal)                 â”‚
â”‚                                                           â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚                    IIS 10+                          â”‚ â”‚
â”‚  â”‚              (Reverse Proxy)                        â”‚ â”‚
â”‚  â”‚                                                     â”‚ â”‚
â”‚  â”‚  - HTTPS Termination (port 443)                    â”‚ â”‚
â”‚  â”‚  - TLS Certificate (internal CA)                   â”‚ â”‚
â”‚  â”‚  - URL Rewrite / ARR                               â”‚ â”‚
â”‚  â”‚                                                     â”‚ â”‚
â”‚  â”‚  Forwards to:                                      â”‚ â”‚
â”‚  â”‚  http://localhost:5000 (Kestrel)                   â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                         â”‚                                 â”‚
â”‚                         â–¼                                 â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   ASP.NET Core (Kestrel)                            â”‚ â”‚
â”‚  â”‚   http://localhost:5000                             â”‚ â”‚
â”‚  â”‚                                                     â”‚ â”‚
â”‚  â”‚   - SignalR Hub                                     â”‚ â”‚
â”‚  â”‚   - Static files                                    â”‚ â”‚
â”‚  â”‚   - In-memory room state (MVP)                      â”‚ â”‚
â”‚  â”‚   - Application logs                                â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                                           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                          â”‚
                          â”‚ School Network (VLANs)
           â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
           â”‚                             â”‚
           â–¼                             â–¼
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”            â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Staff VLAN    â”‚            â”‚ Student VLAN   â”‚
  â”‚  (Teachers)    â”‚            â”‚  (iPads)       â”‚
  â”‚                â”‚            â”‚                â”‚
  â”‚  Firewall:     â”‚            â”‚  Firewall:     â”‚
  â”‚  Allow 443 â†’   â”‚            â”‚  Allow 443 â†’   â”‚
  â”‚  10.50.100.10  â”‚            â”‚  10.50.100.10  â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

URL: https://whiteboard.school.local/join?room=xxx&token=yyy
Certificate: Trusted (school internal CA, pre-installed on iPads)
```

**Certificate**: School internal CA (trusted by all school devices)

**IIS Configuration**:
- Application Pool: "No Managed Code", AlwaysRunning, Idle Timeout = 0
- URL Rewrite: Forward all requests to Kestrel (localhost:5000)
- WebSocket support: Enabled (required for SignalR)

---

## Security Considerations

### MVP (Stages 1-6)
- **Anonymous student join**: No login required, token-based access
- **Join tokens**: Short-lived, regeneratable by teacher (rotation)
- **Teacher access**: Protected by shared "teacher access key" (query param or header)
- **HTTPS only**: Encrypted transport (TLS 1.2+)
- **Rate limiting**: Max 100 messages/sec per student (prevent spam/abuse)
- **Input validation**: Stroke points must be in range [0, 1], drop invalid data
- **No persistence**: Rooms deleted on expiration or server restart (no data retention risk)

### Future (Stage 8+)
- **Teacher SSO**: Microsoft 365 / Entra ID login (MSAL)
- **Student SSO**: Optional M365 login (with anonymous fallback)
- **Role-based access**: Teachers can only see their own rooms
- **Audit logging**: Track room creation, commands, kicks
- **Data retention policies**: Configurable (30 days, 90 days, etc.)

---

## Performance Optimization Strategies

### Client-Side (Student)
- **Batching**: Accumulate stroke points for 50ms, send in one SignalR message
- **Decimation**: Drop redundant points in fast strokes (only keep significant changes)
- **Debouncing**: Text updates sent max every 500ms while typing
- **Reconnection**: Exponential backoff (5 attempts), queue messages offline, replay on reconnect

### Client-Side (Teacher)
- **Offscreen canvas**: Each student tile renders to its own offscreen canvas
- **Frame limiting**: Max 30 fps updates per tile (use requestAnimationFrame)
- **Virtual scrolling**: Pause updates for tiles scrolled out of view
- **Lazy rendering**: Only re-render tiles that received new data

### Server-Side
- **SignalR groups**: Efficient broadcasting (teacher-only group vs all-students group)
- **Rate limiting**: Throttle or disconnect students exceeding 100 msg/sec
- **Connection pooling**: Reuse SignalR connections (automatic)
- **Memory management**: Auto-delete expired rooms (background task every 10 minutes)

---

## Scalability Considerations

### MVP (In-Memory State)
- **Capacity**: Single server, 10 rooms, 280 concurrent students (28 per room)
- **Limitations**:
  - State lost on server restart
  - Cannot scale horizontally (no shared state)
  - Suitable for pilot phase only

### Future (Distributed State)
- **Redis backplane**: Share room state across multiple servers
- **Load balancer**: Distribute SignalR connections across servers
- **Database**: Persist room data, strokes (optional), audit logs
- **Blob storage**: Save board snapshots for export feature (Stage 9)

**Estimated Capacity (Future)**:
- 3 servers behind load balancer
- 30 rooms, 840 concurrent students
- Horizontal scaling by adding servers

---

## Technology Justification

### Why ASP.NET Core + SignalR?
- **IIS integration**: School already runs IIS, seamless deployment
- **Built-in reconnection**: Automatic handling of dropped connections
- **Transport fallback**: WebSocket â†’ SSE â†’ Long Polling (compatibility)
- **Typed messages**: C# strong typing reduces bugs
- **Microsoft ecosystem**: Aligns with school's M365 environment

### Why React + TypeScript?
- **Component model**: Reusable UI components (tiles, canvas, controls)
- **State management**: Complex realtime state (rooms, students, strokes, commands)
- **Type safety**: TypeScript catches bugs at compile time
- **Performance**: Virtual DOM, efficient re-renders
- **Ecosystem**: Large community, libraries (qrcode.react, Perfect Freehand)

### Why Perfect Freehand?
- **Purpose-built**: Designed for stylus/pen input
- **Pressure sensitivity**: Uses Apple Pencil pressure data
- **Smooth rendering**: Beautiful, natural-looking strokes
- **Lightweight**: Small bundle size (~10 KB)
- **Easy serialization**: Stroke data is JSON-compatible

---

## Next Steps

- âœ… Stage 0-3 complete: Architecture, MVP, drawing tools, shapes, and toolbar redesign delivered
- **Stage 4 (in progress)**: iPad testing at home (QR codes, Apple Pencil, LAN setup, touch-optimized tools)
- **Stage 5**: Advanced classroom controls and text input mode
- **Stage 6**: Scale testing and optimization (28 students, 10 rooms)
- **Stage 7**: Package for IIS deployment, create IT documentation
- **Stage 8**: Deploy to school server, pilot in classroom

Note: This is a Stage 0 document. For the authoritative roadmap, see `docs/WhitePad Project Plan.md`.



