# WhitePad - Live Mini-Whiteboards Web App

WhitePad is a real-time classroom whiteboard system. Students join from iPad Safari and draw on personal boards; teachers monitor all boards live and control classroom flow.

## Current Status

- Stage 0 to Stage 3: complete
- Stage 4 (iPad hardening/testing): in progress

Recent Stage 4 updates now shipped:
- waiting-room join flow (teacher toggle + start activity unlock)
- classroom lock behavior that freezes editing without sending students back to waiting room
- iPad palm/multi-touch rejection (single active pointer, stylus-first support)
- iOS toolbar picker overlay fix (color/background popups render above canvas)
- regression matrix and first frontend unit tests for lock/waiting-room transitions

## Stack

- Backend: ASP.NET Core 8 + SignalR
- Frontend: React 18 + TypeScript + Vite
- Drawing: pointer events + Perfect Freehand support

## Quick Start

### Prerequisites

- .NET 8 SDK
- Node.js 20+

### Install

```bash
cd src/WhitePad.Server
dotnet restore

cd ../WhitePad.Web
npm install
```

### Dev Run (fast iteration)

Terminal 1:
```bash
cd src/WhitePad.Server
dotnet run
```

Terminal 2:
```bash
cd src/WhitePad.Web
npm run dev
```

### Production-Like Run (recommended for QR/iPad validation)

```bash
cd src/WhitePad.Web
npm run build

cd ../WhitePad.Server
dotnet run
```

Open:
- Teacher: `https://localhost:5001/teacher`
- Student: `https://localhost:5001/join?room=<roomId>&token=<token>`

For LAN iPad testing, run backend bound to your LAN address and use the generated join QR/link.

## Implemented Features

- room creation and student join via QR/link + token
- live teacher grid with student thumbnails
- tools: pen, eraser, line, rectangle, circle, arrow, L-axes, cross-axes
- backgrounds: none, dotted, lined, square grid
- undo/redo, clear board (student + teacher controls)
- confidence indicators and teacher confidence summary
- waiting room flow:
  - waiting room toggle
  - start activity (unlock) flow
  - explicit student "Join Room" action
- classroom lock overlay (read-only board while locked)
- iPad input hardening (single-pointer handling, no accidental multi-touch draw state)

## Testing

Backend tests:
```bash
cd tests/WhitePad.Tests
dotnet test
```

Frontend tests (Vitest):
```bash
cd src/WhitePad.Web
npm run test
```

Manual regression matrix:
- `docs/stage4-regression-test-matrix.md`

## Documentation

- `docs/WhitePad Project Plan.md` - full project plan and staged roadmap
- `docs/stage3-completion.md` - Stage 3 completion report
- `docs/simplification-improvements-review.md` - simplification recommendations + status
- `docs/stage4-regression-test-matrix.md` - Stage 4 manual regression checklist

## Next Priorities

1. Continue Stage 4 cross-device validation (iPad Safari + desktop teacher).
2. Expand automated frontend tests around waiting-room and lock interactions.
3. Move to Stage 6 scale/robustness testing once Stage 4 matrix is consistently green.

Last updated: February 8, 2026
