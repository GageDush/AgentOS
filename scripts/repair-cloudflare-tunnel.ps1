#Requires -RunAsAdministrator
#Requires -Version 5.1
<#
.SYNOPSIS
  Repair a stuck or disconnected AgentOS Cloudflare tunnel.

.DESCRIPTION
  1. Stops cloudflared processes and the Windows service (including StopPending)
  2. Restarts the cloudflared service when installed
  3. Falls back to user-mode `cloudflared tunnel run agentos` if the service cannot connect
  4. Verifies tunnel connector status and optional HTTPS health endpoints

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File C:\Users\gaged\Documents\AgenOS\scripts\repair-cloudflare-tunnel.ps1
#>
param(
  [string]$TunnelName = "agentos",
  [switch]$SkipHealthCheck,
  [switch]$UseWindowsService
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Text) { Write-Host "  >> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "  [OK] $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "  [!!] $Text" -ForegroundColor Yellow }
function Write-Bad([string]$Text) { Write-Host "  [XX] $Text" -ForegroundColor Red }

function Get-CloudflaredPath() {
  $candidates = @(
    "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
    "$env:ProgramFiles\cloudflared\cloudflared.exe"
  )
  foreach ($path in $candidates) {
    if (Test-Path $path) { return $path }
  }
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Get-TunnelInfoOutput([string]$CloudflaredPath) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    return & $CloudflaredPath tunnel info $TunnelName 2>&1 | ForEach-Object { "$_" } | Out-String
  } finally {
    $ErrorActionPreference = $prev
  }
}

function Test-TunnelConnected([string]$CloudflaredPath) {
  $output = Get-TunnelInfoOutput $CloudflaredPath
  return $output -match "CONNECTOR ID" -and $output -notmatch "does not have any active connection"
}

function Stop-CloudflaredServiceHard() {
  $svc = Get-Service cloudflared -ErrorAction SilentlyContinue
  if (-not $svc) {
    Write-Warn "cloudflared Windows service is not installed."
    return
  }

  Write-Step "Stopping cloudflared service (status: $($svc.Status))..."
  if ($svc.Status -eq "StopPending") {
    try {
      Stop-Service cloudflared -Force -ErrorAction SilentlyContinue
    } catch {
      Write-Warn "Stop-Service failed while StopPending; killing service process via sc.exe."
      & sc.exe stop cloudflared | Out-Null
    }
    Start-Sleep -Seconds 3
  } elseif ($svc.Status -eq "Running") {
    Stop-Service cloudflared -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }

  $svc = Get-Service cloudflared -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -ne "Stopped") {
    Write-Warn "Service still $($svc.Status); forcing taskkill on cloudflared.exe."
    & taskkill /F /IM cloudflared.exe /T 2>$null | Out-Null
    Start-Sleep -Seconds 2
  } else {
    Write-Ok "cloudflared service stopped."
  }

  if ($svc -and $svc.StartType -ne "Disabled" -and -not $UseWindowsService) {
    Write-Step "Disabling auto-start for cloudflared service (user-mode tunnel is more reliable on this machine)."
    Set-Service cloudflared -StartupType Disabled -ErrorAction SilentlyContinue
    Write-Ok "Service start type set to Disabled. Pass -UseWindowsService to re-enable."
  }
}

function Start-CloudflaredService() {
  $svc = Get-Service cloudflared -ErrorAction SilentlyContinue
  if (-not $svc) {
    Write-Warn "No cloudflared service to start."
    return $false
  }
  Write-Step "Starting cloudflared service..."
  Start-Service cloudflared -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 5
  $svc.Refresh()
  Write-Ok "Service status: $($svc.Status)"
  return $svc.Status -eq "Running"
}

function Start-CloudflaredUserMode([string]$CloudflaredPath) {
  $existing = Get-Process cloudflared -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Warn "cloudflared process already running (pid $($existing.Id))."
  } else {
    Write-Step "Starting user-mode tunnel: cloudflared tunnel run $TunnelName"
    Start-Process -FilePath $CloudflaredPath -ArgumentList "tunnel", "run", $TunnelName -WindowStyle Minimized
    Start-Sleep -Seconds 6
    Write-Ok "Started cloudflared tunnel run."
  }
}

function Test-HttpOk([string]$Url, [int]$TimeoutSec = 10) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
    return @{ Ok = $true; Status = [int]$response.StatusCode }
  } catch {
    return @{ Ok = $false; Error = $_.Exception.Message }
  }
}

Write-Host ""
Write-Host "  AgentOS Cloudflare Tunnel Repair" -ForegroundColor Cyan
Write-Host "  -------------------------------" -ForegroundColor DarkGray
Write-Host ""

$cf = Get-CloudflaredPath
if (-not $cf) {
  Write-Bad "cloudflared not found. Install with: winget install Cloudflare.cloudflared"
  exit 1
}
Write-Ok "Using cloudflared: $cf"

Write-Step "Stopping cloudflared processes..."
Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  Write-Ok "Stopped cloudflared pid $($_.Id)."
}

Stop-CloudflaredServiceHard

$serviceStarted = $false
if ($UseWindowsService) {
  Set-Service cloudflared -StartupType Automatic -ErrorAction SilentlyContinue
  $serviceStarted = Start-CloudflaredService
}

if (-not (Test-TunnelConnected $cf)) {
  if ($serviceStarted) {
    Write-Warn "Service is running but tunnel has no active connection; switching to user-mode."
    Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object {
      & taskkill /F /PID $_.Id /T 2>$null | Out-Null
    }
    Stop-Service cloudflared -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
  Start-CloudflaredUserMode $cf
}

Start-Sleep -Seconds 4
if (Test-TunnelConnected $cf) {
  Write-Ok "Tunnel '$TunnelName' has an active connector."
} else {
  Write-Bad "Tunnel '$TunnelName' still has no active connection."
  Write-Warn "Check %USERPROFILE%\.cloudflared\config.yml and run: cloudflared tunnel login"
  exit 1
}

if (-not $SkipHealthCheck) {
  Write-Step "Checking public endpoints..."
  foreach ($entry in @(
    @{ Label = "api.flous.dev/health"; Url = "https://api.flous.dev/health" },
    @{ Label = "flous.dev"; Url = "https://flous.dev" }
  )) {
    $probe = Test-HttpOk $entry.Url
    if ($probe.Ok) {
      Write-Ok "$($entry.Label) -> $($probe.Status)"
    } else {
      Write-Warn "$($entry.Label) not reachable yet: $($probe.Error)"
    }
  }
}

Write-Host ""
Write-Ok "Repair complete."
Write-Host "  If AgentOS API/UI are down, run AgentOS Control -> Restart + tunnel" -ForegroundColor DarkGray
Write-Host ""
