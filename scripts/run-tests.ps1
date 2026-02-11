$ErrorActionPreference = "Stop"

Write-Host "Running backend tests..."
dotnet test tests\WhitePad.Server.Tests\WhitePad.Server.Tests.csproj

Write-Host "Running frontend tests..."
Push-Location src\WhitePad.Web
try {
  npm install
  npm run test
} finally {
  Pop-Location
}
