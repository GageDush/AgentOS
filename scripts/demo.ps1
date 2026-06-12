# AgentOS one-shot demo bootstrap (Windows / WSL-friendly)
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $RepoRoot
try {
  Write-Host "AgentOS demo bootstrap" -ForegroundColor Cyan
  pnpm install
  if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
  pnpm db:reset
  pnpm sanitize:check
  pnpm env:check
  pnpm agentos:validate-profiles
  Write-Host ""
  Write-Host "Ready. Start stack:" -ForegroundColor Green
  Write-Host "  pnpm control -> Restart + tunnel"
  Write-Host "  or: pnpm dev:api && pnpm dev:stack"
  Write-Host ""
  Write-Host "URLs:" -ForegroundColor Green
  Write-Host "  http://localhost:3000"
  Write-Host "  http://127.0.0.1:8787/health"
  Write-Host "  https://flous.dev (when tunnel is up)"
} finally {
  Pop-Location
}
