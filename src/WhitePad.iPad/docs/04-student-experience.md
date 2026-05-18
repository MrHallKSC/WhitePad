# Student Experience

## Screen Flow

```text
QR scan or link open
  -> Resolve join link
  -> Connect to server
  -> Enter name
  -> Join room
  -> Waiting room or drawing board
```

## Launch From QR

When launched from a QR code, the app should:

1. Parse `roomId`, `token`, and server host.
2. Show a lightweight connecting state.
3. Establish SignalR connection to `/hub/whiteboard`.
4. Ask for the student name.
5. Invoke `JoinRoomAsStudent`.
6. Move to waiting room or board based on response.

If the app is already open in another room, show a confirmation before switching rooms.

## Name Entry

Match the web behavior:

- Name is required.
- Trim whitespace.
- Maximum length: 50 characters.
- Disable join button while joining.
- Show server errors such as room full, room not found, or invalid token.

Optional native improvement:

- Remember last used first name locally on the device, but require confirmation before joining.

## Waiting Room

When `waitingRoomEnabled == true` and the student is locked:

- Show a waiting room screen.
- Display the joined name.
- If `waitingRoomUnlocked == false`, show "Waiting for teacher to start activity".
- If `waitingRoomUnlocked == true`, show a clear `Join Room` button.
- On button tap, invoke `JoinFromWaitingRoom`.

## Drawing Board

The drawing board should prioritize space for student work.

Recommended landscape layout:

```text
+-------------------------------------------------------------+
| toolbar | question banner, when set                         |
|         +---------------------------------------------------+
|         |                                                   |
|         | drawing canvas                                    |
|         |                                                   |
|         |                                                   |
+-------------------------------------------------------------+
```

Toolbar controls:

- collapse/expand
- tool selector
- background selector
- color selector
- thickness selector
- undo
- redo
- clear
- confidence buttons

Use native iPad controls where they improve speed, but keep labels and choices consistent with the web app.

## Tools

Pen:

- stream stroke batches during drawing
- include pressure
- use normalized coordinates

Eraser:

- erase local pixels or remove intersecting stroke segments depending on implementation
- send eraser strokes as stroke batches using the existing color/lineWidth model only if teacher rendering matches
- if pixel erasing cannot be represented accurately on the teacher view, prefer stroke-object erasing or add a server-compatible eraser contract later

Shapes:

- preview while dragging
- commit on Pencil/finger up
- send one `Shape` message when complete

Supported shapes:

- line
- rectangle
- circle
- arrow
- L-shaped axes
- cross axes

## Question Banner

When the teacher sets a question:

- Show the question above the board.
- Reset local `hasAnswered` to false.
- Provide an answered toggle.
- Invoke `SetAnswered(hasAnswered)` on changes.

The server currently truncates questions to 280 characters.

## Locking

Classroom lock:

- keep the board visible
- prevent drawing, clear, undo, redo, confidence changes if matching web behavior
- show an overlay: "Drawing is locked by your teacher"

Waiting room lock:

- show waiting room screen instead of board
- unlock only after teacher starts the activity and student taps `Join Room`

## Kicked State

When the app receives `kicked`:

- stop the room session
- show a modal or full-screen message explaining the teacher removed the student
- offer a scan-again or close action
- do not silently rejoin with the old token

## Error And Reconnect States

The app should distinguish:

- cannot reach server
- invalid or expired token
- room full
- room ended or removed
- Wi-Fi dropped after successful join

For temporary network loss:

- show reconnecting overlay
- keep the board visible
- pause sends while disconnected
- avoid replaying old strokes unless a server-side resume protocol is added
