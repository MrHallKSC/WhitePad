# WhitePad: Live Mini-Whiteboards Web App
Project Plan and Specification (Updated)

## 1. Purpose
Build a web-based system that replaces physical mini whiteboards with stylus input on iPads. Students join a teacher-led room via QR code. The teacher dashboard shows live thumbnails of each student's writing and provides moderation controls.

**Primary goal**: Deliver a working MVP you can test at home (server on one machine, iPads on home Wi-Fi), then deploy on-prem on a school IIS-hosted server for in-school use.

---

## 2. Target Users and Devices

### Students
- **Device**: School iPad (Safari)
- **Input**: Apple Pencil (stylus) + finger (optional) OR text input
- **Access**: Join via QR code and URL
- **OS**: iPadOS 18 (excellent Pointer Events support, pressure sensitivity)

### Teachers
- **Device**: Windows desktop/laptop (Chrome/Edge)
- **Optional**: iPad teacher use later (same web UI)
- **Use case**: Run "rooms" for classes, see live work, control flow (lock/freeze/clear/spotlight)

---

## 3. Constraints and Assumptions

- **Typical room size**: 28 students
- **Scale target**: 10 simultaneous rooms (not necessarily at full activity all the time)
- **Network**: School Wi-Fi likely has client isolation (students cannot directly access teacher devices or other student devices)
- **Data**: Keep on the school network for production
- **Authentication**:
  - MVP: Anonymous join (no account)
  - Later: Microsoft school accounts (Entra ID / M365 login)
- **Hosting**:
  - **Local demo and MVP testing** (Stages 1-6): Run server locally on Windows machine using Kestrel standalone (.exe)
  - **Production** (Stage 8+): Deploy to on-prem Windows Server behind IIS reverse proxy
- **Development approach**: Local-first, validate with home iPads, then deploy to school infrastructure

---

## 3.5. Development Environment Setup

### Required Software
- **Visual Studio 2022** (Community Edition) OR **Visual Studio Code**
- **.NET 8 SDK** (LTS version)
- **Node.js 20+** (for React frontend build tooling)
- **Git** (version control)

### Local HTTPS Setup
```bash
# Trust the .NET development certificate
dotnet dev-certs https --trust
```
This creates a certificate for `localhost`. For iPad testing, iPads will see a "Not Secure" warning when connecting to your PC's local IP - students will need to manually accept the certificate warning once.

### Network Configuration for iPad Testing (Stage 2)
1. Ensure **Windows Firewall** allows inbound connections on port 5001
2. Find your PC's local IP address: `ipconfig` (look for IPv4, e.g., 192.168.1.x)
3. iPads must be on the **same Wi-Fi network** as your development PC
4. Update Kestrel configuration to bind to all network interfaces:
```json
{
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://0.0.0.0:5001"
      }
    }
  }
}
```

---

## 4. High-Level Architecture

### Components
1. **Student Web App**
   - Canvas-based drawing surface OR text input area
   - Joins a room via QR code / link
   - Streams stroke events or text updates to the server
   - Receives room commands (lock, freeze, clear, kick)

2. **Teacher Web App**
   - Creates and manages rooms
   - Displays join QR code and join link
   - Shows a grid of live thumbnails (one per student)
   - Controls: lock/unlock, freeze/unfreeze, clear all, clear individual, kick, rotate join token, spotlight a student

3. **Realtime Server (on-prem / local)**
   - Manages rooms, presence, commands
   - Relays student stroke/text events to teacher dashboard
   - Maintains current "board state" in memory (MVP)
   - Provides basic APIs for room creation and session management

### Networking Implications (Client Isolation)
- Students never connect to teacher devices
- Both student iPads and teacher browsers connect only to a **central server**
- **Production requirement**: Student Wi-Fi must reach the server on **HTTPS (TCP 443)**
- If student Wi-Fi cannot reach internal servers, you will need an IT change: whitelist the server (hostname/IP + port)

---

## 4.5. Technology Stack

### Backend
- **ASP.NET Core 8.0** (LTS version, cross-platform)
- **SignalR** for WebSocket/long-polling realtime communication
  - Native IIS integration
  - Built-in reconnection handling
  - Automatic transport fallback (WebSocket → SSE → Long Polling)
  - Excellent for room/group management
- **In-memory state** for MVP (Dictionary<roomId, Room>)
  - Future: Redis or SQL Server for multi-server or persistence

### Frontend
- **React 18** with **TypeScript** (type safety for complex state management)
- **Vite** for fast development and optimized production builds
- **Perfect Freehand** library for smooth, pressure-sensitive Apple Pencil strokes
- **@microsoft/signalr** client library (official SignalR JavaScript client)
- **qrcode.react** for QR code generation

### Deployment
- **Stages 1-6**: Kestrel standalone (self-contained .exe on Windows dev PC) - includes feature-complete local demo
- **Stage 7**: Package for IIS deployment
- **Stage 8+**: Behind IIS reverse proxy (production school server)

### Development Tools
- **Visual Studio 2022** or **VS Code** with C# extension
- **Node.js 20+** for frontend tooling (Vite, npm)
- **.NET 8 SDK**
- **Browser DevTools** (Chrome/Edge for debugging, Safari Web Inspector for iPad debugging)

---

## 5. Data Model Overview (Conceptual)

### Room
- `roomId` (unique identifier, GUID)
- `teacherSessionId` (server-side identity for the teacher connection)
- `joinToken` (short-lived token embedded in QR code, regeneratable)
- `createdAt`, `expiresAt` (auto-expire after 4 hours of inactivity)
- `roomSettings`
  - `isLocked` (bool)
  - `isFrozen` (bool)
  - `maxStudents` (default 28, configurable)

