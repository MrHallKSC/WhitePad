# WhitePad Testing Guide

This document describes the automated and manual tests in WhitePad, what they cover, and how to run them.

## Contents

1. Automated Tests
2. Manual Tests
3. CI (GitHub Actions)
4. Troubleshooting

---

## 1. Automated Tests

### Backend (.NET / xUnit)

**Location**
- `tests/WhitePad.Server.Tests/`

**What these tests cover**
- `InMemoryRoomStateManager`
  - room creation (IDs, tokens, timestamps)
  - token validation
  - student add/remove behavior and auto-naming
  - teacher session updates
  - lookup by connection ID
- `TokenGenerator`
  - room ID format (GUID)
  - join token length and allowed character set

**How to run**
```bash
dotnet test tests/WhitePad.Server.Tests/WhitePad.Server.Tests.csproj
```

### Frontend (Vitest)

**Location**
- `src/WhitePad.Web/src/shared/utils/__tests__/`
- `src/WhitePad.Web/src/student/hooks/waitingRoomStateMachine.test.ts`

**What these tests cover**
- `StrokeBatcher` (point batching, timed flush, manual flush)
- `renderShape` (canvas drawing logic for line/rectangle/circle/arrow/axes, dashed mode)
- `waitingRoomStateMachine` (waiting-room and lock-state transitions)

**How to run**
```bash
cd src/WhitePad.Web
npm run test
```

### Run All Tests (PowerShell)

**Location**
- `scripts/run-tests.ps1`

**How to run**
```powershell
./scripts/run-tests.ps1
```

---

## 2. Manual Tests

### Stage 4 Regression Matrix

**Location**
- `docs/stage4-regression-test-matrix.md`

**What it covers**
- Waiting-room join flow and unlock behavior
- Classroom lock overlay behavior
- Viewer mode sync
- iOS picker overlay layering
- iPad palm/multi-touch rejection

---

## 3. CI (GitHub Actions)

**Workflow**
- `.github/workflows/ci.yml`

**What it runs**
- Backend tests (`dotnet test`)
- Frontend tests (`npm run test`)

**When it runs**
- On every push
- On every pull request

---

## 4. Troubleshooting

### Backend tests fail to restore
- Ensure the .NET 8 SDK is installed.
- Run `dotnet --info` to verify.

### Frontend tests fail to install or run
- Ensure Node.js 20+ is installed.
- Run `node -v` and `npm -v`.
- If dependencies are missing, run:
  ```bash
  cd src/WhitePad.Web
  npm install
  ```

### Test failures around floating-point values
- Some canvas math uses floating-point values. Assertions may need `toBeCloseTo` instead of strict equality.
