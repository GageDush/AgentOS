#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $RepoRoot
try {
  Write-Host "== AgentOS ground-up smoke (one pass) ==" -ForegroundColor Cyan

  Write-Host "Build checks (pre-patch env)..." -ForegroundColor Gray
  node scripts/smoke-full.mjs --build-only
  if ($LASTEXITCODE -ne 0) { throw "build phase failed" }

  Write-Host "Patching .env for spine mode..." -ForegroundColor Gray
  node scripts/patch-env-spine.mjs
  if ($LASTEXITCODE -ne 0) { throw "env patch failed" }

  Write-Host "Restarting stack..." -ForegroundColor Gray
  pnpm stack:stop 2>$null
  Start-Sleep -Seconds 4
  pnpm stack:background
  if ($LASTEXITCODE -ne 0) { throw "stack start failed" }

  Write-Host "Waiting for API (up to 90s)..." -ForegroundColor Gray
  $deadline = (Get-Date).AddSeconds(90)
  $apiUp = $false
  while ((Get-Date) -lt $deadline) {
    try {
      $h = Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -TimeoutSec 3
      if ($h.ok) { $apiUp = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
  }
  if (-not $apiUp) { throw "API did not become healthy" }
  Write-Host "API is up." -ForegroundColor Green

  node scripts/smoke-full.mjs --live-only
  if ($LASTEXITCODE -ne 0) { throw "live spine phase failed" }

  pnpm discord:post-spine-summary
  if ($LASTEXITCODE -ne 0) { Write-Host "Discord post skipped or failed (non-fatal)." -ForegroundColor Yellow }

  Write-Host "Ground-up smoke PASSED." -ForegroundColor Green
  exit 0
} catch {
  Write-Host "Ground-up smoke FAILED: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
