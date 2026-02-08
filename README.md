# WhitePad - Live Mini-Whiteboards Web App

A real-time web application that replaces physical mini whiteboards with iPad-based digital whiteboards. Students use Apple Pencil or type responses, while teachers see live updates on a dashboard.

## Overview

WhitePad enables teachers to:
- See live thumbnails of 28 student boards simultaneously
- Control classroom flow (lock, freeze, clear boards)
- Spotlight individual students
- Generate QR codes for instant student access

Students can:
- Join rooms by scanning a QR code
- Draw with Apple Pencil (pressure-sensitive)
- Type text responses (accessibility alternative)
- Receive real-time teacher commands

## Technology Stack

- **Backend**: ASP.NET Core 8.0 + SignalR
- **Frontend**: React 18 + TypeScript + Vite
- **Drawing**: Perfect Freehand (smooth Apple Pencil strokes)
- **Real-time**: SignalR WebSockets
- **Deployment**: Kestrel (local) → IIS (production)

## Project Status

**Current Stage**: Stage 3 ✅ COMPLETE → Stage 4 Next

- [x] **Stage 0** - Project Setup (Complete)
- [x] **Stage 1** - Local MVP with real-time drawing (Complete)
- [x] **Stage 2** - Drawing tools: colors, thickness, eraser, undo/redo, confidence traffic light (Complete)
- [x] **Stage 3** - Shape tools: line, rectangle, circle, arrow, axes (L & cross), background patterns, teacher clear controls (Complete)
- [ ] **Stage 4** - iPad testing with Apple Pencil on home Wi-Fi (Next)

## Quick Start (for Development)

### Prerequisites

- .NET 8 SDK
- Node.js 20+
- Visual Studio 2022 or VS Code
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WhitePad
   ```

2. **Install backend dependencies**
   ```bash
   cd src/WhitePad.Server
   dotnet restore
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../WhitePad.Web
   npm install
   ```

4. **Trust the development certificate**
   ```bash
   dotnet dev-certs https --trust
   ```

### Run Locally (Stage 1+)

**Option A: Backend + Frontend Dev Server**

1. Start backend:
   ```bash
   cd src/WhitePad.Server
   dotnet run
   ```
   Backend runs at `https://localhost:5001`

2. Start frontend (separate terminal):
   ```bash
   cd src/WhitePad.Web
   npm run dev
   ```
   Frontend runs at `http://localhost:5173` (proxies to backend)

**Option B: Backend with Built Frontend**

1. Build frontend:
   ```bash
   cd src/WhitePad.Web
   npm run build
   ```
   Builds to `src/WhitePad.Server/wwwroot/`

2. Start backend:
   ```bash
   cd src/WhitePad.Server
   dotnet run
   ```
   Access at `https://localhost:5001`

### Access URLs

- **Teacher Dashboard**: `https://localhost:5001/teacher`
- **Student Join**: `https://localhost:5001/join?room=<roomId>&token=<token>`

## Project Structure

```
WhitePad/
├── docs/                      # Documentation
│   ├── WhitePad Project Plan.md
│   ├── stage0-architecture.md
│   ├── stage0-message-contracts.md
│   ├── stage0-wireframes.md
│   └── stage0-repo-structure.md
│
├── src/
│   ├── WhitePad.Server/       # ASP.NET Core backend
│   │   ├── Hubs/              # SignalR hubs
│   │   ├── Models/            # Data models
│   │   ├── Services/          # Business logic
│   │   └── wwwroot/           # Frontend build output
│   │
│   └── WhitePad.Web/          # React frontend
│       ├── src/
│       │   ├── teacher/       # Teacher UI
│       │   ├── student/       # Student UI
│       │   └── shared/        # Shared components
│       └── public/
│
├── tests/
│   └── WhitePad.Tests/        # Backend tests
│
└── scripts/                   # Build/deployment scripts
```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[WhitePad Project Plan.md](docs/WhitePad%20Project%20Plan.md)**: Complete project specification, stages, and requirements
- **[stage0-architecture.md](docs/stage0-architecture.md)**: System architecture, components, deployment models
- **[stage0-message-contracts.md](docs/stage0-message-contracts.md)**: TypeScript/C# interface definitions for all SignalR messages
- **[stage0-wireframes.md](docs/stage0-wireframes.md)**: UI wireframes for teacher and student apps
- **[stage0-repo-structure.md](docs/stage0-repo-structure.md)**: Detailed repository organization

## Development Stages

### ✅ Stage 0 - Project Setup (COMPLETE)
- Documentation and planning
- Repository structure
- Technology stack decisions

### ✅ Stage 1 - Local MVP (COMPLETE)
- SignalR hub implementation
- Real-time stroke streaming (<200ms latency)
- Room creation and joining
- Basic drawing canvas with pointer events
- Multi-student support (tested with 10+ students)