### Student Participant
- `studentId` (server-generated GUID, stable for the session)
- `displayName` (auto-generated: "Student 1", "Student 2", etc.; teacher can rename)
- `connectedAt`, `lastSeenAt`
- `inputMode` ("draw" or "type")
- `boardState` (current strokes OR text content)

### Stroke Event (Vector-Based)
- A stroke is a series of points between "pen down" and "pen up"
- Each point includes:
  - `x`, `y` coordinates (**normalized 0-1** for screen independence)
  - `pressure` (0-1, from Apple Pencil)
  - `timestamp` (optional, for interpolation)
- Events:
  - `StrokeStart`
  - `StrokePoints` (batched, sent every 50ms)
  - `StrokeEnd`

### Text Event
- `TextUpdate` (debounced every 500ms while typing)
  - `studentId`
  - `text` (current text content)

### Board Commands (Teacher → Students)
- `lock`/`unlock` writing (disables both drawing and typing)
- `freeze`/`unfreeze` streaming (stops updates, disables input)
- `clear` board (all students or specific student)
- `kick` student (disconnect and invalidate their session)
- `rotateJoinToken` (invalidate current QR, generate new one)

---

## 6. Non-Functional Requirements

### Performance
- Teacher sees updates within **~200 ms** on a normal LAN
- System remains responsive with:
  - 28 active students in one room
  - 10 rooms concurrently
- Stroke streaming uses **batching** (50ms windows) and **rate limiting** to avoid Wi-Fi spikes

### Reliability
- Automatic reconnect if a student iPad drops briefly (up to 5 attempts, exponential backoff)
- Teacher dashboard can request a "state sync" after reconnect
- Server-side stroke validation (drop invalid points, enforce rate limits)

### Privacy and Retention
- **MVP**: No stored personal data; optional display names only
- **Production**: Keep data on school servers; default retention is "none" unless export/storage is later enabled
- Room data deleted when room expires (4 hours inactivity) or teacher manually ends room

### Security
- Join tokens expire and can be rotated by teacher
- Teacher session protected by teacher access key or authentication (Stage 10+)
- All traffic over HTTPS in production
- Rate limiting: Max 100 messages/sec per student (prevents abuse)

### Accessibility and Usability
- Clear "you are connected" status on student and teacher views
- Teacher controls are obvious and fast to access
- **Text input alternative** for students who cannot use stylus (Stage 3)
- Keyboard shortcuts for teacher (lock, freeze, clear)

---

## 7. User Stories and Acceptance Criteria

### Teacher

1. **Create room**
   - Can start a new room from the teacher UI
   - Teacher UI shows a QR code and join link
   - **Acceptance**: Scanning the QR on iPad opens the join page and joins the correct room

2. **See student thumbnails live**
   - Teacher sees one tile per connected student
   - Tiles update while students write (draw or type)
   - **Acceptance**: Writing on an iPad updates the matching tile within ~200 ms on home Wi-Fi

3. **Spotlight a student**
   - Teacher clicks a tile to open a larger view
   - **Acceptance**: Spotlight view shows the full board and continues updating

4. **Lock/unlock**
   - Teacher can lock writing (disables both drawing and typing)
   - **Acceptance**: Student cannot draw or type while locked; unlock restores input

5. **Freeze/unfreeze**
   - Teacher can freeze room (stops streaming AND disables input)
   - **Acceptance**: Freeze stops live updates and disables student input; unfreeze resumes both

6. **Clear all / clear individual**
   - Teacher can clear the whole room or one student
   - **Acceptance**: Board clears immediately on student device and teacher view

7. **Kick + rotate join token**
   - Teacher can remove a participant and refresh the join QR/token
   - **Acceptance**: Kicked user is disconnected and cannot rejoin using the old QR

### Student

1. **Join room**
   - Student scans QR and joins without typing anything (MVP)
   - **Acceptance**: Student sees a drawing board or text input and "Connected" indicator

2. **Write with Apple Pencil**
   - Pen input draws smoothly with pressure sensitivity
   - **Acceptance**: Lines appear without lag; pressure affects thickness

3. **Type answer (alternative mode)**
   - Student can toggle to text input mode
   - **Acceptance**: Typed text appears in teacher's view of that student's tile

4. **Respond to teacher commands**
   - Lock/freeze/clear apply quickly
   - **Acceptance**: Commands take effect in under 1 second

---

## 8. Product Stages (Progress Plan)

Each stage includes: goals, deliverables, and "done" criteria.

### Stage 0 — Project Setup and Decisions (COMPLETE)
**Goals**
- Lock the MVP scope and architecture
- Decide the front-end and back-end approach
- Define message shapes for strokes and commands
- Set up project structure

**Deliverables**
- ✅ Updated project plan (this document)
- ✅ Repo structure created
- ✅ Architecture documentation (`docs/stage0-architecture.md`)
- ✅ Message/event spec (`docs/stage0-message-contracts.md`)
- ✅ UI wireframes (`docs/stage0-wireframes.md`)
- ✅ Repo structure plan (`docs/stage0-repo-structure.md`)

**Done criteria**
- You can explain the system in one diagram and list the events
- Project folders are ready for Stage 1 implementation

---

### Stage 1 — Local Windows Machine MVP (Browser-Only) ✅ COMPLETE
**Goals**
- Prove the realtime room concept on a single development machine
- Run ASP.NET Core standalone (Kestrel), no IIS required
- Teacher and simulated students all on localhost

