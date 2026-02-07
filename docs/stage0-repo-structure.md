# WhitePad Repository Structure

This document defines the complete folder and file organization for the WhitePad project.

---

## Repository Root

```
WhitePad/
├── .gitignore                    # Git ignore patterns (see below)
├── .claudeignore                 # Claude Code ignore patterns (optional)
├── README.md                     # Project overview and quick start guide
├── WhitePad.sln                  # Visual Studio solution file
│
├── .claude/                      # Claude Code configuration (auto-generated)
│   └── (auto-managed by Claude)
│
├── docs/                         # Documentation
│   ├── WhitePad Project Plan.md  # Main project specification
│   ├── stage0-architecture.md    # System architecture
│   ├── stage0-message-contracts.md  # SignalR message contracts
│   ├── stage0-wireframes.md      # UI wireframes
│   ├── stage0-repo-structure.md  # This file
│   └── deployment/               # Deployment guides (added in Stage 5)
│       ├── iis-setup.md
│       ├── local-testing.md
│       └── troubleshooting.md
│
├── src/                          # Source code
│   ├── WhitePad.Server/          # ASP.NET Core backend
│   └── WhitePad.Web/             # React frontend
│
├── tests/                        # Tests
│   ├── WhitePad.Tests/           # Backend unit/integration tests
│   └── WhitePad.E2E/             # End-to-end tests (Playwright, Stage 4+)
│
└── scripts/                      # Build and deployment scripts (Stage 5+)
    ├── build.ps1                 # Build script (Windows)
    ├── publish.ps1               # Publish for IIS deployment
    └── load-test.js              # Load testing script (Stage 4)
```

---

## `src/WhitePad.Server/` - Backend (ASP.NET Core)

```
src/WhitePad.Server/
├── WhitePad.Server.csproj        # Project file (.NET 8)
├── Program.cs                    # Application entry point, Kestrel config
├── appsettings.json              # Configuration (Kestrel, logging, etc.)
├── appsettings.Development.json  # Development overrides (local HTTPS, etc.)
│
├── Hubs/                         # SignalR hubs
│   ├── WhiteboardHub.cs          # Main SignalR hub (student/teacher methods)
│   └── IWhiteboardClient.cs      # Client interface (strongly-typed callbacks)
│
├── Models/                       # Data models
│   ├── Room.cs                   # Room entity
│   ├── Student.cs                # Student participant entity
│   ├── RoomSettings.cs           # Room settings (isLocked, isFrozen, etc.)
│   ├── StrokeBatch.cs            # Stroke batch message
│   ├── StrokePoint.cs            # Stroke point (x, y, pressure)
│   ├── TextUpdate.cs             # Text update message
│   └── Messages/                 # Message DTOs (request/response)
│       ├── JoinRoomRequest.cs
│       ├── JoinRoomResponse.cs
│       ├── CreateRoomRequest.cs
│       ├── CreateRoomResponse.cs
│       └── ... (other messages)
│
├── Services/                     # Business logic services
│   ├── IRoomStateManager.cs      # Interface for room state management
│   ├── InMemoryRoomStateManager.cs  # In-memory implementation (MVP)
│   ├── ITokenGenerator.cs        # Interface for join token generation
│   ├── TokenGenerator.cs         # Token generation service
│   └── RoomCleanupService.cs     # Background service (auto-expire rooms)
│
├── Middleware/                   # Custom middleware (optional)
│   ├── RateLimitingMiddleware.cs # Rate limiting (Stage 4)
│   └── ErrorHandlingMiddleware.cs # Global error handling
│
├── wwwroot/                      # Static files (React build output)
│   ├── index.html                # SPA entry point (from Vite build)
│   ├── assets/                   # JS/CSS bundles (from Vite build)
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── ...
│   └── favicon.ico               # App icon
│
└── Properties/
    └── launchSettings.json       # Launch profiles (IIS Express, Kestrel)
```

---

## `src/WhitePad.Web/` - Frontend (React + TypeScript)