### ✅ Stage 2 - Drawing Tools (COMPLETE)
- Color picker (8+ colors)
- Pen thickness selector (5 options)
- Eraser tool
- Undo/redo functionality
- Clear board (student-initiated)
- Confidence traffic light (red/amber/green for formative assessment)

### ✅ Stage 3 - Shape Tools & UI Improvements (COMPLETE)
- **Shape tools**: Line, rectangle, circle, arrow (drag-to-draw with preview)
- **Axes tools**: L-shaped (bottom-left origin) and cross-shaped (center origin)
- **Background patterns**: Dotted grid, ruled lines, square grid (notebook-style spacing ~35px)
- **Dual-canvas architecture**: Backgrounds on separate canvas layer, persist through eraser/clear
- **Collapsible left sidebar**: Vertical toolbar optimized for landscape iPad use (240px expanded, 60px collapsed)
- **Teacher clear controls**: Clear All Boards button, Clear Student Board (context menu)
- **Shape preview**: Live preview while drawing with dashed outline
- All shapes and backgrounds sync to teacher dashboard in real-time

### 🔄 Stage 4 - iPad Testing (NEXT)
- QR code generation
- Apple Pencil pressure sensitivity testing
- Home Wi-Fi networking
- Self-signed certificate handling
- Touch-optimized UI for iPadOS

### Stage 5 - Classroom Controls
- Lock/freeze room controls
- Kick and token rotation
- Text input mode (accessibility)
- Spotlight view

### Stage 4 - Scale Testing
- Performance optimization
- Load testing (28 students)
- Rate limiting
- Monitoring

### Stage 5 - IIS Preparation
- Deployment packaging
- IIS configuration guide
- IT documentation

### Stage 6+ - Production
- School server deployment
- Classroom pilot
- Authentication (M365)
- Exports and retention

## Key Features

### Implemented Features
- ✅ Real-time drawing with <200ms latency
- ✅ Teacher dashboard with live student tile grid
- ✅ Room creation and student joining via URL
- ✅ **Drawing tools**: 12 colors, 5 thickness levels, eraser with composite mode
- ✅ **Shape tools**: Line, rectangle, circle, arrow with drag-to-draw and live preview
- ✅ **Axes tools**: L-shaped (bottom-left origin), cross-shaped (center origin)
- ✅ **Background patterns**: Dotted grid, ruled lines, square grid on separate canvas layer
- ✅ **Collapsible toolbar**: Vertical left sidebar (240px/60px) optimized for landscape iPad
- ✅ **Undo/redo**: Unlimited undo with keyboard shortcuts (Ctrl+Z/Y)
- ✅ **Clear controls**: Student clear (with confirmation), teacher clear individual/all boards
- ✅ **Confidence traffic light**: Red/Amber/Green formative assessment indicator
- ✅ **Classroom controls**: Lock/unlock students, kick students, custom student names

### In Progress
- 🔄 QR code generation for easy student access
- 🔄 iPad testing with Apple Pencil (pressure sensitivity)
- 🔄 Touch-optimized UI for iPadOS

### Future Features
- Text input mode (accessibility alternative)
- Lock/freeze/spotlight room controls
- Kick and token rotation
- Microsoft 365 authentication
- Export boards as PNG/PDF
- Persistent room storage

## Testing

### Unit Tests (Backend)
```bash
cd tests/WhitePad.Tests
dotnet test
```

### E2E Tests (Stage 4+)
```bash
cd tests/WhitePad.E2E
npm test
```

## Deployment

### Local Development
Runs on `https://localhost:5001` (Kestrel)

### Home Wi-Fi Testing
Bind to `https://0.0.0.0:5001` (all network interfaces)
- iPads connect to PC's local IP (e.g., `https://192.168.1.100:5001`)
- Accept self-signed certificate warning once

### Production (IIS)
Deploy to Windows Server behind IIS reverse proxy
- See `docs/deployment/iis-setup.md` (Stage 5)

## Configuration

### Backend (`appsettings.json`)
- Kestrel HTTPS port
- Room settings (max students, expiration)
- Rate limiting
- Teacher access key

### Frontend (`vite.config.ts`)
- Build output directory
- Dev server proxy configuration

## Contributing

This is a school project for internal use. For questions or contributions, please contact the development team.

## License

Proprietary - School Use Only

## Support

For issues or questions:
- Check the documentation in `docs/`
- Review the project plan for implementation details
- Contact the project maintainer

---

**Status**: ✅ Stage 3 Complete - Shape Tools, Backgrounds & UI Improvements | Next: iPad Testing on Home Wi-Fi

**Last Updated**: February 8, 2026
