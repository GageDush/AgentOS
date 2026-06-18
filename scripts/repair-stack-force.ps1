#Requires -Version 5.1
$ErrorActionPreference = "Continue"
$RepoRoot = "C:\Users\gaged\Documents\AgenOS"
$LogFile = Join-Path $RepoRoot ".agentos\logs\repair-stack.log"
$StateDir = Join-Path $RepoRoot ".agentos\state"
$OverrideFile = Join-Path $StateDir "command-center-port.override"
$CloudflaredConfig = Join-Path $env:USERPROFILE ".cloudflared\config.yml"

function Log([string]$msg) {
  $line = "$(Get-Date -Format o)  $msg"
  if (-not (Test-Path (Split-Path $LogFile -Parent))) {
    New-Item -ItemType Directory -Force -Path (Split-Path $LogFile -Parent) | Out-Null
  }
  Add-Content -Path $LogFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
}

function Test-PortFree([int]$Port) {
  return -not (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Kill-Tree([int]$procId, [string]$label) {
  if ($procId -le 0) { return $false }
  $r = Start-Process -FilePath taskkill.exe -ArgumentList "/F", "/T", "/PID", "$procId" -Wait -PassThru -WindowStyle Hidden
  Log "taskkill $label pid $procId exit=$($r.ExitCode)"
  return $r.ExitCode -eq 0
}

function Get-RootCmdPid([int]$procId) {
  $current = $procId
  $rootCmd = $null
  for ($i = 0; $i -lt 20; $i++) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction SilentlyContinue
    if (-not $p) { break }
    if ($p.Name -ieq "cmd.exe") { $rootCmd = $current }
    if (-not $p.ParentProcessId -or $p.ParentProcessId -eq $current) { break }
    $current = $p.ParentProcessId
  }
  return $rootCmd
}

function Sync-CloudflaredUiPort([int]$Port) {
  if (-not (Test-Path $CloudflaredConfig)) {
    Log "cloudflared config missing at $CloudflaredConfig"
    return $false
  }
  $text = Get-Content $CloudflaredConfig -Raw
  $updated = $text -replace 'http://127\.0\.0\.1:\d{4,5}(?=\s*$)', "http://127.0.0.1:$Port"
  $updated = $updated -replace '(hostname: (?:flous\.dev|app\.flous\.dev|agentos\.flous\.dev)\s+service: )http://127\.0\.0\.1:\d+', "`${1}http://127.0.0.1:$Port"
  if ($updated -eq $text) {
    $updated = $text -replace '(hostname: flous\.dev\s+service: )http://127\.0\.0\.1:\d+', "`${1}http://127.0.0.1:$Port"
    $updated = $updated -replace '(hostname: app\.flous\.dev\s+service: )http://127\.0\.0\.1:\d+', "`${1}http://127.0.0.1:$Port"
    $updated = $updated -replace '(hostname: agentos\.flous\.dev\s+service: )http://127\.0\.0\.1:\d+', "`${1}http://127.0.0.1:$Port"
  }
  Set-Content -Path $CloudflaredConfig -Value $updated -Encoding UTF8
  Log "cloudflared UI ingress -> 127.0.0.1:$Port"
  return $true
}

function Start-CommandCenterOnly([int]$Port) {
  New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
  Set-Content -Path $OverrideFile -Value "$Port" -Encoding ASCII -NoNewline
  Log "wrote port override $Port"

  $logDir = Join-Path $RepoRoot ".agentos\logs"
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $logFile = Join-Path $logDir "command-center-$Port.log"
  $inner = "cd /d `"$RepoRoot`" && set AGENTOS_COMMAND_CENTER_PORT=$Port&& set PORT=$Port&& pnpm --filter @agentos/command-center dev >> `"$logFile`" 2>&1"
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $inner -WorkingDirectory $RepoRoot -WindowStyle Hidden -PassThru
  Log "started command-center on $Port (launcher pid $($proc.Id))"
}

Log "===== force-repair start (pid=$PID user=$env:USERNAME) ====="

$defaultUiPort = 3000
$envPath = Join-Path $RepoRoot ".env"
if (Test-Path $envPath) {
  $m = Select-String -Path $envPath -Pattern '^\s*AGENTOS_COMMAND_CENTER_PORT=(\d+)\s*$' | Select-Object -First 1
  if ($m) { $defaultUiPort = [int]$m.Matches[0].Groups[1].Value }
}

$killedUi = $false
$conn = Get-NetTCPConnection -LocalPort $defaultUiPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  $root = Get-RootCmdPid $conn.OwningProcess
  if ($root) { Kill-Tree $root "root-cmd" | Out-Null }
  $killedUi = Kill-Tree $conn.OwningProcess "listener:$defaultUiPort"
  Start-Sleep -Seconds 2
}

if (-not $killedUi -and (Get-NetTCPConnection -LocalPort $defaultUiPort -State Listen -ErrorAction SilentlyContinue)) {
  Log "port $defaultUiPort still bound after kill attempts; selecting alternate UI port"
  $altPort = $null
  foreach ($candidate in 3002, 3003, 3010, 3011, 3020) {
    if (Test-PortFree $candidate) { $altPort = $candidate; break }
  }
  if (-not $altPort) {
    Log "no alternate UI port available"
    exit 1
  }

  $nextDir = Join-Path $RepoRoot "apps\command-center\.next"
  if (Test-Path $nextDir) { Remove-Item -Recurse -Force $nextDir -ErrorAction SilentlyContinue }
  Start-CommandCenterOnly $altPort
  Sync-CloudflaredUiPort $altPort | Out-Null
  & (Join-Path $RepoRoot "scripts\agentos-control.ps1") -Action StartWithTunnel -NonInteractive *>&1 | ForEach-Object { Log "$_" }

  $deadline = (Get-Date).AddSeconds(180)
  while ((Get-Date) -lt $deadline) {
    try {
      $code = (Invoke-WebRequest -Uri "http://127.0.0.1:$altPort/" -UseBasicParsing -TimeoutSec 15).StatusCode
      if ($code -ge 200 -and $code -lt 400) {
        Log "post-check home=$code on port $altPort"
        Log "===== force-repair end (port bypass) ====="
        exit 0
      }
    } catch {
      Log "waiting $altPort : $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 6
  }
  Log "post-check TIMEOUT on port $altPort"
  exit 1
}

$nextDir = Join-Path $RepoRoot "apps\command-center\.next"
if (Test-Path $nextDir) { Remove-Item -Recurse -Force $nextDir -ErrorAction SilentlyContinue }

Set-Location $RepoRoot
if (Test-Path $OverrideFile) { Remove-Item -Force $OverrideFile -ErrorAction SilentlyContinue }
& (Join-Path $RepoRoot "scripts\agentos-control.ps1") -Action StartWithTunnel -NonInteractive *>&1 | ForEach-Object { Log "$_" }

$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
  try {
    $code = (Invoke-WebRequest -Uri "http://127.0.0.1:$defaultUiPort/" -UseBasicParsing -TimeoutSec 15).StatusCode
    if ($code -ge 200 -and $code -lt 400) {
      Log "post-check home=$code"
      Log "===== force-repair end ====="
      exit 0
    }
  } catch {
    Log "waiting home: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 5
}

Log "post-check home=TIMEOUT"
exit 1
