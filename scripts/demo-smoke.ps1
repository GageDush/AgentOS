$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $RepoRoot
try {
  pnpm db:reset
  if ($LASTEXITCODE -ne 0) {
    Write-Host "db:reset skipped (database may be locked while API is running)" -ForegroundColor Yellow
  }
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -TimeoutSec 5
  Write-Host "API health: $($health | ConvertTo-Json -Compress)"
  $demo = Invoke-RestMethod -Uri "http://127.0.0.1:8787/mission/demo/run" -Method POST -ContentType "application/json" -Body "{}" -TimeoutSec 120
  $runId = $demo.run.id
  if (-not $runId) { throw "Demo response missing run.id" }
  Write-Host "Demo mission: $($demo.mission.id) run: $runId status: $($demo.run.status)"
  Write-Host "Result: $($demo.result.summary)"
  exit 0
} catch {
  Write-Host "Smoke failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Start stack first: pnpm control -Action RestartWithTunnel"
  exit 1
} finally {
  Pop-Location
}
