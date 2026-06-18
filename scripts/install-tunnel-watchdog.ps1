#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Register (or remove) the AgentOS Tunnel Watchdog as a Windows Scheduled Task.

.DESCRIPTION
  Creates a task named "AgentOS Tunnel Watchdog" that runs
  scripts\tunnel-watchdog.ps1 -Once every minute, as SYSTEM, with highest
  privileges (the repair script requires admin), starting at boot and whenever
  the machine becomes available. Run this from an elevated PowerShell.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\install-tunnel-watchdog.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\install-tunnel-watchdog.ps1 -Uninstall
#>
param(
  [string]$TaskName = "AgentOS Tunnel Watchdog",
  [int]$IntervalMinutes = 1,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Watchdog  = Join-Path $ScriptDir "tunnel-watchdog.ps1"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[OK] Removed scheduled task '$TaskName'." -ForegroundColor Green
  } else {
    Write-Host "[--] Task '$TaskName' not found; nothing to remove." -ForegroundColor Yellow
  }
  return
}

if (-not (Test-Path $Watchdog)) { throw "Watchdog script not found: $Watchdog" }

$psExe  = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
$action = New-ScheduledTaskAction -Execute $psExe `
  -Argument ("-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"{0}`" -Once" -f $Watchdog)

# Repeating trigger (every N minutes, ~indefinitely) + a boot trigger.
$repeat = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(1)) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$boot = New-ScheduledTaskTrigger -AtStartup

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($repeat, $boot) `
  -Principal $principal -Settings $settings `
  -Description "Repairs the AgentOS Cloudflare tunnel when the agentos-tunnel-health task reports an outage." | Out-Null

Write-Host "[OK] Registered '$TaskName' (every $IntervalMinutes min, as SYSTEM, highest privileges)." -ForegroundColor Green
Write-Host "     Watchdog : $Watchdog"
Write-Host "     Logs     : $((Join-Path (Split-Path -Parent $ScriptDir) '.tunnel\watchdog.log'))"
Write-Host "     Test now : Start-ScheduledTask -TaskName '$TaskName'"
