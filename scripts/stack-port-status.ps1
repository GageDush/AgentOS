<#
  stack-port-status.ps1 — one-glance view of the AgentOS UI port story.

  Prints: the active override (if any), the configured .env port, who is
  listening on the candidate UI ports + API/gateway, and the cloudflared
  ingress targets — so you can spot a zombie holding :3000 and decide whether
  to run `pnpm stack:repair` or (last resort) reboot.

  Usage:  pnpm stack:port    (or)   powershell -File scripts/stack-port-status.ps1
#>

$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot
$override = Join-Path $root ".agentos/state/command-center-port.override"
$envFile = Join-Path $root ".env"

Write-Host "== AgentOS stack port status ==" -ForegroundColor Cyan

if (Test-Path $override) {
  Write-Host ("Override file : {0}  -> {1}" -f $override, ((Get-Content $override -Raw).Trim())) -ForegroundColor Yellow
} else {
  Write-Host "Override file : (none - using .env AGENTOS_COMMAND_CENTER_PORT)"
}

$envPort = $null
if (Test-Path $envFile) {
  $m = Select-String -Path $envFile -Pattern '^AGENTOS_COMMAND_CENTER_PORT=(.+)$'
  if ($m) { $envPort = $m.Matches[0].Groups[1].Value.Trim() }
}
$configuredPort = if ($null -eq $envPort -or $envPort -eq "") { "(unset)" } else { $envPort }
Write-Host ("Configured    : .env AGENTOS_COMMAND_CENTER_PORT = {0}" -f $configuredPort)

Write-Host ""
Write-Host "Listeners:"
foreach ($p in 3000, 3001, 3002, 3003, 8787, 8790) {
  $conns = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
  if ($conns) {
    foreach ($c in ($conns | Sort-Object OwningProcess -Unique)) {
      $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
      $procName = if ($proc -and $proc.ProcessName) { $proc.ProcessName } else { "?" }
      Write-Host ("  :{0,-5} PID {1,-7} {2}" -f $p, $c.OwningProcess, $procName) -ForegroundColor Green
    }
  } else {
    Write-Host ("  :{0,-5} free" -f $p) -ForegroundColor DarkGray
  }
}

Write-Host ""
$cf = Join-Path $env:USERPROFILE ".cloudflared/config.yml"
if (Test-Path $cf) {
  Write-Host ("cloudflared ingress targets ({0}):" -f $cf)
  Select-String -Path $cf -Pattern '(localhost|127\.0\.0\.1):\d+' | ForEach-Object { Write-Host ("  " + $_.Line.Trim()) }
} else {
  Write-Host ("cloudflared config: not found at {0}" -f $cf) -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "If :3000 is held by a zombie and the override has escalated, run:" -ForegroundColor Cyan
Write-Host "  pnpm stack:repair        # force-stop + restart on the configured port"
Write-Host "  pnpm stack:port          # re-check"
Write-Host "See .agentos/state/README.md for override cleanup + reboot-as-last-resort."
