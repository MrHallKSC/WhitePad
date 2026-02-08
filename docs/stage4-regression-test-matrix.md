# Stage 4 Regression Test Matrix

## Purpose
Lock down recent waiting-room, lock-state, viewer-sync, iPad input, and iOS overlay regressions.

## Automated Coverage
- Frontend unit tests now cover waiting-room and lock-state transitions:
  - `src/WhitePad.Web/src/student/hooks/waitingRoomStateMachine.test.ts`
- Run with:
  - `cd src/WhitePad.Web`
  - `npm run test`
- Keep this matrix as manual cross-device coverage; unit tests do not replace iPad Safari validation.

## Environment Matrix
- Desktop teacher: Windows + Chrome (latest)
- Student tablet: iPadOS + Safari (latest)
- Optional second student: desktop/mobile browser
- Network: same LAN, production-like run (`npm run build` + `dotnet run`)

## Priority 0 (Must Pass Every Build)

### R0-1 Waiting Room Initial Join (Enabled)
- Preconditions: teacher enables waiting room before any student joins.
- Steps:
1. Student joins via URL/QR.
2. Verify student sees waiting room screen (not drawing canvas).
- Expected:
1. No drawing interaction available.
2. No SignalR client-method-missing errors for `studentLocked` / `waitingRoomStateChanged`.

### R0-2 Start Activity Flow
- Preconditions: student is in waiting room; waiting room enabled.
- Steps:
1. Teacher clicks Start Activity (unlock waiting room).
2. Student taps Join Room.
- Expected:
1. Student sees "Ready to Join" state after Start Activity.
2. Student enters drawing mode only after tapping Join Room.

### R0-3 Lock All Is Classroom Freeze (Not Waiting Room)
- Preconditions: student already in drawing mode.
- Steps:
1. Teacher clicks Lock All Students.
2. Teacher clicks Unlock All Students.
- Expected:
1. Student remains on drawing page with work visible.
2. Overlay/lock warning shown.
3. Drawing edits, toolbar actions, undo/redo/clear/confidence are blocked while locked.
4. Interaction resumes after unlock.

### R0-4 Viewer Sync When Teacher Starts in Join Mode
- Preconditions: teacher remains in Join Mode; waiting room disabled.
- Steps:
1. Student draws several strokes/shapes.
2. Teacher switches to Viewer Mode.
- Expected:
1. Existing drawings are visible immediately.
2. New drawings continue to appear in real-time.

### R0-5 iOS Picker Overlay Visibility
- Preconditions: student on iPad Safari drawing page.
- Steps:
1. Open Color picker.
2. Open Background picker.
- Expected:
1. Popups render above canvas and are fully visible.
2. Popups are interactive.
3. Tapping outside closes popup.

### R0-6 iPad Palm/Multi-Touch Rejection
- Preconditions: student on iPad Safari with finger and/or pencil.
- Steps:
1. Start drawing with one finger.
2. Touch with second finger while drawing.
3. Repeat with Apple Pencil + resting hand.
- Expected:
1. No zoom/pan behavior.
2. Only active pointer path is processed.
3. No stuck drawing state after extra touches.

## Priority 1 (Daily)

### R1-1 Waiting Room Toggle Cycle
- Steps:
1. Teacher disables waiting room.
2. Student draws.
3. Teacher enables waiting room again.
- Expected:
1. Students transition back to waiting-room lock flow correctly.
2. Start Activity + Join Room still works.

### R1-2 Kick/Rejoin State Reset
- Steps:
1. Teacher kicks student.
2. Student rejoins with same link.
- Expected:
1. Student lock/waiting-room state initializes correctly for new session.

### R1-3 Toolbar Popup Stability
- Steps:
1. Repeatedly open/close picker popups.
2. Collapse/expand toolbar while popups are open/closed.
- Expected:
1. No popup orphaning.
2. No stale popup position issues.

## Priority 2 (Pre-Release)

### R2-1 Multi-Student Confidence Summary Layout
- Steps:
1. Connect 6+ students with mixed confidence states.
2. Open viewer mode.
- Expected:
1. Confidence summary remains in header between room info and back button.
2. Student grid and controls do not overlap.

### R2-2 Orientation Change on iPad
- Steps:
1. Rotate iPad between portrait/landscape in student view.
2. Use drawing and pickers after rotation.
- Expected:
1. Canvas and toolbar remain usable.
2. Popups still render above canvas.

## Quick Smoke Sequence
1. R0-1
2. R0-2
3. R0-3
4. R0-4
5. R0-5
6. R0-6
