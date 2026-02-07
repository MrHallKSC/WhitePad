# WhitePad UI Wireframes

This document provides ASCII wireframes and detailed descriptions of all UI screens for the WhitePad application.

---

## Teacher App

### 1. Room Creation Page

**URL**: `https://server/teacher` (or `/teacher/create`)

**Purpose**: Teacher creates a new room and gets a QR code for students to join.

```
┌─────────────────────────────────────────────────────────────────┐
│  WhitePad - Teacher                                    [Logout] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     Create a New Room                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │   Room Settings (Optional)                                │ │
│  │                                                           │ │
│  │   Max Students:  [28  ▼]                                 │ │
│  │                                                           │ │
│  │                                                           │ │
│  │           ┌─────────────────────────┐                    │ │
│  │           │   [Create Room]          │                    │ │
│  │           └─────────────────────────┘                    │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                                                 │
│  Recent Rooms (if any):                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Room #abc123  |  Created: 10:30 AM  |  [Rejoin]       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Teacher clicks "Create Room"
- Server generates room ID and join token
- Redirects to Room Dashboard (see below)

---

### 2. Room Dashboard (Grid View)

**URL**: `https://server/teacher/room/{roomId}`

**Purpose**: Teacher sees live thumbnails of all students, controls room.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  WhitePad - Room #abc123                              Connected: 24/28   [End Room]│
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Join Code:  https://server/join?room=abc123&token=xyz                           │
│                                                                                   │
│  ┌─────────────────────┐    ┌───────────────────────────────────────────────┐   │
│  │                     │    │  Controls:                                     │   │
│  │    ███████████      │    │                                               │   │
│  │    █ QR CODE █      │    │  [ Lock 🔒 ]  [ Freeze ❄️ ]  [ Clear All 🗑️ ]  │   │
│  │    █         █      │    │                                               │   │
│  │    █         █      │    │  Status: 🟢 Unlocked, Active                  │   │
│  │    █         █      │    │                                               │   │
│  │    ███████████      │    │  Active (drawing/typing in last 10s): 12      │   │
│  │                     │    │                                               │   │
│  │  [Rotate Token 🔄]   │    └───────────────────────────────────────────────┘   │
│  └─────────────────────┘                                                         │
│                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────┤
│  Student Grid:                                                                    │
│                                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │Student 1 │  │Student 2 │  │Student 3 │  │Student 4 │  │Student 5 │          │
│  │  ✏️       │  │  ⌨️       │  │  ✏️       │  │  ✏️       │  │  ✏️       │          │
│  │          │  │          │  │          │  │          │  │          │          │
│  │  ╱╲  ╱   │  │ "Hello   │  │  ○       │  │  ───     │  │  ╱       │          │
│  │ ╱  ╲╱    │  │  world"  │  │ ╱ ╲      │  │          │  │          │          │
│  │╱         │  │          │  │─────     │  │          │  │          │          │
│  │          │  │          │  │          │  │          │  │          │          │
│  │ 🟢       │  │ 🟢       │  │ 🟢       │  │ 🟢       │  │ ⚪       │          │
│  │ [···]    │  │ [···]    │  │ [···]    │  │ [···]    │  │ [···]    │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │Student 6 │  │Student 7 │  │Student 8 │  │Student 9 │  │Student 10│          │
│  │  ✏️       │  │  ✏️       │  │  ✏️       │  │  ⌨️       │  │  ✏️       │          │
│  │          │  │          │  │          │  │          │  │          │          │
│  │  ╲       │  │   ╱╲     │  │          │  │ "The     │  │   ○  ○   │          │
│  │   ╲      │  │  ╱  ╲    │  │          │  │  answer  │  │     ╲╱   │          │
│  │    ╲     │  │ ╱    ╲   │  │          │  │  is 42"  │  │          │          │
│  │          │  │          │  │          │  │          │  │          │          │
│  │ 🟢       │  │ 🟢       │  │ ⚪       │  │ 🟢       │  │ 🟢       │          │
│  │ [···]    │  │ [···]    │  │ [···]    │  │ [···]    │  │ [···]    │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                                   │
│  ... (up to 28 students total)                                                   │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Elements**:
- **Header**: Room ID, student count, "End Room" button
- **Join Code Section**: URL and QR code for students to join
- **Controls Bar**: Lock, Freeze, Clear All buttons + status indicators
- **Student Grid**: 4-7 columns (responsive), scrollable
  - Each tile shows:
    - Student display name (editable by clicking)
    - Input mode icon (✏️ for draw, ⌨️ for type)
    - Live preview of board (canvas or text)
    - Status indicator (🟢 active/connected, ⚪ inactive, 🔴 disconnected)
    - Menu button `[···]` for per-tile actions

