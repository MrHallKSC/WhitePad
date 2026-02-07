# WhitePad - Real-Time Collaborative Whiteboard

## Project Overview

WhitePad is a web-based collaborative whiteboard system for classroom use. Students use iPads with Apple Pencil to draw/write answers, and teachers see live thumbnails of all student work on their dashboard.

**Primary Use Case**: Replace physical mini-whiteboards in classrooms with digital solution using school iPads.

**Technology Stack**:
- **Backend**: ASP.NET Core 8.0 with SignalR for real-time communication
- **Frontend**: React 18 with TypeScript, built with Vite
- **Deployment**: Kestrel (local dev/demo), eventually IIS on school Windows Server

---

## Current Status: Stage 1 ✅ COMPLETE

**What's Working**:
- ✅ Real-time drawing with <200ms latency
- ✅ Teacher creates rooms at `/teacher`
- ✅ Students join via URL at `/join?roomId=xxx&token=xxx`
- ✅ Multiple students can draw simultaneously
- ✅ Teacher dashboard shows live grid of student canvases (200x150px tiles)
- ✅ Basic presence (connect/disconnect)
- ✅ Stroke batching (50ms windows)
- ✅ Normalized coordinates (0-1 range for screen independence)

**Running the Application**:
```bash
# Terminal 1 - Backend
cd src/WhitePad.Server
dotnet run
# Runs at https://localhost:5001

# Terminal 2 - Frontend (development)
cd src/WhitePad.Web
npm install
npm run dev
# Runs at http://localhost:5173 (proxies to backend)
```

**Production Build** (serves frontend from backend):
```bash
cd src/WhitePad.Web
npm run build
# Outputs to ../WhitePad.Server/wwwroot/

cd ../WhitePad.Server
dotnet run
# Access at https://localhost:5001
```

---

## Next Stage: Stage 2 - Drawing Tools (LOCAL DEMO FEATURES)

**Goal**: Create a feature-rich local prototype to demonstrate to school before iPad testing.

**Features to Implement**:
- ✅ Color picker (8-12 colors: black, red, blue, green, orange, purple, brown, yellow)
- ✅ Pen thickness selector (thin, medium, thick, very thick, extra thick)
- ✅ Eraser tool (toggle between pen and eraser)
- ✅ Undo/redo (last 20 strokes)
- ✅ Clear board button (student-initiated, with confirmation)
- ✅ Compact toolbar UI (top or side of canvas)
- 🔄 **Confidence traffic light** (red/amber/green selector for formative assessment)

**New Feature: Confidence Traffic Light**
- Students can select their confidence level: 🔴 Red (struggling), 🟡 Amber (unsure), 🟢 Green (confident)
- Small colored circle appears in bottom-right of student tile on teacher dashboard
- Teacher dashboard shows confidence summary at top: total count per level (e.g., "🔴 3  🟡 8  🟢 12")
- Real-time updates via SignalR
- Helps teachers quickly identify students who need support

**Implementation Approach**:
1. Update `StrokeBatch` model to include `color` and `lineWidth` properties
2. Create toolbar component for student UI (`src/WhitePad.Web/src/student/Toolbar.tsx`)
3. Add state management for current tool/color/thickness in `DrawingPage.tsx`
4. Implement undo/redo stack (client-side, array of stroke IDs)
5. Update `StudentTile.tsx` to render strokes with color and thickness
6. Add SignalR messages for tool changes (optional, for teacher visibility)

---

## Architecture Summary

### Communication Flow
1. **Teacher creates room** → Server generates roomId + joinToken
2. **Student joins** → Validates token, adds to room, joins SignalR group `room:{roomId}:students`
3. **Student draws** → Points batched every 50ms → Sent to server via `SendStrokeBatch`
4. **Server broadcasts** → To SignalR group `room:{roomId}:teacher` only
5. **Teacher receives** → Updates corresponding student tile canvas

### Key Patterns

**Normalized Coordinates**:
- All stroke points stored as `{x: 0-1, y: 0-1, pressure: 0-1}`
- Converted to pixels when rendering: `x * canvas.width`, `y * canvas.height`
- Ensures strokes render correctly on different screen sizes

