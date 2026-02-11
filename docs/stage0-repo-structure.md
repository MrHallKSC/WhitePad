# WhitePad Repository Structure

This document defines the complete folder and file organization for the WhitePad project.

---

## Repository Root

```
WhitePad/
â”œâ”€â”€ .gitignore                    # Git ignore patterns (see below)
â”œâ”€â”€ .claudeignore                 # Claude Code ignore patterns (optional)
â”œâ”€â”€ README.md                     # Project overview and quick start guide
â”œâ”€â”€ WhitePad.sln                  # Visual Studio solution file
â”‚
â”œâ”€â”€ .claude/                      # Claude Code configuration (auto-generated)
â”‚   â””â”€â”€ (auto-managed by Claude)
â”‚
â”œâ”€â”€ docs/                         # Documentation
â”‚   â”œâ”€â”€ WhitePad Project Plan.md  # Main project specification
â”‚   â”œâ”€â”€ stage0-architecture.md    # System architecture
â”‚   â”œâ”€â”€ stage0-message-contracts.md  # SignalR message contracts
â”‚   â”œâ”€â”€ stage0-wireframes.md      # UI wireframes
â”‚   â”œâ”€â”€ stage0-repo-structure.md  # This file
â”‚   â””â”€â”€ deployment/               # Deployment guides (added in Stage 5)
â”‚       â”œâ”€â”€ iis-setup.md
â”‚       â”œâ”€â”€ local-testing.md
â”‚       â””â”€â”€ troubleshooting.md
â”‚
â”œâ”€â”€ src/                          # Source code
â”‚   â”œâ”€â”€ WhitePad.Server/          # ASP.NET Core backend
â”‚   â””â”€â”€ WhitePad.Web/             # React frontend
â”‚
â”œâ”€â”€ tests/                        # Tests
â”‚   â”œâ”€â”€ WhitePad.Tests/           # Backend unit/integration tests
â”‚   â””â”€â”€ WhitePad.E2E/             # End-to-end tests (Playwright, Stage 4+)
â”‚
â””â”€â”€ scripts/                      # Build and deployment scripts (Stage 5+)
    â”œâ”€â”€ build.ps1                 # Build script (Windows)
    â”œâ”€â”€ publish.ps1               # Publish for IIS deployment
    â””â”€â”€ load-test.js              # Load testing script (Stage 4)
```

---

## `src/WhitePad.Server/` - Backend (ASP.NET Core)

```
src/WhitePad.Server/
â”œâ”€â”€ WhitePad.Server.csproj        # Project file (.NET 8)
â”œâ”€â”€ Program.cs                    # Application entry point, Kestrel config
â”œâ”€â”€ appsettings.json              # Configuration (Kestrel, logging, etc.)
â”œâ”€â”€ appsettings.Development.json  # Development overrides (local HTTPS, etc.)
â”‚
â”œâ”€â”€ Hubs/                         # SignalR hubs
â”‚   â”œâ”€â”€ WhiteboardHub.cs          # Main SignalR hub (student/teacher methods)
â”‚   â””â”€â”€ IWhiteboardClient.cs      # Client interface (strongly-typed callbacks)
â”‚
â”œâ”€â”€ Models/                       # Data models
â”‚   â”œâ”€â”€ Room.cs                   # Room entity
â”‚   â”œâ”€â”€ Student.cs                # Student participant entity
â”‚   â”œâ”€â”€ RoomSettings.cs           # Room settings (isLocked, isFrozen, etc.)
â”‚   â”œâ”€â”€ StrokeBatch.cs            # Stroke batch message
â”‚   â”œâ”€â”€ StrokePoint.cs            # Stroke point (x, y, pressure)
â”‚   â”œâ”€â”€ TextUpdate.cs             # Text update message
â”‚   â””â”€â”€ Messages/                 # Message DTOs (request/response)
â”‚       â”œâ”€â”€ JoinRoomRequest.cs
â”‚       â”œâ”€â”€ JoinRoomResponse.cs
â”‚       â”œâ”€â”€ CreateRoomRequest.cs
â”‚       â”œâ”€â”€ CreateRoomResponse.cs
â”‚       â””â”€â”€ ... (other messages)
â”‚
â”œâ”€â”€ Services/                     # Business logic services
â”‚   â”œâ”€â”€ IRoomStateManager.cs      # Interface for room state management
â”‚   â”œâ”€â”€ InMemoryRoomStateManager.cs  # In-memory implementation (MVP)
â”‚   â”œâ”€â”€ ITokenGenerator.cs        # Interface for join token generation
â”‚   â”œâ”€â”€ TokenGenerator.cs         # Token generation service
â”‚   â””â”€â”€ RoomCleanupService.cs     # Background service (auto-expire rooms)
â”‚
â”œâ”€â”€ Middleware/                   # Custom middleware (optional)
â”‚   â”œâ”€â”€ RateLimitingMiddleware.cs # Rate limiting (Stage 4)
â”‚   â””â”€â”€ ErrorHandlingMiddleware.cs # Global error handling
â”‚
â”œâ”€â”€ wwwroot/                      # Static files (React build output)
â”‚   â”œâ”€â”€ index.html                # SPA entry point (from Vite build)
â”‚   â”œâ”€â”€ assets/                   # JS/CSS bundles (from Vite build)
â”‚   â”‚   â”œâ”€â”€ index-[hash].js
â”‚   â”‚   â”œâ”€â”€ index-[hash].css
â”‚   â”‚   â””â”€â”€ ...
â”‚   â””â”€â”€ favicon.ico               # App icon
â”‚
â””â”€â”€ Properties/
    â””â”€â”€ launchSettings.json       # Launch profiles (IIS Express, Kestrel)
```

