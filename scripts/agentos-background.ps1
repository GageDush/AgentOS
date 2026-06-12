#Requires -Version 5.1
<#
.SYNOPSIS
  Start or stop AgentOS without visible terminal windows.

.EXAMPLE
  powershell -File scripts/agentos-background.ps1 -Action Start
  powershell -File scripts/agentos-background.ps1 -Action Stop
#>
param(
  [ValidateSet("Start", "Stop", "Restart", "Status", "InstallAutostart", "UninstallAutostart")]
  [string]$Action = "Start",
  [switch]$IfNotRunning,
  [switch]$IncludeTunnel
)

$control = Join-Path $PSScriptRoot "agentos-control.ps1"

$common = @{ NonInteractive = $true }

switch ($Action) {
  "Start" {
    $invoke = @{ Action = $(if ($IncludeTunnel) { "StartWithTunnel" } else { "Start" }); NonInteractive = $true }
    if ($IfNotRunning) { $invoke.IfNotRunning = $true }
    & $control @invoke
  }
  "Stop" { & $control @common -Action Stop }
  "Restart" {
    $invoke = @{ Action = $(if ($IncludeTunnel) { "RestartWithTunnel" } else { "Restart" }) } + $common
    & $control @invoke
  }
  "Status" { & $control @common -Action Health }
  "InstallAutostart" { & $control @common -Action InstallAutostart }
  "UninstallAutostart" { & $control @common -Action UninstallAutostart }
}
