# WhitePad System Architecture

## Overview
WhitePad is a realtime web application that enables teachers to see live updates of student work on iPads. The system uses a client-server architecture with WebSocket-based communication for low-latency updates.

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         TEACHER DEVICE                          │
│                    (Windows Desktop/Laptop)                     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │          Teacher Web App (React + TypeScript)             │ │
│  │                                                           │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │ Room Create │  │ Student Grid │  │ Spotlight View  │ │ │
│  │  │    Page     │  │  (28 tiles)  │  │   (enlarged)    │ │ │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘ │ │
│  │                                                           │ │
│  │  Control Bar: [Lock] [Freeze] [Clear All] [End Room]    │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                             │                                   │
│                             │ HTTPS / WSS                       │
│                             │ (SignalR Client)                  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         WHITEPAD SERVER                         │
│                  (ASP.NET Core 8.0 + SignalR)                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    SignalR Hub                            │ │
│  │              (WhiteboardHub.cs)                           │ │
│  │                                                           │ │
│  │  - JoinRoom(roomId, token)                               │ │
│  │  - SendStrokeBatch(strokeData)                           │ │
│  │  - SendTextUpdate(text)                                  │ │
│  │  - ExecuteCommand(command, targetStudentId?)             │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                             │                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Room State Manager                       │ │
│  │              (In-Memory for MVP)                          │ │
│  │                                                           │ │
│  │  Dictionary<roomId, Room> {                              │ │
│  │    - participants: List<Student>                         │ │
│  │    - settings: { isLocked, isFrozen }                    │ │
│  │    - joinToken: string                                   │ │
│  │    - teacherSessionId: string                            │ │
│  │  }                                                        │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                             │                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Static File Server                       │ │
│  │           (Serves React build from wwwroot/)              │ │
│  │                                                           │ │
│  │  - /teacher  → teacher UI                                │ │
│  │  - /join     → student UI                                │ │
│  │  - /assets/* → React bundles, CSS, images                │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Deployment:                                                    │
│  - Stages 1-4: Kestrel standalone (https://localhost:5001)     │
│  - Stage 2+:   Bind to 0.0.0.0:5001 for iPad access            │
│  - Stage 5+:   Behind IIS reverse proxy (production)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTPS / WSS
                              │ (SignalR Client)
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                      STUDENT DEVICES (iPads)                    │
│                        (Safari, iPadOS 18)                      │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ Student 1  │  │ Student 2  │  │ Student 3  │  │   ...    │ │
│  │            │  │            │  │            │  │          │ │
│  │ ┌────────┐ │  │ ┌────────┐ │  │ ┌────────┐ │  │ ┌──────┐ │ │
│  │ │ Canvas │ │  │ │ Canvas │ │  │ │TextArea│ │  │ │Canvas│ │ │
│  │ │(Draw)  │ │  │ │(Draw)  │ │  │ │ (Type) │ │  │ │      │ │ │
│  │ └────────┘ │  │ └────────┘ │  │ └────────┘ │  │ └──────┘ │ │
│  │            │  │            │  │            │  │          │ │
│  │ [✏️ Draw]  │  │ [✏️ Draw]  │  │ [⌨️ Type]  │  │ [✏️ Draw]│ │
│  │ Status: ✓  │  │ Status: ✓  │  │ Status: ✓  │  │Status: ✓ │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
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
2. Clicks "Create Room" → server generates room ID and join token
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

// Student → Teacher
Task SendStrokeBatch(StrokeBatch batch);
Task SendTextUpdate(TextUpdate update);

// Teacher → Students
Task SetLock(bool isLocked);
Task SetFreeze(bool isFrozen);
Task ClearAll();
Task ClearOne(string studentId);
Task KickParticipant(string studentId);
Task RotateJoinToken();

// State sync
Task RequestBoardState();  // Teacher → Server → Student
Task SendBoardState(BoardStateSnapshot snapshot);  // Student → Server → Teacher
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
- **Production (Stage 5+)**: IIS reverse proxy → Kestrel

---

## Network Flow

### Student Joins Room

```
[Student iPad] ─────(1)─────> [Server]
   "Scan QR code"            Validate token
                             Generate studentId

[Student iPad] <────(2)───── [Server]
   JoinRoomResponse          Add to room
   { studentId }

[Server] ──────(3)──────> [Teacher]
   ParticipantJoined
   { studentId, displayName }
```

### Student Draws (Stroke Streaming)

```
[Student iPad] ─────(1)─────> [Server]
   StrokeBatch (every 50ms)  Validate points
   { points[], strokeId }    Rate limit check

[Server] ──────(2)──────> [Teacher]
   StrokeBatch              Update grid tile
   { studentId, points[] }
```

### Teacher Sends Command (e.g., Lock Room)

```
[Teacher] ─────(1)─────> [Server]
   SetLock(true)          Update room.settings.isLocked

[Server] ──────(2)──────> [All Students in Room]
   RoomLocked             Disable input
   { isLocked: true }     Show overlay

[Server] ──────(3)──────> [Teacher]
   CommandAck             Confirm command executed
   { command: "lock" }
```

### Teacher Reconnects (State Sync)

```
[Teacher] ─────(1)─────> [Server]
   Reconnect to room      Invalidate old teacherSessionId
                          Generate new teacherSessionId

[Server] ──────(2)──────> [All Students]
   RequestBoardState      Send current board data

[Students] ────(3)─────> [Server]
   BoardStateSnapshot     Aggregate snapshots
   { strokes[] / text }

[Server] ──────(4)──────> [Teacher]
   BoardStateSnapshot[]   Restore grid view
   (one per student)
```

---

## Deployment Models

### Model 1: Local Development (Stages 1-2)

```
┌────────────────────────────────────────────┐
│       Developer PC (Windows)               │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │   Kestrel (ASP.NET Core)             │ │
│  │   https://localhost:5001             │ │
│  │                                      │ │
│  │   - SignalR Hub                      │ │
│  │   - Static files (wwwroot/)          │ │
│  │   - In-memory room state             │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Accessed by:                              │
│  - Teacher: https://localhost:5001/teacher │
│  - Students: https://localhost:5001/join   │
│    (same machine, multiple browser tabs)   │
│                                            │
└────────────────────────────────────────────┘
```

**Certificate**: .NET dev certificate (self-signed, trusted on localhost)

---

### Model 2: Home Wi-Fi Testing (Stage 2)

```
┌────────────────────────────────────────────┐
│       Developer PC (Windows)               │
│       Local IP: 192.168.1.100              │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │   Kestrel (ASP.NET Core)             │ │
│  │   https://0.0.0.0:5001               │ │
│  │   (bind to all interfaces)           │ │
│  │                                      │ │
│  │   - SignalR Hub                      │ │
│  │   - Static files (wwwroot/)          │ │
│  │   - In-memory room state             │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Windows Firewall:                         │
│  - Allow inbound TCP 5001                  │
│                                            │
└────────────────────────────────────────────┘
                  │
                  │ Home Wi-Fi Network
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
   ┌─────────┐       ┌─────────┐
   │ iPad 1  │       │ iPad 2  │
   │ (Safari)│       │ (Safari)│
   └─────────┘       └─────────┘

   URL: https://192.168.1.100:5001/join?room=xxx&token=yyy
   Certificate: Self-signed (manual accept warning)
```

**Certificate**: .NET dev certificate (self-signed, iPads show warning, manually accept once)

---

### Model 3: Production IIS Deployment (Stage 6+)

```
┌───────────────────────────────────────────────────────────┐
│               School Windows Server 2016+                 │
│               Hostname: whiteboard.school.local           │
│               IP: 10.50.100.10 (internal)                 │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                    IIS 10+                          │ │
│  │              (Reverse Proxy)                        │ │
│  │                                                     │ │
│  │  - HTTPS Termination (port 443)                    │ │
│  │  - TLS Certificate (internal CA)                   │ │
│  │  - URL Rewrite / ARR                               │ │
│  │                                                     │ │
│  │  Forwards to:                                      │ │
│  │  http://localhost:5000 (Kestrel)                   │ │
│  └─────────────────────────────────────────────────────┘ │
│                         │                                 │
│                         ▼                                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │   ASP.NET Core (Kestrel)                            │ │
│  │   http://localhost:5000                             │ │
│  │                                                     │ │
│  │   - SignalR Hub                                     │ │
│  │   - Static files                                    │ │
│  │   - In-memory room state (MVP)                      │ │
│  │   - Application logs                                │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└───────────────────────────────────────────────────────────┘
                          │
                          │ School Network (VLANs)
           ┌──────────────┴──────────────┐
           │                             │
           ▼                             ▼
  ┌────────────────┐            ┌────────────────┐
  │  Staff VLAN    │            │ Student VLAN   │
  │  (Teachers)    │            │  (iPads)       │
  │                │            │                │
  │  Firewall:     │            │  Firewall:     │
  │  Allow 443 →   │            │  Allow 443 →   │
  │  10.50.100.10  │            │  10.50.100.10  │
  └────────────────┘            └────────────────┘

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
- **Transport fallback**: WebSocket → SSE → Long Polling (compatibility)
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

- ✅ Stage 0 complete: Architecture defined
- **Stage 1**: Implement basic SignalR hub + React drawing canvas (localhost only)
- **Stage 2**: Add QR codes, test on iPads (home Wi-Fi)
- **Stage 3**: Add teacher controls (lock, freeze, clear, kick) + text input mode
- **Stage 4**: Optimize performance, load testing (28 students)
- **Stage 5**: Package for IIS deployment, create IT documentation
- **Stage 6**: Deploy to school server, pilot in classroom