---

## `src/WhitePad.Web/` - Frontend (React + TypeScript)

```
src/WhitePad.Web/
â”œâ”€â”€ package.json                  # Node dependencies (React, Vite, TypeScript, etc.)
â”œâ”€â”€ package-lock.json             # Dependency lock file
â”œâ”€â”€ tsconfig.json                 # TypeScript configuration
â”œâ”€â”€ vite.config.ts                # Vite build configuration
â”œâ”€â”€ .eslintrc.json                # ESLint configuration (optional)
â”œâ”€â”€ .prettierrc                   # Prettier configuration (optional)
â”‚
â”œâ”€â”€ public/                       # Public assets (copied to wwwroot)
â”‚   â”œâ”€â”€ favicon.ico
â”‚   â””â”€â”€ robots.txt
â”‚
â”œâ”€â”€ src/                          # React source code
â”‚   â”œâ”€â”€ main.tsx                  # App entry point (ReactDOM.render)
â”‚   â”œâ”€â”€ App.tsx                   # Root component (routing)
â”‚   â”œâ”€â”€ vite-env.d.ts             # Vite type declarations
â”‚   â”‚
â”‚   â”œâ”€â”€ teacher/                  # Teacher UI components
â”‚   â”‚   â”œâ”€â”€ TeacherApp.tsx        # Teacher root component
â”‚   â”‚   â”œâ”€â”€ RoomCreatePage.tsx    # Room creation page
â”‚   â”‚   â”œâ”€â”€ RoomDashboard.tsx     # Room dashboard (grid view)
â”‚   â”‚   â”œâ”€â”€ StudentTile.tsx       # Individual student tile
â”‚   â”‚   â”œâ”€â”€ StudentGrid.tsx       # Grid of student tiles
â”‚   â”‚   â”œâ”€â”€ SpotlightView.tsx     # Enlarged student view
â”‚   â”‚   â”œâ”€â”€ ControlBar.tsx        # Lock/Freeze/Clear All buttons
â”‚   â”‚   â”œâ”€â”€ QRCodeDisplay.tsx     # QR code component
â”‚   â”‚   â””â”€â”€ hooks/                # Teacher-specific hooks
â”‚   â”‚       â”œâ”€â”€ useRoom.ts        # Room state management
â”‚   â”‚       â”œâ”€â”€ useStudents.ts    # Student list management
â”‚   â”‚       â””â”€â”€ useSignalR.ts     # SignalR connection (teacher)
â”‚   â”‚
â”‚   â”œâ”€â”€ student/                  # Student UI components
â”‚   â”‚   â”œâ”€â”€ StudentApp.tsx        # Student root component
â”‚   â”‚   â”œâ”€â”€ JoinPage.tsx          # Join room page
â”‚   â”‚   â”œâ”€â”€ DrawingPage.tsx       # Drawing canvas page
â”‚   â”‚   â”œâ”€â”€ TypingPage.tsx        # Text input page
â”‚   â”‚   â”œâ”€â”€ InputModeToggle.tsx   # Draw/Type mode toggle
â”‚   â”‚   â”œâ”€â”€ StatusIndicator.tsx   # Connection status indicator
â”‚   â”‚   â”œâ”€â”€ LockedOverlay.tsx     # "Locked by teacher" overlay
â”‚   â”‚   â”œâ”€â”€ FrozenOverlay.tsx     # "Frozen" overlay
â”‚   â”‚   â””â”€â”€ hooks/                # Student-specific hooks
â”‚   â”‚       â”œâ”€â”€ useDrawing.ts     # Drawing canvas logic
â”‚   â”‚       â”œâ”€â”€ useSignalR.ts     # SignalR connection (student)
â”‚   â”‚       â””â”€â”€ useInputMode.ts   # Input mode state
â”‚   â”‚
â”‚   â”œâ”€â”€ shared/                   # Shared components and utilities
â”‚   â”‚   â”œâ”€â”€ components/           # Reusable UI components
â”‚   â”‚   â”‚   â”œâ”€â”€ Button.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ Modal.tsx
â”‚   â”‚   â”‚   â””â”€â”€ ErrorMessage.tsx
â”‚   â”‚   â”œâ”€â”€ hooks/                # Shared hooks
â”‚   â”‚   â”‚   â””â”€â”€ useLocalStorage.ts
â”‚   â”‚   â”œâ”€â”€ utils/                # Utility functions
â”‚   â”‚   â”‚   â”œâ”€â”€ strokeBatching.ts  # Stroke point batching logic
â”‚   â”‚   â”‚   â”œâ”€â”€ textDebouncing.ts  # Text update debouncing
â”‚   â”‚   â”‚   â””â”€â”€ coordinates.ts     # Normalize/denormalize coordinates
â”‚   â”‚   â””â”€â”€ types/                # TypeScript type definitions
â”‚   â”‚       â”œâ”€â”€ messages.ts       # SignalR message types
â”‚   â”‚       â”œâ”€â”€ room.ts           # Room-related types
â”‚   â”‚       â””â”€â”€ student.ts        # Student-related types
â”‚   â”‚
â”‚   â”œâ”€â”€ services/                 # Frontend services
â”‚   â”‚   â”œâ”€â”€ signalr.ts            # SignalR connection setup
â”‚   â”‚   â””â”€â”€ api.ts                # REST API client (if needed)
â”‚   â”‚
â”‚   â””â”€â”€ styles/                   # CSS/SCSS files
â”‚       â”œâ”€â”€ global.css            # Global styles
â”‚       â”œâ”€â”€ teacher.css           # Teacher-specific styles
â”‚       â”œâ”€â”€ student.css           # Student-specific styles
â”‚       â””â”€â”€ variables.css         # CSS variables (colors, spacing, etc.)
â”‚
â””â”€â”€ dist/                         # Vite build output (ignored in git)
    â””â”€â”€ (generated at build time)
```