**SignalR Groups**:
- `room:{roomId}:teacher` - Teacher dashboard connection
- `room:{roomId}:students` - All students in room
- Allows targeted broadcasting (students → teacher only, not peer-to-peer)

**Stroke Batching**:
- Client accumulates points for 50ms before sending
- Reduces message frequency from ~60/sec to ~20/sec
- See `src/WhitePad.Web/src/shared/utils/strokeBatching.ts`

**Thread Safety**:
- Backend uses `ConcurrentDictionary<string, Room>` for room storage
- Student counter: `var studentNumber = ++room.StudentCounter;` (atomic)
- All room operations are thread-safe

---

## Project Structure

### Backend (`src/WhitePad.Server/`)
```
WhitePad.Server/
├── Program.cs                    # Entry point, Kestrel + SignalR setup
├── appsettings.json              # Configuration
├── Models/
│   ├── Room.cs                   # Room state with participants
│   ├── Student.cs                # Student participant info
│   ├── StrokePoint.cs            # Point with x, y, pressure (normalized 0-1)
│   ├── StrokeBatch.cs            # Batch of points for one stroke
│   ├── RoomSettings.cs           # isLocked, isFrozen, maxStudents
│   └── Messages/
│       ├── JoinRoomRequest.cs
│       ├── JoinRoomResponse.cs
│       ├── CreateRoomResponse.cs
│       ├── ParticipantJoined.cs
│       └── ParticipantLeft.cs
├── Services/
│   ├── ITokenGenerator.cs
│   ├── TokenGenerator.cs         # Generates room IDs and join tokens
│   ├── IRoomStateManager.cs
│   └── InMemoryRoomStateManager.cs # Thread-safe in-memory room storage
└── Hubs/
    ├── IWhiteboardClient.cs      # Strongly-typed client interface
    └── WhiteboardHub.cs          # SignalR hub (CreateRoom, JoinRoom, SendStrokeBatch)
```

### Frontend (`src/WhitePad.Web/`)
```
WhitePad.Web/
├── package.json                  # React 18, SignalR client, React Router
├── vite.config.ts                # Build to wwwroot/, proxy /hub to backend
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx                  # Entry point (React.StrictMode removed)
│   ├── App.tsx                   # Router (/teacher, /join)
│   ├── teacher/
│   │   ├── TeacherApp.tsx        # Teacher root component
│   │   ├── RoomCreatePage.tsx    # Create room button
│   │   ├── RoomDashboard.tsx     # Main dashboard with student grid
│   │   ├── StudentGrid.tsx       # Grid layout container
│   │   └── StudentTile.tsx       # Individual student canvas (200x150px)
│   ├── student/
│   │   ├── StudentApp.tsx        # Student root component
│   │   ├── JoinPage.tsx          # Loading state while joining
│   │   └── DrawingPage.tsx       # Canvas with pointer events
│   ├── services/
│   │   └── signalr.ts            # SignalR connection factory
│   ├── shared/
│   │   ├── types/
│   │   │   └── messages.ts       # TypeScript interfaces for SignalR messages
│   │   └── utils/
│   │       ├── strokeBatching.ts # Batches points every 50ms
│   │       └── coordinates.ts    # Normalized coordinate conversion
│   └── styles/
│       └── global.css            # Basic styling
```

---

## Key Files to Understand

### Backend

**`WhiteboardHub.cs`** - Core SignalR logic:
- `CreateRoom()` - Generates room ID and join token
- `JoinRoomAsTeacher(roomId)` - Teacher joins, adds to teacher group
- `JoinRoomAsStudent(roomId, joinToken)` - Validates token, adds student, broadcasts `ParticipantJoined`
- `SendStrokeBatch(batch)` - Receives stroke from student, sets StudentId server-side, broadcasts to teacher
- `OnDisconnectedAsync()` - Cleanup on disconnect

**`InMemoryRoomStateManager.cs`** - Thread-safe room state:
- `ConcurrentDictionary<string, Room>` for room storage
- Auto-increment student counter: `var studentNumber = ++room.StudentCounter;`
- `GetAllRoomsAsync()` returns all rooms for student lookup

### Frontend