**Scope**
- Self-contained .NET console app that hosts:
  - SignalR hub for realtime messaging
  - Static file serving for React frontend
  - HTTPS via dev certificate
- Teacher UI:
  - Create room button
  - Show join link (no QR yet)
  - Grid of connected student tiles
- Student UI:
  - Join via link (room ID in URL)
  - Draw on canvas with pointer events
- Basic presence:
  - Student connects/disconnects updates tile list
- Realtime:
  - Strokes stream from student tabs to teacher grid using SignalR

**Deliverables**
- ✅ Single Visual Studio solution:
  - `WhitePad.Server` (ASP.NET Core + SignalR)
  - `WhitePad.Web` (React frontend, built and served by Server)
- ✅ Run with `dotnet run` or F5 in Visual Studio
- ✅ Teacher opens `https://localhost:5001/teacher`
- ✅ Student tabs open `https://localhost:5001/join?room=xxx`

**Done criteria**
- ✅ You can run the app, open 1 teacher tab and 5-10 student tabs in Chrome
- ✅ Drawing in student tabs appears in teacher grid within 200ms
- ✅ All basic SignalR events working (join, disconnect, stroke streaming)

**Completion Notes**
- Successfully tested with multiple student tabs
- Fixed React double-render issues (removed StrictMode)
- Fixed stroke rendering bug (startIndex calculation and canvas path continuation)
- Real-time stroke streaming working reliably with <200ms latency
- Basic presence management working (connect/disconnect)

---

### Stage 2 — Drawing Tools and Enhancements (Local Demo Features)
**Goals**
- Add essential drawing tools for classroom use
- Create a feature-rich local prototype to demonstrate to school
- Improve student drawing experience with color and thickness options
- Add undo/redo functionality
- Provide eraser tool

**Scope Additions**
- **Student drawing tools**:
  - **Color picker**: Palette of 8-12 colors (black, red, blue, green, orange, purple, brown, yellow, etc.)
  - **Pen thickness selector**: 3-5 thickness options (thin, medium, thick, very thick, extra thick)
  - **Eraser tool**: Toggle between pen and eraser mode
  - **Undo/redo**: Undo last stroke, redo undone strokes (limited history, e.g., last 20 strokes)
  - **Clear button**: Student can clear their own board (with confirmation)
- **UI improvements**:
  - Compact toolbar at top or side of canvas
  - Visual feedback for selected tool/color/thickness
  - Keyboard shortcuts for quick tool switching
- **Teacher dashboard updates**:
  - Show current tool/color in student tiles (optional indicator)
  - Undo/redo actions sync to teacher view
  - Erased content removed from teacher view

**Deliverables**
- Color picker component with preset palette
- Thickness selector UI (buttons or slider)
- Eraser mode toggle
- Undo/redo stack implementation (client-side)
- Updated stroke messages to include color and thickness
- Clear button with confirmation dialog
- Toolbar UI component for student app

**Done Criteria**
- Students can select from multiple colors and see color change immediately
- Pen thickness changes are visible in drawn strokes
- Eraser removes strokes (or draws in background color)
- Undo removes last stroke, redo restores it
- All drawing tool changes sync correctly to teacher dashboard
- Toolbar is intuitive and doesn't obstruct drawing area
- **Demo-ready**: Can show school a feature-rich whiteboard on localhost

---

### Stage 3 — Shape Tools and Graph Aids (Local Demo Features)
**Goals**
- Add geometric shape tools for classroom use (math, science, diagrams)
- Provide graph axes and grid backgrounds for quantitative work
- Enable structured drawing for geometry and data visualization
- Complete the feature-rich local demo prototype

**Scope Additions**
- **Shape drawing tools**:
  - **Line tool**: Click two points to draw straight line
  - **Rectangle tool**: Click and drag to draw rectangle
  - **Square tool**: Click and drag to draw square (locked aspect ratio)
  - **Triangle tool**: Click three points to draw triangle
  - **Circle/Ellipse tool**: Click center and drag to set radius
  - **Arrow tool**: Line with arrowhead (useful for annotations)
- **Graph and grid aids**:
  - **Grid toggle**: Show/hide background grid (square or dot grid)
  - **Axes tool**: Draw x/y axes with origin at center OR bottom-left
    - Configurable scale and labels
    - Snap-to-grid option
  - **Ruler overlay** (optional): Temporary measurement guide
- **Shape properties**:
  - Filled vs outline shapes (toggle)
  - Dashed/dotted line styles
  - Use current color and thickness settings
- **UI additions**:
  - Shape palette in toolbar
  - Mode indicator (freehand / line / rectangle / etc.)
  - Grid settings panel

**Deliverables**
- Shape tool implementations for each geometric shape
- Axes drawing tool with configurable origin
- Grid background toggle with settings
- Shape drawing UI (tool palette)
- Line style options (solid, dashed, dotted)
- Fill/outline toggle for shapes
- Updated message contracts for shape data

**Done Criteria**
- Students can draw basic geometric shapes accurately
- Axes tool creates proper coordinate systems
- Grid background aids drawing without cluttering view
- Shapes render correctly on teacher dashboard
- All tools work smoothly with mouse/trackpad (iPad testing comes later)
- **School demo ready**: Feature-complete local prototype demonstrates viability