**Status Indicators**:
- 🟢 **Green**: Student connected and recently active (drawing/typing in last 10s)
- ⚪ **Grey**: Student connected but inactive (no activity in last 10s)
- 🔴 **Red** (or greyed out): Student disconnected
- 🔵 **Blue border** (optional): Student actively drawing/typing RIGHT NOW (last 2 seconds)

**Tile Menu Actions** (right-click or click `[···]`):
- 🔍 **Spotlight**: Enlarge this student's board
- 🗑️ **Clear**: Clear only this student's board
- 👤 **Kick**: Disconnect this student
- ✏️ **Rename**: Edit display name (local to teacher only)
- 👁️ **Hide**: Hide this tile from grid (doesn't disconnect student)

**Controls**:
- **Lock 🔒**: Toggle button (blue when locked). Disables all student input.
- **Freeze ❄️**: Toggle button (blue when frozen). Stops streaming and input.
- **Clear All 🗑️**: Button with confirmation dialog ("Clear all boards?")
- **End Room**: Button in header, with confirmation ("End room and disconnect all students?")

**Keyboard Shortcuts**:
- **Spacebar**: Toggle freeze
- **L**: Toggle lock
- **C**: Clear all (with confirmation)

---

### 3. Spotlight View (Enlarged Student Board)

**Purpose**: Teacher opens an enlarged view of a specific student's board.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  WhitePad - Room #abc123                                            [Back to Grid]│
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Spotlight: Student 3  ✏️ (Draw Mode)                             🟢 Connected   │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                         ╱╲                                                │   │
│  │                        ╱  ╲                                               │   │
│  │                       ╱    ╲                                              │   │
│  │                      ╱      ╲                                             │   │
│  │                     ╱        ╲                                            │   │
│  │                    ────────────                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│  Actions:  [🗑️ Clear]  [👤 Kick]  [✏️ Rename]                                     │
│                                                                                   │
│  Navigation:  [< Previous Student]  [Next Student >]                              │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Elements**:
- **Header**: Student name, input mode, connection status, "Back to Grid" button
- **Enlarged Canvas**: Full-screen (or large) view of student's board, continues updating in real-time
- **Actions**: Clear, Kick, Rename buttons (same as tile menu)
- **Navigation**: Previous/Next buttons to cycle through students

**Keyboard Shortcuts**:
- **Escape**: Close spotlight, return to grid
- **Left/Right Arrow**: Navigate to previous/next student

---

## Student App

### 4. Join Page (Pre-Connection)

**URL**: `https://server/join?room=abc123&token=xyz`

**Purpose**: Student scans QR code or opens link, joins room.

```
┌─────────────────────────────────────────────────────────────────┐
│  WhitePad - Student                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│                                                                 │
│                       🔄 Joining room...                        │
│                                                                 │
│                                                                 │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior**:
1. Student opens URL (from QR code or manual entry)
2. App extracts `room` and `token` from URL query params
3. Establishes SignalR connection to server
4. Sends `JoinRoomRequest` with room ID and token
5. Waits for `JoinRoomResponse`
   - **Success**: Redirects to Drawing/Typing Page (see below)
   - **Error**: Shows error message (e.g., "Invalid join code" or "Room is full")

**Error States**:
```
┌─────────────────────────────────────────────────────────────────┐
│  WhitePad - Student                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│                         ❌ Error                                │
│                                                                 │
│             Unable to join room: Invalid join code              │
│                                                                 │
│              Please scan the QR code again.                     │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Drawing Page (Draw Mode)

**URL**: `https://server/join` (after successful join)

**Purpose**: Student draws with Apple Pencil, streams strokes to teacher.

**Orientation**: Landscape (preferred), locked via CSS if supported

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                      🟢 Connected │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│                                                                                   │
│                                                                                   │
│                                                                                   │
│                                                                                   │
│                        (Full-screen drawing canvas)                               │
│                                                                                   │
│                           Student draws here                                      │
│                                                                                   │
│                                                                                   │
│                                                                                   │
│                                                                                   │
│                                                                                   │
│                                                                                   │
│                                                                                   │
│                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────┤
│  [✏️ Draw]  [⌨️ Type]                                                              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Elements**:
- **Status Indicator** (top-right):
  - 🟢 **Connected**: Normal operation
  - 🟡 **Reconnecting**: Connection lost, attempting to reconnect
  - 🔴 **Disconnected**: Connection failed
- **Drawing Canvas**: Full-screen, white background, captures Apple Pencil and touch events
- **Input Mode Toggle** (bottom): Buttons to switch between Draw and Type modes
- **Status Banners** (top): When locked/frozen/kicked, a banner appears at the top of the screen
  - **Design principle**: Banners don't obscure student work - they appear as a strip across the top
  - Canvas is slightly dimmed when locked/frozen but content remains visible
  - Students can still see what they've written/drawn while waiting for teacher

**Drawing Behavior**:
- Apple Pencil input draws smooth strokes (using Perfect Freehand)
- Pressure sensitivity affects line thickness
- Stroke points are batched (every 50ms) and sent to server via SignalR
- No undo/redo in MVP (can be added later)
- Fixed pen color (black) and width in MVP (configurable later)

**Status Banners** (when commands received):

**Locked State**:
```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                      🟢 Connected │
├───────────────────────────────────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════════════════════════════════════╗ │
│ ║  🔒 Drawing Locked - Please wait for teacher to unlock                       ║ │
│ ╚═══════════════════════════════════════════════════════════════════════════════╝ │
│                                                                                   │
│                                                                                   │
│                        (Student's drawing still visible)                          │
│                                                                                   │
│                           ╱╲  ╱                                                   │
│                          ╱  ╲╱                                                    │
│                         ╱                                                         │
│                                                                                   │
│                      (Canvas slightly dimmed, input disabled)                     │
│                                                                                   │
│                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────┤
│  [✏️ Draw]  [⌨️ Type]                                                              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Frozen State**:
```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                      🟢 Connected │
├───────────────────────────────────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════════════════════════════════════╗ │
│ ║  ❄️ Frozen - Stop writing and wait for teacher                               ║ │
│ ╚═══════════════════════════════════════════════════════════════════════════════╝ │
│                                                                                   │
│                                                                                   │
│                        (Student's drawing still visible)                          │
│                                                                                   │
│                           ╱╲  ╱                                                   │
│                          ╱  ╲╱                                                    │
│                         ╱                                                         │
│                                                                                   │
│                      (Canvas slightly dimmed, input disabled)                     │
│                                                                                   │
│                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────┤
│  [✏️ Draw]  [⌨️ Type]                                                              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Kicked State**:
```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                    🔴 Disconnected │
├───────────────────────────────────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════════════════════════════════════╗ │
│ ║  ❌ Disconnected - You were removed from the room by the teacher              ║ │
│ ║  Reason: (if provided)                                                        ║ │
│ ╚═══════════════════════════════════════════════════════════════════════════════╝ │
│                                                                                   │
│                                                                                   │
│                        (Student's work still visible)                             │
│                                                                                   │
│                           ╱╲  ╱                                                   │
│                          ╱  ╲╱                                                    │
│                         ╱                                                         │
│                                                                                   │
│                      (Canvas greyed out, all input disabled)                      │
│                                                                                   │
│                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────┤
│  [✏️ Draw]  [⌨️ Type]  (disabled)                                                 │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6. Typing Page (Type Mode)

**Purpose**: Student types text instead of drawing (accessibility alternative).

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                      🟢 Connected │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                           │   │
│  │  Type your answer here...                                                 │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  │                                                                           │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│  Character count: 0                                                               │
│                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────┤
│  [✏️ Draw]  [⌨️ Type]                                                              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Elements**:
- **Status Indicator** (top-right): Same as draw mode
- **Text Area**: Large, auto-resize, placeholder text
- **Character Count** (optional): Shows number of characters typed
- **Input Mode Toggle** (bottom): Switch back to draw mode

**Typing Behavior**:
- Student types text
- Text updates are **debounced** (sent every 500ms while typing)
- Teacher sees typed text in the student's tile (not editable by teacher)
- Lock/Freeze commands work the same (disable input, show banner)

**Status Banners**: Same as draw mode (locked, frozen, kicked) - top banner notifications that don't obscure typed text

---

### 7. Reconnecting State

**Purpose**: Show when connection is lost and attempting to reconnect.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                                                  🟡 Reconnecting...│
├───────────────────────────────────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════════════════════════════════════╗ │
│ ║  🔄 Reconnecting - Please wait while we restore your connection...           ║ │
│ ╚═══════════════════════════════════════════════════════════════════════════════╝ │
│                                                                                   │
│                                                                                   │
│                        (Student's work still visible)                             │
│                                                                                   │
│                           ╱╲  ╱                                                   │
│                          ╱  ╲╱                                                    │
│                         ╱                                                         │
│                                                                                   │
│                      (Canvas visible, input temporarily disabled)                 │
│                                                                                   │
│                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────┤
│  [✏️ Draw]  [⌨️ Type]  (disabled)                                                 │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- SignalR automatically attempts to reconnect (exponential backoff, up to 5 attempts)
- Student's canvas/text is preserved during reconnection
- If reconnection succeeds:
  - Show "Connected" indicator
  - Send `BoardStateSnapshot` to server (state sync)
  - Resume normal operation
- If reconnection fails (after 5 attempts):
  - Show "Disconnected" error
  - Prompt student to refresh page or scan QR again

---

## Responsive Design Notes

### Teacher Dashboard (Desktop)
- **Large screens (>1600px)**: 6-7 columns, tiles ~200x150px
- **Medium screens (1200-1600px)**: 5 columns, tiles ~180x130px
- **Small screens (768-1200px)**: 4 columns, tiles ~150x110px
- **Mobile (not primary use case)**: 2 columns, tiles ~120x90px

### Student App (iPad)
- **Orientation**: Landscape preferred (more drawing space, better teacher preview aspect ratio)
- **Canvas**: Full-screen (minus status bar and input toggle)
- **Touch Target**: Input mode toggle buttons are large (min 44x44px for accessibility)

---

## Color Scheme (Suggested)

- **Primary**: Blue (#3B82F6) - for active controls, focus states
- **Success**: Green (#10B981) - for connected status
- **Warning**: Yellow (#F59E0B) - for reconnecting status
- **Error**: Red (#EF4444) - for disconnected, kicked states
- **Neutral**: Grey (#6B7280) - for inactive students, disabled controls
- **Background**: White (#FFFFFF) - canvas, UI background
- **Text**: Dark Grey (#1F2937) - primary text

---

## Typography (Suggested)

- **Primary Font**: System font stack (San Francisco on iOS/macOS, Segoe UI on Windows)
- **Display Name**: 14px, medium weight
- **Body Text**: 16px, regular weight
- **Button Text**: 14px, semi-bold
- **Status Text**: 12px, regular weight

---

## Accessibility Considerations

- **Keyboard Navigation**: All teacher controls accessible via Tab, Enter, Space
- **Screen Reader**: Labels for all buttons, status indicators, and status banners
- **High Contrast**: Ensure status indicators and banners visible in high contrast mode
- **Touch Targets**: Minimum 44x44px for mobile (iPad)
- **Focus Indicators**: Clear visual focus states for keyboard navigation
- **Non-Intrusive Status**: Status banners appear at top of screen, never obscuring student work
  - Students can review their answers while waiting (locked/frozen states)
  - Reduces frustration and maintains context during classroom activities

---

## Icon Legend

- ✏️ **Draw Mode**: Student is drawing
- ⌨️ **Type Mode**: Student is typing
- 🟢 **Connected**: Active and connected
- 🟡 **Reconnecting**: Connection lost, attempting to reconnect
- 🔴 **Disconnected**: Not connected
- ⚪ **Inactive**: Connected but no recent activity
- 🔒 **Locked**: Room is locked (input disabled)
- ❄️ **Frozen**: Room is frozen (input and streaming disabled)
- 🗑️ **Clear**: Clear board
- 👤 **Kick**: Disconnect student
- 🔍 **Spotlight**: Enlarge view
- 🔄 **Rotate Token**: Generate new join code
- ❌ **Error**: Error state

---

## Animation Notes (Future Enhancement)

- **Student Tile Border**: Pulse green when actively drawing (last 2 seconds)
- **Status Indicator**: Fade in/out when changing states
- **Status Banners**: Slide down from top when locked/frozen (smooth transition, not instant)
- **Canvas Dimming**: Gentle fade to slightly dimmed state when locked/frozen (content remains visible)
- **Stroke Rendering**: Smooth interpolation between points (Perfect Freehand handles this)

---

## Next Steps

- ✅ Stage 0 complete: Wireframes defined
- **Stage 1**: Implement React components for teacher and student UIs
- **Stage 2**: Add mobile responsiveness and iPad-specific optimizations
- **Stage 3**: Implement all control buttons and command handlers
