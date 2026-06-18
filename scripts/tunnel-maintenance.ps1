#Requires -Version 5.1
<#
.SYNOPSIS
  Toggle "intentional downtime" for the AgentOS tunnel.

.DESCRIPTION
  Creates / removes <repo>\.tunnel\MAINTENANCE. While that flag exists (and has
  not expired), the agentos-tunnel-health scheduled task reports MAINTENANCE
  MODE instead of alarming, and the watchdog will not repair the tunnel.

.EXAMPLE
  powershell -File scripts\tunnel-maintenance.ps1 -On
  powershell -File scripts\tunnel-maintenance.ps1 -On -Minutes 90
  powershell -File scripts\tunnel-maintenance.ps1 -Off
  powershell -File scripts\tunnel-maintenance.ps1 -Status
#>
param(
  [switch]$On,
  [switch]$Off,
  [switch]$Status,
  [int]$Minutes = 0,
  [string]$Reason = "manual maintenance"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir
$TunnelDir = Join-Path $RepoRoot ".tunnel"
$MaintFlag = Join-Path $TunnelDir "MAINTENANCE"
if (-not (Test-Path $TunnelDir)) { New-Item -ItemType Directory -Path $TunnelDir -Force | Out-Null }

if ($Off) {
  if (Test-Path $MaintFlag) { Remove-Item $MaintFlag -Force; Write-Host "[OK] Maintenance OFF." -ForegroundColor Green }
  else { Write-Host "[--] Maintenance was already off." -ForegroundColor Yellow }
  return
}

if ($Status -or (-not $On -and -not $Off)) {
  if (Test-Path $MaintFlag) {
    $body = (Get-Content $MaintFlag -Raw)
    Write-Host "[ON] Maintenance ACTIVE." -ForegroundColor Cyan
    Write-Host $body
  } else {
    Write-Host "[OFF] Maintenance is off." -ForegroundColor Green
  }
  return
}

if ($On) {
  $lines = @()
  if ($Minutes -gt 0) {
    $expiry = (Get-Date).AddMinutes($Minutes).ToString("o")
    $lines += $expiry                      # first line = ISO expiry (auto-honored)
    $lines += "reason: $Reason"
    $lines += "set: $((Get-Date).ToString('o'))"
    Set-Content -Path $MaintFlag -Value ($lines -join "`r`n") -Encoding UTF8
    Write-Host "[OK] Maintenance ON until $expiry." -ForegroundColor Green
  } else {
    $lines += "indefinite"
    $lines += "reason: $Reason"
    $lines += "set: $((Get-Date).ToString('o'))"
    Set-Content -Path $MaintFlag -Value ($lines -join "`r`n") -Encoding UTF8
    Write-Host "[OK] Maintenance ON (indefinite). Run with -Off to clear." -ForegroundColor Green
  }
}
