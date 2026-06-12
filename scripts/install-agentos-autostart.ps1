#Requires -Version 5.1
param([switch]$Uninstall)

$control = Join-Path $PSScriptRoot "agentos-control.ps1"
if ($Uninstall) {
  & $control -NonInteractive -Action UninstallAutostart
} else {
  & $control -NonInteractive -Action InstallAutostart
  Write-Host ""
  Write-Host "AgentOS will start in the background when you sign in to Windows." -ForegroundColor Green
  Write-Host "Use AgentOS Control -> Stop all, or: pnpm stack:stop" -ForegroundColor DarkGray
  Write-Host "Logs: .agentos\logs\" -ForegroundColor DarkGray
}