```
src/WhitePad.Web/
├── package.json                  # Node dependencies (React, Vite, TypeScript, etc.)
├── package-lock.json             # Dependency lock file
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
├── .eslintrc.json                # ESLint configuration (optional)
├── .prettierrc                   # Prettier configuration (optional)
│
├── public/                       # Public assets (copied to wwwroot)
│   ├── favicon.ico
│   └── robots.txt
│
├── src/                          # React source code
│   ├── main.tsx                  # App entry point (ReactDOM.render)
│   ├── App.tsx                   # Root component (routing)
│   ├── vite-env.d.ts             # Vite type declarations
│   │
│   ├── teacher/                  # Teacher UI components
│   │   ├── TeacherApp.tsx        # Teacher root component
│   │   ├── RoomCreatePage.tsx    # Room creation page
│   │   ├── RoomDashboard.tsx     # Room dashboard (grid view)
│   │   ├── StudentTile.tsx       # Individual student tile
│   │   ├── StudentGrid.tsx       # Grid of student tiles
│   │   ├── SpotlightView.tsx     # Enlarged student view
│   │   ├── ControlBar.tsx        # Lock/Freeze/Clear All buttons
│   │   ├── QRCodeDisplay.tsx     # QR code component
│   │   └── hooks/                # Teacher-specific hooks
│   │       ├── useRoom.ts        # Room state management
│   │       ├── useStudents.ts    # Student list management
│   │       └── useSignalR.ts     # SignalR connection (teacher)
│   │
│   ├── student/                  # Student UI components
│   │   ├── StudentApp.tsx        # Student root component
│   │   ├── JoinPage.tsx          # Join room page
│   │   ├── DrawingPage.tsx       # Drawing canvas page
│   │   ├── TypingPage.tsx        # Text input page
│   │   ├── InputModeToggle.tsx   # Draw/Type mode toggle
│   │   ├── StatusIndicator.tsx   # Connection status indicator
│   │   ├── LockedOverlay.tsx     # "Locked by teacher" overlay
│   │   ├── FrozenOverlay.tsx     # "Frozen" overlay
│   │   └── hooks/                # Student-specific hooks
│   │       ├── useDrawing.ts     # Drawing canvas logic
│   │       ├── useSignalR.ts     # SignalR connection (student)
│   │       └── useInputMode.ts   # Input mode state
│   │
│   ├── shared/                   # Shared components and utilities
│   │   ├── components/           # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ErrorMessage.tsx
│   │   ├── hooks/                # Shared hooks
│   │   │   └── useLocalStorage.ts
│   │   ├── utils/                # Utility functions
│   │   │   ├── strokeBatching.ts  # Stroke point batching logic
│   │   │   ├── textDebouncing.ts  # Text update debouncing
│   │   │   └── coordinates.ts     # Normalize/denormalize coordinates
│   │   └── types/                # TypeScript type definitions
│   │       ├── messages.ts       # SignalR message types
│   │       ├── room.ts           # Room-related types
│   │       └── student.ts        # Student-related types
│   │
│   ├── services/                 # Frontend services
│   │   ├── signalr.ts            # SignalR connection setup
│   │   └── api.ts                # REST API client (if needed)
│   │
│   └── styles/                   # CSS/SCSS files
│       ├── global.css            # Global styles
│       ├── teacher.css           # Teacher-specific styles
│       ├── student.css           # Student-specific styles
│       └── variables.css         # CSS variables (colors, spacing, etc.)
│
└── dist/                         # Vite build output (ignored in git)
    └── (generated at build time)
```

---

## `tests/WhitePad.Tests/` - Backend Tests

```
tests/WhitePad.Tests/
├── WhitePad.Tests.csproj         # Test project file
│
├── Hubs/                         # Hub tests
│   └── WhiteboardHubTests.cs     # Tests for SignalR hub methods
│
├── Services/                     # Service tests
│   ├── InMemoryRoomStateManagerTests.cs
│   ├── TokenGeneratorTests.cs
│   └── RoomCleanupServiceTests.cs
│
├── Models/                       # Model/validation tests
│   └── MessageValidationTests.cs
│
└── Integration/                  # Integration tests
    ├── SignalRConnectionTests.cs
    ├── RoomLifecycleTests.cs
    └── CommandFlowTests.cs
```

---

## `tests/WhitePad.E2E/` - End-to-End Tests (Stage 4+)

```
tests/WhitePad.E2E/
├── package.json                  # Node dependencies (Playwright)
├── playwright.config.ts          # Playwright configuration
│
├── tests/                        # E2E test specs
│   ├── room-creation.spec.ts     # Test room creation flow
│   ├── student-join.spec.ts      # Test student join flow
│   ├── drawing.spec.ts           # Test drawing and stroke streaming
│   ├── teacher-controls.spec.ts  # Test lock/freeze/clear/kick
│   └── reconnection.spec.ts      # Test reconnection handling
│
└── fixtures/                     # Test fixtures
    └── testData.ts               # Sample room data, etc.
```

---

## `.gitignore` Contents

```gitignore
# .NET / Visual Studio
bin/
obj/
*.user
*.suo
*.userosscache
*.sln.docstates
.vs/
*.vscode/

# Build artifacts
[Dd]ebug/
[Rr]elease/
x64/
x86/
[Bb]uild/
[Oo]ut/
publish/

# ASP.NET Core
appsettings.Development.json  # May contain secrets (exclude or keep?)
*.log
*.db
*.sqlite

# Node.js / React
node_modules/
dist/
build/
*.tsbuildinfo
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Environment variables
.env
.env.local
.env.production

# OS files
.DS_Store
Thumbs.db

# IDE files
*.swp
*.swo
*~
.idea/
*.iml

# Test coverage
coverage/
*.coverage
*.coveragexml

# Logs
logs/
*.log

# Temporary files
tmp/
temp/
*.tmp

# Package files
*.nupkg
*.snupkg

# Claude Code (optional - auto-managed)
# .claude/
```

---

## Build Outputs

