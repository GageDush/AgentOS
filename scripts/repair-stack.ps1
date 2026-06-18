#Requires -Version 5.1
<#
.SYNOPSIS
  Hard-restart AgentOS when dev stack is stuck or Command Center returns 500.

.EXAMPLE
  pwsh -File scripts/repair-stack.ps1
  pwsh -File scripts/repair-stack.ps1 -IncludeTunnel
#>
param(
  [switch]$IncludeTunnel
)

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$LogFile = Join-Path $RepoRoot ".agentos\logs\repair-stack.log"
$Ports = @(8787, 3000, 8790)

function Write-RepairLog([string]$Message) {
  $line = "$(Get-Date -Format o)  $Message"
  $dir = Split-Path $LogFile -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

function Stop-PortTree([int]$Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $conn) { return $true }
  $procId = $conn.OwningProcess
  $null = Start-Process -FilePath taskkill.exe -ArgumentList "/F", "/T", "/PID", "$procId" -Wait -PassThru -WindowStyle Hidden
  Start-Sleep -Milliseconds 500
  $still = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($still) {
    Write-RepairLog "WARN port $Port still held after taskkill /T pid $procId"
    return $false
  }
  Write-RepairLog "OK freed port $Port (was pid $procId)"
  return $true
}

Write-RepairLog "===== repair-stack start ====="
Set-Location $RepoRoot

$control = Join-Path $RepoRoot "scripts\agentos-control.ps1"
if ($IncludeTunnel) {
  & $control -Action RestartWithTunnel -NonInteractive
} else {
  & $control -Action Restart -NonInteractive
}

if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
  Write-RepairLog "control script exit=$LASTEXITCODE; attempting direct port cleanup"
  foreach ($port in $Ports) { Stop-PortTree $port | Out-Null }
  $nextDir = Join-Path $RepoRoot "apps\command-center\.next"
  if (Test-Path $nextDir) {
    Remove-Item -Recurse -Force $nextDir -ErrorAction SilentlyContinue
    Write-RepairLog "removed $nextDir"
  }
  & $control -Action Start -NonInteractive
  if ($IncludeTunnel) {
    & $control -Action StartWithTunnel -NonInteractive
  }
}

try {
  $homeStatus = (Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -UseBasicParsing -TimeoutSec 20).StatusCode
  Write-RepairLog "post-check home=$homeStatus"
} catch {
  Write-RepairLog "post-check home=FAIL $($_.Exception.Message)"
}

Write-RepairLog "===== repair-stack end ====="