**Suggested Future Additions** (for later stages):
- **Highlighter tool**: Semi-transparent pen for emphasis
- **Text tool**: Add text labels to drawings
- **Select/move tool**: Select and reposition drawn elements
- **Snap-to-grid**: Shapes align to grid lines automatically
- **Angle measurement**: Show angle between lines
- **Protractor overlay**: Temporary angle guide
- **Color fill**: Fill closed shapes with color

---

### Stage 4 — iPad Testing on Home Wi-Fi
**Goals**
- Validate Apple Pencil input on iPadOS 18 / Safari with all drawing tools
- Confirm networking works across devices (PC to iPad)
- Test HTTPS access from iPads with self-signed certificate
- Validate latency and feel on real hardware
- Test all drawing tools (colors, shapes, etc.) with Apple Pencil

**Scope Additions**
- Configure Kestrel to bind to your local network IP (e.g., 192.168.1.x)
- Generate QR code on teacher page pointing to local IP
- Mobile-responsive student UI (lock to landscape mode)
- Handle self-signed certificate warnings on iPads
- Improved stroke smoothing with Perfect Freehand library
- Touch/pointer event handling optimized for Apple Pencil
- Touch-optimized toolbar for all drawing tools
- Pressure sensitivity for pen thickness

**Setup Steps**
1. Find your PC's local IP: `ipconfig` (look for IPv4 address like 192.168.1.x)
2. Update Kestrel config to bind to `0.0.0.0:5001` (all interfaces)
3. Add Windows Firewall inbound rule for port 5001
4. iPads scan QR → join `https://192.168.1.x:5001/join?room=xxx`
5. First time: tap through "Not Secure" warning (accept self-signed cert)

**Deliverables**
- QR code generation on teacher page (using qrcode.react)
- Improved stroke smoothing (Perfect Freehand integration)
- Mobile-optimized UI (landscape orientation lock, responsive canvas)
- Touch-optimized toolbar for iPadOS
- Connection status indicator on student UI
- Basic reconnection handling
- Pressure sensitivity working with Apple Pencil

**Done Criteria**
- You can run the app on your PC
- Scan QR on multiple iPads (accept certificate warning once)
- Write with Apple Pencil smoothly (pressure sensitivity works)
- All drawing tools (colors, shapes, eraser, undo) work on iPad
- Teacher sees all iPad tiles updating in real-time
- Latency feels acceptable (<500ms on home Wi-Fi)
- Reconnection works if iPad briefly loses Wi-Fi

---

### Stage 5 — Classroom Controls + Text Input
**Goals**
- Add controls that make it classroom-ready
- Make it safe and manageable (kick, rotate QR)
- Add accessibility: text input as alternative to drawing