### Development (Local)
- **Backend**: Runs from `src/WhitePad.Server/bin/Debug/net8.0/`
- **Frontend**: Vite dev server (hot reload) OR built to `src/WhitePad.Web/dist/` and copied to `src/WhitePad.Server/wwwroot/`

### Production (IIS Deployment)
- **Published app**: `publish/` folder (created by `dotnet publish`)
- Contains:
  - `WhitePad.Server.exe` (self-contained)
  - `WhitePad.Server.dll`
  - `wwwroot/` (React build)
  - `appsettings.json`
  - `web.config` (IIS reverse proxy config)
  - Dependencies (runtime libraries)

---

## Configuration Files

### `appsettings.json` (Backend)

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.AspNetCore.SignalR": "Debug"
    }
  },
  "AllowedHosts": "*",
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://localhost:5001"
      }
    }
  },
  "Room": {
    "MaxStudents": 28,
    "ExpirationHours": 4,
    "CleanupIntervalMinutes": 10
  },
  "RateLimit": {
    "MaxMessagesPerSecond": 100
  },
  "Teacher": {
    "AccessKey": "change-me-in-production"
  }
}
```

### `appsettings.Development.json` (Backend, Local)

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug"
    }
  },
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://0.0.0.0:5001"
      }
    }
  }
}
```

### `vite.config.ts` (Frontend)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../WhitePad.Server/wwwroot',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/hub': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

### `package.json` (Frontend)

```json
{
  "name": "whitepad-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@microsoft/signalr": "^8.0.0",
    "perfect-freehand": "^1.2.0",
    "qrcode.react": "^3.1.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### `WhitePad.Server.csproj` (Backend)

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <!-- No additional packages needed for MVP - SignalR is built into ASP.NET Core -->
  </ItemGroup>

  <!-- Include frontend build output in publish -->
  <ItemGroup>
    <Content Include="wwwroot\**">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
  </ItemGroup>
</Project>
```

---

## Development Workflow

### Stage 1-4 (Local Development)

1. **Start Backend**:
   ```bash
   cd src/WhitePad.Server
   dotnet run
   ```
   Backend runs at `https://localhost:5001`

2. **Start Frontend** (Option A - Dev Server):
   ```bash
   cd src/WhitePad.Web
   npm install
   npm run dev
   ```
   Frontend runs at `http://localhost:5173` (proxies SignalR to backend)

3. **Start Frontend** (Option B - Build to wwwroot):
   ```bash
   cd src/WhitePad.Web
   npm run build
   ```
   Builds to `src/WhitePad.Server/wwwroot/`, served by backend

4. **Access**:
   - Teacher: `https://localhost:5001/teacher`
   - Student: `https://localhost:5001/join?room=xxx&token=yyy`

---

### Stage 5+ (IIS Deployment)

1. **Build Frontend**:
   ```bash
   cd src/WhitePad.Web
   npm run build
   ```

2. **Publish Backend**:
   ```bash
   cd src/WhitePad.Server
   dotnet publish -c Release -o ../../publish --self-contained
   ```

3. **Deploy to IIS**:
   - Copy `publish/` folder to server
   - Configure IIS site (see `docs/deployment/iis-setup.md`)
   - Set up reverse proxy to Kestrel

4. **Access**:
   - `https://whiteboard.school.local/teacher`
   - `https://whiteboard.school.local/join?room=xxx&token=yyy`

---

## File Size Estimates

| Path | Size (approx) | Notes |
|------|---------------|-------|
| `src/WhitePad.Server/` | ~50 KB | C# source code |
| `src/WhitePad.Web/src/` | ~200 KB | TypeScript/React source |
| `src/WhitePad.Web/dist/` | ~500 KB | React build (gzipped ~150 KB) |
| `publish/` (full app) | ~50 MB | Includes .NET runtime (self-contained) |
| `docs/` | ~100 KB | Markdown documentation |

---

## Dependencies Summary

### Backend (.NET)
- **ASP.NET Core 8.0**: Web framework
- **SignalR**: Built into ASP.NET Core (no additional package needed)
- **(Future)**: Redis client (for distributed state)

### Frontend (Node.js)
- **React 18**: UI framework
- **TypeScript 5**: Type safety
- **Vite 5**: Build tool (fast dev server, optimized builds)
- **@microsoft/signalr**: SignalR client library
- **perfect-freehand**: Smooth stroke rendering
- **qrcode.react**: QR code generation
- **react-router-dom**: Client-side routing

### Testing
- **xUnit** (backend): Unit/integration tests
- **Playwright** (E2E): Browser automation for end-to-end tests

---

## Next Steps

- ✅ Stage 0 complete: Repository structure defined
- **Stage 1**: Create `.csproj`, `package.json`, and initial project files
- **Stage 1**: Set up SignalR hub and React app skeleton
- **Stage 2**: Implement drawing canvas and stroke streaming
- **Stage 3**: Implement teacher controls and student command handling
- **Stage 4**: Add tests and optimize performance
- **Stage 5**: Create deployment scripts and IIS documentation