**`DrawingPage.tsx`** - Student drawing canvas:
- Uses Pointer Events API (`onPointerDown`, `onPointerMove`, `onPointerUp`)
- Accumulates points in local state
- Uses `StrokeBatcher` to send batches every 50ms
- Converts pixel coordinates to normalized 0-1 range

**`StudentTile.tsx`** - Teacher view of one student:
- Listens to `ReceiveStrokeBatch` SignalR event
- Accumulates stroke batches in `strokesRef` Map
- **Critical**: Calculate `startIndex` BEFORE modifying existing batch
- **Critical**: Always call `beginPath()` before drawing
- For first batch: `moveTo(point[0])`, then `lineTo` from index 1
- For continuation: `moveTo(lastDrawnPoint)`, then `lineTo` new points

**`StudentApp.tsx`** - Student connection management:
- **Critical**: Use `useCallback` for `onJoined` to prevent infinite loops
- **Critical**: Use `useRef` for connection cleanup to avoid stale closures
- Proper cleanup in useEffect return function

**`JoinPage.tsx`** - Student join flow:
- **Critical**: Use `hasJoinedRef` to prevent duplicate join attempts
- Invokes `JoinRoomAsStudent` SignalR method
- Handles join errors

---

## React Patterns and Lessons Learned

### ✅ DO

1. **Stable Callback References**:
```typescript
const handleJoined = useCallback((id: string, name: string) => {
  setStudentId(id);
  setDisplayName(name);
}, []); // Empty deps, stable reference
```

2. **useRef for Cleanup**:
```typescript
const connectionRef = useRef<HubConnection | null>(null);

useEffect(() => {
  const conn = createConnection();
  connectionRef.current = conn; // Store in ref
  return () => {
    if (connectionRef.current) {
      connectionRef.current.stop(); // Use ref, not closure variable
    }
  };
}, []);
```

3. **Duplicate Action Guards**:
```typescript
const hasJoinedRef = useRef(false);

if (hasJoinedRef.current) return; // Prevent duplicate
hasJoinedRef.current = true;
// ... perform action
```

4. **Calculate Before Mutate**:
```typescript
// CORRECT: Calculate index before pushing
const startIndex = existingBatch ? existingBatch.points.length : 0;
existingBatch.points.push(...newPoints);

// WRONG: startIndex will be wrong
existingBatch.points.push(...newPoints);
const startIndex = existingBatch.points.length;
```

### ❌ DON'T

1. **Don't use React.StrictMode in development** - Causes intentional double-renders that break connection logic
2. **Don't trust closure variables for cleanup** - Use refs to avoid stale closures
3. **Don't forget beginPath()** - Canvas paths need fresh start for each batch
4. **Don't calculate indices after mutation** - Race conditions and wrong values

---

## Important Configuration

### Backend (`appsettings.Development.json`)
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.AspNetCore.SignalR": "Debug"
    }
  }
}
```

### Frontend (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../WhitePad.Server/wwwroot'
  },
  server: {
    proxy: {
      '/hub': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
});
```

---

## Known Issues Fixed in Stage 1

1. **Multiple students appearing** - Fixed by removing React.StrictMode and using useCallback/useRef
2. **Incomplete stroke rendering** - Fixed by calculating startIndex before mutation and always calling beginPath()
3. **Student not found errors** - Fixed by implementing GetAllRoomsAsync() properly
4. **Thread safety** - Fixed by using `++room.StudentCounter` instead of `Interlocked.Increment`

---

## Stage 2 Implementation Guide

### 1. Update Backend Models

**Add to `StrokeBatch.cs`**:
```csharp
public string Color { get; set; } = "#000000"; // Hex color
public double LineWidth { get; set; } = 2.0; // Thickness
```

**Add to `Student.cs`**:
```csharp
public string ConfidenceLevel { get; set; } = "none"; // "none", "red", "amber", "green"
```

**Create new message: `ConfidenceChanged.cs`**:
```csharp
public class ConfidenceChanged
{
    public string StudentId { get; set; } = string.Empty;
    public string ConfidenceLevel { get; set; } = "none"; // "red", "amber", "green"
}
```

### 2. Create Toolbar Component