**Scope Additions**
- **Teacher controls**:
  - Lock/unlock room (disables student input)
  - Freeze/unfreeze room (stops streaming and input)
  - Clear all boards
  - Clear individual student board
  - Kick student (disconnect + invalidate session)
  - Rotate join token (invalidate old QR, generate new one)
  - Spotlight view (enlarge a student's board)
  - Rename student tiles (local to teacher only)
- **Student UI changes**:
  - **Input mode toggle**: "✏️ Draw" or "⌨️ Type" button
  - **Draw mode**: Canvas with Apple Pencil support (existing)
  - **Type mode**: Large text area, auto-resize, streams text to teacher
  - Clear/locked/frozen overlays and status banners
  - "Connected / Reconnecting / Disconnected" status indicator
- **Command acknowledgements**: Optional server → client confirmations for debugging

**Deliverables**
- Teacher control bar (lock, freeze, clear all buttons)
- Per-tile actions (spotlight, clear, kick, rename)
- Student input mode toggle (draw vs type)
- Text streaming events (TextUpdate message)
- Teacher dashboard renders typed text in student tiles
- Visual indicators for locked/frozen states

**Done Criteria**
- You can run a full Q&A cycle:
  - Teacher asks question
  - Students respond (some draw, some type)
  - Teacher freezes room
  - Teacher spotlights a student
  - Teacher clears all
  - Teacher unlocks for next question
- Text input feels as responsive as drawing
- All controls work reliably

---

### Stage 4 — Drawing Tools and Enhancements
**Goals**
- Add essential drawing tools for classroom use
- Improve student drawing experience with color and thickness options
- Add undo/redo functionality
- Provide eraser tool

**Scope Additions**
- **Student drawing tools**:
  - **Color picker**: Palette of 8-12 colors (black, red, blue, green, orange, purple, etc.)
  - **Pen thickness selector**: 3-5 thickness options (thin, medium, thick, very thick)
  - **Eraser tool**: Toggle between pen and eraser mode
  - **Undo/redo**: Undo last stroke, redo undone strokes (limited history, e.g., last 20 strokes)
  - **Clear button**: Student can clear their own board (with confirmation)
- **UI improvements**:
  - Compact toolbar at top or side of canvas
  - Visual feedback for selected tool/color/thickness
  - Touch-optimized buttons for iPad use
- **Teacher dashboard updates**:
  - Show current tool/color in student tiles (optional indicator)
  - Undo/redo actions sync to teacher view
  - Erased content removed from teacher view

**Deliverables**
- Color picker component with preset palette
- Thickness selector UI (buttons or slider)
- Eraser mode toggle
- Undo/redo stack implementation (client-side)
- Updated stroke messages to include color and thickness
- Clear button with confirmation dialog
- Toolbar UI component for student app

**Done Criteria**
- Students can select from multiple colors and see color change immediately
- Pen thickness changes are visible in drawn strokes
- Eraser removes strokes (or draws in background color)
- Undo removes last stroke, redo restores it
- All drawing tool changes sync correctly to teacher dashboard
- Toolbar is intuitive and doesn't obstruct drawing area

---

### Stage 5 — Shape Tools and Graph Aids
**Goals**
- Add geometric shape tools for classroom use (math, science, diagrams)
- Provide graph axes and grid backgrounds for quantitative work
- Enable structured drawing for geometry and data visualization

**Scope Additions**
- **Shape drawing tools**:
  - **Line tool**: Click two points to draw straight line
  - **Rectangle tool**: Click and drag to draw rectangle
  - **Square tool**: Click and drag to draw square (locked aspect ratio)
  - **Triangle tool**: Click three points to draw triangle
  - **Circle/Ellipse tool**: Click center and drag to set radius
  - **Arrow tool**: Line with arrowhead (useful for annotations)
- **Graph and grid aids**:
  - **Grid toggle**: Show/hide background grid (square or dot grid)
  - **Axes tool**: Draw x/y axes with origin at center OR bottom-left
    - Configurable scale and labels
    - Snap-to-grid option
  - **Ruler overlay** (optional): Temporary measurement guide
- **Shape properties**:
  - Filled vs outline shapes (toggle)
  - Dashed/dotted line styles
  - Use current color and thickness settings
- **UI additions**:
  - Shape palette in toolbar
  - Mode indicator (freehand / line / rectangle / etc.)
  - Grid settings panel

**Deliverables**
- Shape tool implementations for each geometric shape
- Axes drawing tool with configurable origin
- Grid background toggle with settings
- Shape drawing UI (tool palette)
- Line style options (solid, dashed, dotted)
- Fill/outline toggle for shapes
- Updated message contracts for shape data

**Done Criteria**
- Students can draw basic geometric shapes accurately
- Axes tool creates proper coordinate systems
- Grid background aids drawing without cluttering view
- Shapes render correctly on teacher dashboard
- All tools work smoothly with touch/Apple Pencil input
- Shape tools are useful for math and science lessons

**Suggested Additions** (optional, for future consideration):
- **Highlighter tool**: Semi-transparent pen for emphasis
- **Text tool**: Add text labels to drawings (may overlap with Stage 3 text input)
- **Select/move tool**: Select and reposition drawn elements
- **Snap-to-grid**: Shapes align to grid lines automatically
- **Angle measurement**: Show angle between lines
- **Protractor overlay**: Temporary angle guide
- **Color fill**: Fill closed shapes with color

---

---

### Stage 6 — Robustness and Scale Testing
**Goals**
- Ensure the system holds up at class size (28 students)
- Ensure it can support ~10 rooms in reasonable conditions (home simulation)
- Optimize performance and add monitoring

**Scope Additions**
- **Rate limiting**:
  - Batch stroke point messages (50-100 ms windows)
  - Cap message frequency per student (100 msgs/sec max)
  - Drop overly dense points (decimation)
- **Teacher rendering optimization**:
  - Offscreen canvas per student for thumbnails
  - Efficient redraw strategy (requestAnimationFrame, max 30fps per tile)
  - Pause updates for off-screen tiles (virtual scrolling)
- **Monitoring**:
  - Basic server metrics counters (connections, rooms, messages/sec)
  - Console logging for debugging
- **Error handling**:
  - Student disconnects during drawing → queue strokes, replay on reconnect
  - Invalid stroke data → drop, log error
  - Teacher reconnect → request state sync from all students

**Deliverables**
- A repeatable load test method:
  - Automated browser clients (Playwright) simulating 28 students
  - OR custom SignalR test clients
- Documented expected bandwidth and CPU use on dev PC
- Performance metrics dashboard (optional)

**Done Criteria**
- You can simulate 28 students in one room without UI lag
- You can run multiple rooms in parallel in simulation
- Teacher dashboard remains responsive (30fps minimum)
- Bandwidth is reasonable (<1 Mbps per room)

---

### Stage 7 — IIS Deployment Preparation
**Goals**
- Package the working local app for IIS hosting
- Create deployment documentation for IT team
- Test with IIS Express locally first

**Scope**
- Publish as self-contained deployment (includes .NET runtime)
- Test with IIS Express on your dev PC
- Configure application pool settings (always running, no idle timeout)
- Document reverse proxy setup (Application Request Routing / URL Rewrite)
- Create installation guide for IT team

**Deliverables**
- Published app folder (ready to copy to server)
- `web.config` with reverse proxy rules for SignalR
- IIS setup guide (step-by-step):
  - Application pool configuration
  - Site bindings (HTTPS port 443)
  - ARR/URL Rewrite module setup
  - Certificate requirements
- Application pool configuration specs
- Troubleshooting guide (common issues, logs location)

**Done Criteria**
- App runs successfully on your PC under IIS Express
- Documentation is clear enough for IT team to deploy without your help
- You've tested the published version (not just debug builds)

---

### Stage 8 — Production IIS Deployment (On-Prem School Server)
**Goals**
- Deploy to school's on-prem Windows Server
- Define required firewall/DNS/cert changes for IT
- Keep all traffic internal (no cloud dependencies)

**Deployment Architecture**
- On-prem Windows Server 2016+ (IIS 10+):
  - Host ASP.NET Core app behind IIS reverse proxy
  - HTTPS termination via IIS (port 443)
  - Internal DNS name (e.g., `whiteboard.school.local` or similar)
- Network:
  - Students VLAN → server TCP 443
  - Staff VLAN → server TCP 443
  - No device-to-device access required

**IT Deliverables / Requirements**
- **Server spec** (modest):
  - CPU: 2-4 cores
  - RAM: 4-8 GB
  - Storage: 20 GB (minimal for MVP; more if later saving exports)
- **Certificates**:
  - Use internal CA or approved certificate for the hostname
  - Must be trusted by iPads (install school CA cert on devices if needed)
- **DNS**:
  - Internal A record for the app hostname (e.g., `whiteboard.school.local`)
- **Firewall rules**:
  - Allow inbound TCP 443 to the server from student and staff networks
- **Logging**:
  - IIS logs + application logs to known location (e.g., `C:\inetpub\logs`)
  - Log rotation policy

**Done Criteria**
- You have a one-page IT request with:
  - Hostname (e.g., `whiteboard.school.local`)
  - Ports (TCP 443)
  - Certificate approach (internal CA or specific cert)
  - Server placement (which network zone)
  - Expected traffic estimate (stroke-based, <5 Mbps for 10 rooms)
- IT team has approved the request
- Server is provisioned and accessible on school network

---

### Stage 9 — School Network Pilot (Real Classroom)
**Goals**
- Confirm student Wi-Fi can reach the server
- Confirm client isolation does not matter (it should not)
- Validate teacher workflow in a real lesson
- Gather feedback for improvements

**Scope**
- Same features as Stage 3-4 (all controls, scale tested)
- Add "network diagnostics" page:
  - Connection test (can reach server?)
  - Latency estimate (ping/round-trip time)
  - WebSocket availability check
- Teacher training / quick start guide
- Student quick reference (how to join, what to do if disconnected)

**Done Criteria**
- A full class (28 students) can join within 2 minutes
- Teacher grid updates reliably during active use
- No major network issues (if there are, work with IT to resolve)
- Teacher feedback is positive or constructive

---

### Stage 10 — Authentication with Microsoft (Later Phase)
**Goals**
- Add optional sign-in for teachers first, then students
- Move from anonymous to named tiles and rosters
- Integrate with school's Microsoft 365 / Entra ID

**Approach**
- **Teacher sign-in**:
  - Restrict room creation to staff accounts (M365 login)
  - Use Microsoft Identity Platform (MSAL)
- **Student sign-in** (optional):
  - Allow anonymous fallback for reliability (in case auth fails)
  - Auto-populate display names from M365 profile
- **Data mapping**:
  - User ID → display name
  - Optional: class groups/rosters (future)

**Done Criteria**
- Teachers must sign in with M365 to create a room
- Students can sign in and appear with correct names (if enabled)
- Anonymous join still works as fallback

---

### Stage 11 — Exports and Retention (Future)
**Goals**
- Save session snapshots and export boards (PNG/PDF)
- Define retention controls and safeguarding posture
- Allow teachers to keep records of student work

**Features**
- **Export**:
  - Per-student image (PNG/SVG)
  - Full-class grid PDF
  - Text responses as CSV or PDF
- **Storage**:
  - Store stroke JSON and/or rendered images on server or SharePoint
  - Configure retention windows (e.g., 30 days, then auto-delete)
- **Safeguarding**:
  - Document data handling policy
  - GDPR/privacy compliance (school data protection officer approval)

**Done Criteria**
- Teacher can export a session safely and predictably
- Data retention is documented and configurable
- School DPO has approved the data handling approach

---

## 9. Detailed Functional Specification (MVP + Controls)

### Student App

#### Join Room
- Scan QR code or open join link
- Automatically connects to room (no login for MVP)
- Shows "Connected" status indicator

#### Input Mode Toggle
Student can choose between two modes:

**Draw Mode** (default):
- Canvas drawing surface (full screen, landscape orientation)
- Apple Pencil and finger input (configurable; recommend Pencil-only)
- Pen color/width (can start with fixed black pen for MVP)
- Pressure sensitivity (via Perfect Freehand)
- Clear local board when commanded by teacher

**Type Mode** (accessibility alternative):
- Large text area for typed answers
- Auto-resize to fit content
- Optional: character count indicator
- Streams text updates to teacher (debounced every 500ms to reduce bandwidth)

#### Status Banner
- **Connected**: Green indicator, normal operation
- **Reconnecting**: Yellow indicator, attempting to reconnect
- **Disconnected**: Red indicator, show "Lost connection" message
- **Locked**: Overlay message "Drawing locked by teacher", input disabled
- **Frozen**: Overlay message "Frozen - stop writing", input disabled

#### Behavior Under Commands
- **Lock**: Disable both drawing and typing, show overlay
- **Freeze**: Stop streaming and disable input, show overlay
- **Clear**: Clear canvas AND text area immediately
- **Kick**: Disconnect and show "Disconnected by teacher" message, disable rejoin with old token

---

### Teacher App

#### Room Creation Page
- **Create Room** button
- On creation:
  - Generate unique room ID (GUID)
  - Generate join token (short random string)
  - Show QR code (encodes join URL with room ID and token)
  - Show join link (text, for manual entry)
- **Rotate Token** button (invalidates old QR, generates new one)

#### Room Dashboard (Grid View)
- **Tile grid**:
  - One tile per connected student
  - 4-7 columns (responsive, based on screen width)
  - Tile shows:
    - Student display name ("Student 1", "Student 2", etc.; editable by teacher)
    - Live preview of their board (canvas or text)
    - Status indicators: actively drawing (green border), disconnected (greyed out), input mode icon (✏️ or ⌨️)
- **Student count**: "Connected: 24/28"
- **Active indicator**: "Active (drawing/typing in last 10s): 12"

#### Control Bar (Room-Level Actions)
- **Lock / Unlock** button (toggle): Disables all student input
- **Freeze / Unfreeze** button (toggle): Stops streaming and input
- **Clear All** button: Clears all student boards (with confirmation dialog)
- **End Room** button: Closes room, disconnects all students, deletes data

#### Per-Tile Actions (Right-click or Tile Menu)
- **Spotlight**: Open enlarged view of this student's board
- **Clear**: Clear only this student's board
- **Kick**: Disconnect this student
- **Rename**: Edit display name (local to teacher only, not sent to student)
- **Hide** (optional): Hide this tile from grid (local UI only, doesn't disconnect student)

#### Spotlight View
- Large canvas rendering of selected student's board
- Continues updating in real-time
- "Back to Grid" button
- Optional: navigation arrows to next/previous student

#### Keyboard Shortcuts
- **Spacebar**: Toggle freeze (quick!)
- **L**: Toggle lock
- **C**: Clear all (with confirmation)
- **Escape**: Close spotlight view

---

### Server (MVP)

#### Room Lifecycle
- **Create room**: Generate room ID, join token, store in memory
- **Join room**: Validate token, generate student ID, add to room participants
- **Disconnect cleanup**: Remove student from room on disconnect, notify teacher
- **Room expiration**: Auto-delete rooms after 4 hours of inactivity (background task every 10 minutes)
- **End room**: Teacher can manually end room, disconnect all students, delete data

#### Realtime Messaging (SignalR)
- **Student stroke events** → broadcast to teacher dashboard (only)
- **Student text events** → broadcast to teacher dashboard (only)
- **Teacher commands** → broadcast to all students in room (and update teacher UI state)
- **Presence events** → broadcast to teacher (student joined/left)

#### State Sync
- On teacher refresh/reconnect:
  - Request latest state from all connected students (RequestBoardState message)
  - Students respond with current strokes or text (BoardStateSnapshot message)
- MVP: Keep current strokes in memory; discard when room ends

#### Validation and Rate Limiting
- **Stroke points**: Validate x/y in range [0, 1], drop invalid points
- **Rate limiting**: Max 100 messages/sec per student; throttle or disconnect if exceeded
- **Room capacity**: Reject joins if room has 28 students (maxStudents setting)
- **Token validation**: Check token matches room and hasn't been rotated

---

## 10. Realtime Event Specification

See **`docs/stage0-message-contracts.md`** for full TypeScript interface definitions.

### Event Categories

#### Connection and Presence
- `JoinRoomRequest` (client → server)
- `JoinRoomResponse` (server → client)
- `ParticipantJoined` (server → teacher)
- `ParticipantLeft` (server → teacher)
- `Heartbeat` (optional, for keeping connection alive)

#### Strokes (Student → Server → Teacher)
- `StrokeBatch` (batched points, sent every 50ms)
- `ClearBoard` (server → student, initiated by teacher)

#### Text Input (Student → Server → Teacher)
- `TextUpdate` (debounced, sent every 500ms while typing)

#### Commands (Teacher → Server → Students)
- `SetLock` (enable/disable)
- `SetFreeze` (enable/disable)
- `ClearAll` (clear all boards)
- `ClearOne` (clear specific student)
- `KickParticipant` (disconnect student)
- `RotateJoinToken` (invalidate old token, generate new one)

#### State Sync
- `RequestBoardState` (server → student, or teacher → server → student)
- `BoardStateSnapshot` (student → server → teacher)

---

## 11. Performance and Bandwidth Targets

### Bandwidth Estimates (for IT Discussion)
- **Stroke-based streaming**, not image streaming
- Expected worst-case throughput (rough order of magnitude):
  - Per active student: ~5-10 kB/s (while actively drawing)
  - Per room (28 students, 50% active): ~70-140 kB/s = ~1 Mbps
  - 10 rooms (not all at peak): ~5-10 Mbps total on LAN
- **Port requirements**:
  - HTTPS (443) only in production
- **No peer-to-peer traffic required**; central server only

### Performance Targets
- **Latency**: Student writes → teacher sees update in <200 ms (LAN), <500 ms (Wi-Fi)
- **Frame rate**: Teacher dashboard updates at 30 fps minimum per tile
- **Reconnection**: Auto-reconnect within 5 seconds on brief disconnect
- **Room capacity**: 28 students per room, 10 rooms concurrently, no lag

---

## 12. Production on IIS (What IT Needs to Know)

### Hosting Model
- ASP.NET Core app hosted behind IIS reverse proxy
- IIS handles TLS certificate and forwards traffic to Kestrel (ASP.NET Core built-in server)
- Application serves:
  - Static front-end assets (teacher/student web UI, React build)
  - Realtime endpoint (SignalR hub)

### IIS Configuration Requirements
- **IIS version**: 10+ (Windows Server 2016+) for WebSocket support
- **Modules required**:
  - Application Request Routing (ARR)
  - URL Rewrite (for reverse proxy rules)
- **Application Pool**:
  - .NET CLR Version: "No Managed Code" (ASP.NET Core runs out-of-process)
  - Start Mode: "AlwaysRunning" (prevent idle timeout)
  - Idle Timeout: 0 (disable, keep app alive)

### Operations
- **App restart behavior**: Rooms in memory will reset; acceptable for MVP
- **Logging**:
  - IIS logs: `C:\inetpub\logs\LogFiles`
  - Application logs: `C:\inetpub\wwwroot\WhitePad\logs` (configurable)
  - Log connection counts, room counts, error logs
- **Updates**:
  - Planned maintenance window for deployments (e.g., after school hours)
  - Zero-downtime deployment possible later (with load balancer + multiple instances)

### Security Posture (MVP)
- **Anonymous student join** with expiring tokens
- **Teacher room creation** protected by "teacher access key" initially (shared secret)
- **Later**: Teacher SSO (M365 login, recommended for production)
- **HTTPS only** (no HTTP, redirect if needed)
- **Rate limiting** to prevent abuse

---

## 13. Risks and Mitigations

### Risk: Student Wi-Fi Cannot Reach Internal Server
**Mitigation**:
- Host in a whitelisted zone (DMZ or accessible from student VLAN)
- Allow TCP 443 from student VLAN to server hostname
- Provide a simple connectivity test page (Stage 9 network diagnostics)
- Work with IT during pilot (Stage 9) to resolve any firewall issues

### Risk: iPad Safari Pencil Issues
**Mitigation**:
- Validate early in Stage 4 (home testing with real iPads)
- Use Pointer Events API (excellent support in iPadOS 18)
- Handle palm rejection sensibly (ignore touch when pen is active)
- Test on multiple iPad models if possible (9.7", 11", 12.9")
- Benefit: Stages 2-3 will have all drawing tools ready for comprehensive iPad testing

### Risk: Wi-Fi Contention in Busy Lessons
**Mitigation**:
- Batching + rate limiting (Stage 4)
- Point decimation (drop redundant points in fast strokes)
- Avoid image streaming (use vector strokes only)
- Monitor bandwidth during pilot (Stage 7)

### Risk: Misuse (Draw Inappropriate Content)
**Mitigation**:
- Quick **kick** button (immediate disconnect)
- **Rotate join token** (prevent kicked student from rejoining)
- **End room** button (nuclear option: clears all data, disconnects everyone)
- Teacher can monitor all boards in real-time (deterrent)

### Risk: iPad HTTPS Certificate Warnings (Local Testing)
**Mitigation**:
- **Stage 4 (home iPad testing)**: Accept self-signed cert warnings manually on each iPad (one-time)
- **Stage 8 (production)**: Use school's internal CA or request proper certificate from IT
- Document the process for students/teachers

### Risk: Windows Firewall Blocks iPad Connections (Stage 4)
**Mitigation**:
- Add inbound firewall rule for port 5001 during setup
- Test connectivity with iPad Safari to `https://[PC_IP]:5001` before full testing
- Document firewall setup in Stage 4 deliverables

### Risk: Concurrent Teacher Sessions (Teacher Refreshes Browser)
**Mitigation**:
- One active teacher session per room (last connection wins)
- On teacher reconnect: invalidate old session, request state sync from all students
- Store `teacherSessionId` server-side, update on new connection

### Risk: Server Restart Loses All Rooms (MVP)
**Mitigation**:
- **Acceptable for MVP** (in-memory state only)
- Teacher can quickly recreate room (1 click)
- Later: Add Redis or SQL persistence for multi-server or durability

---

## 14. Definition of MVP

**Core MVP is complete when**:
- A teacher can create a room and show a QR code
- Students can join on iPads and draw with Apple Pencil OR type text
- Teacher sees live thumbnails for all students (draw or type mode)
- Teacher controls work: lock, freeze, clear all, clear one, kick, rotate QR token, spotlight
- The system runs on a single server process at home (Stages 1-5)
- The system can be deployed to IIS for school pilot (Stages 7-8)
- Basic error handling and reconnection work reliably

**Feature-Rich Demo Prototype (Stages 1-3)** includes:
- All drawing tools: colors, thickness, eraser, undo/redo
- Shape tools: line, rectangle, square, triangle, circle, arrow
- Graph aids: grid background, axes (center or bottom-left origin)
- Runs on localhost for school demonstration

**MVP does NOT include**:
- Authentication (anonymous join only)
- Persistence (rooms deleted on server restart or expiration)
- Exports (no saving boards to files)

---

## 15. Stage 0 Outputs (Reference)

The following documents have been created in the `docs/` folder to guide implementation:

1. **`stage0-architecture.md`**: System architecture diagram, component descriptions, network flow
2. **`stage0-message-contracts.md`**: TypeScript interface definitions for all SignalR messages
3. **`stage0-wireframes.md`**: UI wireframes and screen descriptions for teacher and student apps
4. **`stage0-repo-structure.md`**: Full repository folder structure and file organization plan

**These documents serve as the blueprint for Stage 1 implementation.**

---

## 16. Next Steps

1. ✅ **Stage 0 complete**: Documentation and project structure ready
2. ✅ **Stage 1 complete**: Local MVP implemented (Kestrel, SignalR, React, basic drawing)
3. **Stage 2 (NEXT)**: Add drawing tools (colors, thickness, eraser, undo/redo) - LOCAL DEMO
4. **Stage 3**: Add shape tools and graph aids (geometric shapes, axes, grids) - LOCAL DEMO
5. **Stage 4**: Test on iPads at home (QR codes, Apple Pencil, networking, touch-optimized tools)
6. **Stage 5**: Add classroom controls and text input mode
7. **Stage 6**: Scale testing and optimization (28 students, 10 rooms)
8. **Stage 7**: Package for IIS deployment
9. **Stage 8**: Deploy to school server
10. **Stage 9**: Pilot in classroom
11. **Stage 10+**: Authentication, exports, and advanced features

**Current Status**: Stage 1 MVP is working! Multiple students can connect and draw in real-time.

**Next Priority**: Stage 2-3 will add drawing tools and shapes for a feature-rich local demo to show school viability, then Stage 4 will test on iPads.
