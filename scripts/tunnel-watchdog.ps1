#Requires -Version 5.1
<#
.SYNOPSIS
  AgentOS Cloudflare tunnel watchdog. Repairs the tunnel when the Claude
  scheduled task `agentos-tunnel-health` reports an outage.

.DESCRIPTION
  Reads shared state from <repo>\.tunnel\ :
    - MAINTENANCE         : if present (and not expired) -> never repair
    - repair-request.json : an outage was reported -> consider repairing
    - last-repair.txt     : debounce stamp (cooldown)
  On each invocation:
    1. If maintenance is active -> log and exit.
    2. If a repair request exists:
         a. Re-check the public endpoints itself. If both are healthy now,
            the tunnel recovered on its own -> clear request, log, exit.
         b. If still down and the cooldown has elapsed -> run
            repair-cloudflare-tunnel.ps1, stamp last-repair, archive the
            request, re-check, and log the outcome.
         c. If cooldown has NOT elapsed -> log skip and exit.
  Designed to be run every minute by a Windows Scheduled Task as SYSTEM with
  highest privileges (the repair script requires admin). Also supports a
  foreground -Loop mode for manual/dev use.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\tunnel-watchdog.ps1 -Once

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\tunnel-watchdog.ps1 -Loop -IntervalSeconds 60
#>
param(
  [switch]$Once,
  [switch]$Loop,
  [int]$IntervalSeconds = 60,
  [int]$CooldownMinutes = 10,
  [string]$TunnelName = "agentos",
  [string]$ApiUrl = "https://api.flous.dev/health",
  [string]$UiUrl  = "https://flous.dev",
  [switch]$Force   # ignore cooldown and self re-check; repair if a request exists
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# --- Resolve paths relative to this script -------------------------------
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot    = Split-Path -Parent $ScriptDir
$TunnelDir   = Join-Path $RepoRoot ".tunnel"
$RepairScript = Join-Path $ScriptDir "repair-cloudflare-tunnel.ps1"

$MaintFlag   = Join-Path $TunnelDir "MAINTENANCE"
$RequestFile = Join-Path $TunnelDir "repair-request.json"
$LastRepair  = Join-Path $TunnelDir "last-repair.txt"
$LogFile     = Join-Path $TunnelDir "watchdog.log"
$HistFile    = Join-Path $TunnelDir "repair-history.log"

if (-not (Test-Path $TunnelDir)) { New-Item -ItemType Directory -Path $TunnelDir -Force | Out-Null }

function Write-Log([string]$Msg) {
  $line = "{0}  {1}" -f (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK"), $Msg
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# --- Is maintenance active? (presence; optional ISO expiry on first line) -
function Test-Maintenance {
  if (-not (Test-Path $MaintFlag)) { return $false }
  $first = (Get-Content $MaintFlag -TotalCount 1 -ErrorAction SilentlyContinue)
  if ($first) {
    $expiry = $null
    if ([datetime]::TryParse($first, [ref]$expiry)) {
      if ((Get-Date) -gt $expiry) {
        Write-Log "MAINTENANCE flag expired at $($expiry.ToString('o')); ignoring and removing."
        Remove-Item $MaintFlag -Force -ErrorAction SilentlyContinue
        return $false
      }
    }
  }
  return $true
}

# --- Endpoint health: up if 200 OR any non-empty body --------------------
function Test-Endpoint([string]$Url) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 12 -MaximumRedirection 3
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { return $true }
    if ($r.Content -and $r.Content.Trim().Length -gt 0) { return $true }
    return $false
  } catch {
    return $false
  }
}

function Invoke-Repair {
  Write-Log "Running repair: $RepairScript -TunnelName $TunnelName"
  try {
    $output = & $RepairScript -TunnelName $TunnelName -SkipHealthCheck *>&1 | Out-String
    Write-Log "Repair completed. Output follows:"
    foreach ($l in ($output -split "`r?`n")) { if ($l.Trim()) { Add-Content -Path $LogFile -Value "      | $l" -Encoding UTF8 } }
  } catch {
    Write-Log "Repair THREW: $($_.Exception.Message)"
  }
  Set-Content -Path $LastRepair -Value (Get-Date).ToString("o") -Encoding UTF8
}

function Test-CooldownElapsed {
  if ($Force) { return $true }
  if (-not (Test-Path $LastRepair)) { return $true }
  $last = $null
  $raw = (Get-Content $LastRepair -TotalCount 1 -ErrorAction SilentlyContinue)
  if (-not [datetime]::TryParse($raw, [ref]$last)) { return $true }
  $elapsed = (Get-Date) - $last
  return ($elapsed.TotalMinutes -ge $CooldownMinutes)
}

function Invoke-WatchdogTick {
  # 1. Maintenance wins.
  if (Test-Maintenance) {
    Write-Log "MAINTENANCE active -> skipping (no repair)."
    return
  }

  # 2. No request -> nothing to do.
  if (-not (Test-Path $RequestFile)) { return }

  $payload = ""
  try { $payload = (Get-Content $RequestFile -Raw -ErrorAction SilentlyContinue) } catch {}
  Write-Log "Repair request present: $($payload -replace '\s+',' ')"

  # 3. Self re-check (skip if -Force). The tunnel may have recovered on its own.
  if (-not $Force) {
    $apiUp = Test-Endpoint $ApiUrl
    $uiUp  = Test-Endpoint $UiUrl
    if ($apiUp -and $uiUp) {
      Write-Log "Self-check: both endpoints healthy -> tunnel recovered, no repair needed. Clearing request."
      Add-Content -Path $HistFile -Value ("{0}  RECOVERED  {1}" -f (Get-Date).ToString('o'), ($payload -replace '\s+',' ')) -Encoding UTF8
      Remove-Item $RequestFile -Force -ErrorAction SilentlyContinue
      return
    }
    Write-Log "Self-check: api=$apiUp ui=$uiUp -> still down."
  }

  # 4. Debounce.
  if (-not (Test-CooldownElapsed)) {
    Write-Log "Cooldown not elapsed (< $CooldownMinutes min since last repair) -> skipping this tick."
    return
  }

  # 5. Repair, archive, verify.
  Invoke-Repair
  Add-Content -Path $HistFile -Value ("{0}  REPAIRED   {1}" -f (Get-Date).ToString('o'), ($payload -replace '\s+',' ')) -Encoding UTF8
  Remove-Item $RequestFile -Force -ErrorAction SilentlyContinue

  Start-Sleep -Seconds 5
  $apiUp = Test-Endpoint $ApiUrl
  $uiUp  = Test-Endpoint $UiUrl
  Write-Log "Post-repair check: api=$apiUp ui=$uiUp"
}

# --- Entrypoint ----------------------------------------------------------
if ($Loop) {
  Write-Log "Watchdog started in LOOP mode (interval ${IntervalSeconds}s, cooldown ${CooldownMinutes}m)."
  while ($true) {
    try { Invoke-WatchdogTick } catch { Write-Log "Tick error: $($_.Exception.Message)" }
    Start-Sleep -Seconds $IntervalSeconds
  }
} else {
  # default: single-shot (for Task Scheduler)
  try { Invoke-WatchdogTick } catch { Write-Log "Tick error: $($_.Exception.Message)" }
}
