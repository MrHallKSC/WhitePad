# Server Contracts

The iPad app should use the existing SignalR hub:

```text
/hub/whiteboard
```

## Hub Methods Used By Student Client

```text
JoinRoomAsStudent(roomId, joinToken, displayName) -> JoinRoomResponse
SendStrokeBatch(batch)
SendShape(shape)
SetConfidence(confidenceLevel)
UndoStroke(strokeId)
ClearBoard()
JoinFromWaitingRoom()
SetAnswered(hasAnswered)
```

## Events The iPad Client Must Handle

```text
studentLocked
boardCleared
waitingRoomStateChanged
kicked
questionChanged
```

The student app does not need to handle teacher-only events such as `participantJoined`, `participantLeft`, `receiveStrokeBatch`, `receiveShape`, `strokeUndone`, or `answeredChanged`.

## JoinRoomResponse

```json
{
  "success": true,
  "studentId": "string",
  "displayName": "string",
  "roomSettings": {},
  "isLocked": false,
  "waitingRoomEnabled": false,
  "waitingRoomUnlocked": false,
  "currentQuestion": null,
  "error": null
}
```

On failure:

```json
{
  "success": false,
  "error": "Room not found"
}
```

Known errors:

- `Room not found`
- `Invalid or expired join token`
- `Room is full (max N students)`

## StrokeBatch

```json
{
  "studentId": "set by server",
  "strokeId": "string",
  "points": [
    {
      "x": 0.5,
      "y": 0.5,
      "pressure": 0.8,
      "timestamp": 123
    }
  ],
  "color": "#000000",
  "lineWidth": 2,
  "isComplete": false
}
```

Client rules:

- Generate stable `strokeId` per stroke.
- Send batches while drawing.
- Send final batch with `isComplete == true`.
- Do not trust client-side `studentId`; the server replaces it.
- Use normalized coordinates so teacher tiles can render at any size.

## Shape

```json
{
  "shapeId": "string",
  "studentId": "set by server",
  "type": "line",
  "points": [
    { "x": 0.1, "y": 0.1, "pressure": 0.5 },
    { "x": 0.9, "y": 0.9, "pressure": 0.5 }
  ],
  "color": "#000000",
  "lineWidth": 2,
  "isComplete": true
}
```

Supported shape types:

```text
line
rectangle
circle
arrow
axesL
axesCross
```

## Confidence

Allowed values:

```text
none
red
amber
green
```

Invoke:

```text
SetConfidence("green")
```

## Locking

`studentLocked` message:

```json
{
  "studentId": "string",
  "isLocked": true
}
```

Only apply the lock if the message matches the current `studentId`.

## Waiting Room

`waitingRoomStateChanged` message:

```json
{
  "waitingRoomEnabled": true,
  "waitingRoomUnlocked": false
}
```

State rule:

- If waiting room is enabled and the student is locked, show waiting room UI.
- If waiting room is unlocked, show `Join Room`.
- When the student invokes `JoinFromWaitingRoom`, the server sends `studentLocked` with `isLocked == false`.

## Question And Answered State

`questionChanged` message:

```json
{
  "question": "string or null"
}
```

Client behavior:

- Set current question.
- Reset local answered state to false.
- Invoke `SetAnswered(true|false)` when the student toggles the answered button.

## Compatibility Risks

The web eraser currently uses canvas pixel erasing locally and sends stroke batches to the teacher. Before native implementation, verify teacher rendering expectations for eraser strokes. If teacher parity is not exact, define an explicit eraser contract instead of relying on pixel behavior.

The web app's documented query string has historically used both `room` and `roomId` in docs, but current code expects `roomId`. The iPad app should accept both for robustness and prefer `roomId`.