**New file: `src/WhitePad.Web/src/student/Toolbar.tsx`**:
```typescript
interface ToolbarProps {
  currentColor: string;
  currentThickness: number;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onErase: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}
```

### 3. Update DrawingPage State

Add state for:
- `currentColor: string`
- `currentThickness: number`
- `isErasing: boolean`
- `strokeHistory: string[]` (stroke IDs)
- `undoneStrokes: string[]`

### 4. Update StrokeBatch Messages

Pass `color` and `lineWidth` when creating batches:
```typescript
const batch: StrokeBatch = {
  strokeId,
  studentId,
  points: batchedPoints,
  isComplete: false,
  color: currentColor,
  lineWidth: currentThickness
};
```

### 5. Update StudentTile Rendering

Use `batch.color` and `batch.lineWidth` when rendering:
```typescript
ctx.strokeStyle = batch.color;
ctx.lineWidth = batch.lineWidth;
```

### 6. Add Confidence Traffic Light Feature

**Update Toolbar component**:
- Add confidence level selector with 3 buttons (red, amber, green)
- Add `currentConfidence` state and `onConfidenceChange` callback prop

**Update DrawingPage**:
- Add `confidenceLevel` state (default: "none")
- Send confidence changes via SignalR: `connection.invoke('SetConfidence', confidenceLevel)`

**Update StudentTile**:
- Add confidence indicator (small colored circle) in bottom-right corner
- Use student.confidenceLevel to determine circle color

**Create ConfidenceSummary component** for teacher dashboard:
- Display at top of RoomDashboard
- Show count for each level: 🔴 Red: X, 🟡 Amber: Y, 🟢 Green: Z
- Calculate from students array

**Update WhiteboardHub**:
- Add `SetConfidence(string confidenceLevel)` method
- Update student's confidence level in room state
- Broadcast `ConfidenceChanged` message to teacher

---

## Testing Checklist

Before moving to next stage:
- [ ] Color picker changes stroke color
- [ ] Thickness selector changes stroke width
- [ ] Eraser removes strokes
- [ ] Undo removes last stroke
- [ ] Redo restores undone stroke
- [ ] Clear button clears board (with confirmation)
- [ ] All changes sync to teacher dashboard
- [ ] Multiple students with different colors work simultaneously
- [ ] No console errors
- [ ] Performance remains smooth (<200ms latency)

---

## Documentation

- **Full Project Plan**: `docs/WhitePad Project Plan.md`
- **Stage 1 Completion**: `docs/stage1-completion.md`
- **Architecture**: `docs/stage0-architecture.md`
- **Message Contracts**: `docs/stage0-message-contracts.md`
- **Wireframes**: `docs/stage0-wireframes.md`
- **Repo Structure**: `docs/stage0-repo-structure.md`

---

## Development Tips

1. **Hot Reload**: Frontend auto-reloads on save. Backend requires restart.
2. **Debugging**: Use browser DevTools for frontend, VS Code debugger for backend
3. **SignalR Logging**: Set `Microsoft.AspNetCore.SignalR` to `Debug` in appsettings
4. **HTTPS Certificate**: Trust dev cert with `dotnet dev-certs https --trust`
5. **Multiple Students**: Open multiple incognito tabs for testing

---

## Future Stages

- **Stage 3**: Shape tools (line, rectangle, triangle, circle, axes, grids)
- **Stage 4**: iPad testing with Apple Pencil
- **Stage 5**: Classroom controls (lock, freeze, clear, kick, spotlight)
- **Stage 6**: Scale testing (28 students, 10 rooms)
- **Stage 7-8**: IIS deployment to school server
- **Stage 9**: School pilot
- **Stage 10+**: Authentication, exports, advanced features

---

## Current Limitations (By Design)

- No QR codes yet (Stage 4)
- No teacher controls (Stage 5)
- No text input mode (Stage 5)
- Single color/thickness (fixing in Stage 2!)
- No persistence (rooms lost on restart)
- No authentication (anonymous join only)

---

## Contact / Notes

This is a learning project for school use. The MVP focuses on proving the concept locally before deploying to school infrastructure.

**Design Philosophy**:
- Local-first development
- Feature-complete demo before iPad testing
- Simple, robust architecture
- Progressive enhancement