---

## `tests/WhitePad.Tests/` - Backend Tests

```
tests/WhitePad.Tests/
â”œâ”€â”€ WhitePad.Tests.csproj         # Test project file
â”‚
â”œâ”€â”€ Hubs/                         # Hub tests
â”‚   â””â”€â”€ WhiteboardHubTests.cs     # Tests for SignalR hub methods
â”‚
â”œâ”€â”€ Services/                     # Service tests
â”‚   â”œâ”€â”€ InMemoryRoomStateManagerTests.cs
â”‚   â”œâ”€â”€ TokenGeneratorTests.cs
â”‚   â””â”€â”€ RoomCleanupServiceTests.cs
â”‚
â”œâ”€â”€ Models/                       # Model/validation tests
â”‚   â””â”€â”€ MessageValidationTests.cs
â”‚
â””â”€â”€ Integration/                  # Integration tests
    â”œâ”€â”€ SignalRConnectionTests.cs
    â”œâ”€â”€ RoomLifecycleTests.cs
    â””â”€â”€ CommandFlowTests.cs
```

---

## `tests/WhitePad.E2E/` - End-to-End Tests (Stage 4+)

```
tests/WhitePad.E2E/
â”œâ”€â”€ package.json                  # Node dependencies (Playwright)
â”œâ”€â”€ playwright.config.ts          # Playwright configuration
â”‚
â”œâ”€â”€ tests/                        # E2E test specs
â”‚   â”œâ”€â”€ room-creation.spec.ts     # Test room creation flow
â”‚   â”œâ”€â”€ student-join.spec.ts      # Test student join flow
â”‚   â”œâ”€â”€ drawing.spec.ts           # Test drawing and stroke streaming
â”‚   â”œâ”€â”€ teacher-controls.spec.ts  # Test lock/freeze/clear/kick
â”‚   â””â”€â”€ reconnection.spec.ts      # Test reconnection handling
â”‚
â””â”€â”€ fixtures/                     # Test fixtures
    â””â”€â”€ testData.ts               # Sample room data, etc.
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

- Stage 0-3 complete: Repo structure implemented and used through shapes/toolbar work
- **Stage 4 (in progress)**: iPad validation and test hardening
- **Stage 5**: Advanced classroom controls and text input mode
- **Stage 6**: Scale testing and optimization
- **Stage 7**: IIS deployment prep

Note: This is a Stage 0 reference document. For current status, see docs/WhitePad Project Plan.md.
