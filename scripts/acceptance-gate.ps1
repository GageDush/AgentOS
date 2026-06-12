$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $RepoRoot
try {
  Write-Host "== AgentOS acceptance gate ==" -ForegroundColor Cyan
  pnpm typecheck
  if ($LASTEXITCODE -ne 0) { throw "typecheck failed" }

  pnpm test
  if ($LASTEXITCODE -ne 0) { throw "unit tests failed" }

  pnpm agentos:validate-profiles
  if ($LASTEXITCODE -ne 0) { throw "profile validation failed" }

  pnpm discord:test
  if ($LASTEXITCODE -ne 0) { throw "discord tests failed" }

  $healthOk = $false
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -TimeoutSec 3
    $healthOk = [bool]$health.ok
  } catch {
    Write-Host "API not running - skipping live smoke (start with pnpm control -Action RestartWithTunnel)" -ForegroundColor Yellow
  }

  if ($healthOk) {
    & "$PSScriptRoot/demo-smoke.ps1"
    if ($LASTEXITCODE -ne 0) { throw "demo smoke failed" }
  }

  $e2eBase = $env:E2E_BASE_URL
  if ($healthOk -and $e2eBase) {
    pnpm test:e2e
    if ($LASTEXITCODE -ne 0) { throw "e2e tests failed" }
  } else {
    Write-Host "Skipping E2E (set E2E_BASE_URL=http://localhost:3000 with stack running)" -ForegroundColor Yellow
  }

  Write-Host "Acceptance gate passed." -ForegroundColor Green
  exit 0
} catch {
  Write-Host "Acceptance gate failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
