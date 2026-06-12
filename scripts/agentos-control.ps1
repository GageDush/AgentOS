#Requires -Version 5.1
<#
.SYNOPSIS
  AgentOS desktop control panel - start, restart, health, and Discord ops.

.NOTES
  Launched from Desktop via AgentOS Control.cmd
#>
param(
  [switch]$NonInteractive,
  [switch]$IfNotRunning,
  [ValidateSet("Gui", "Menu", "Health", "Start", "StartWithTunnel", "Restart", "RestartWithTunnel", "Stop", "Backup", "RefreshDesktop", "InstallAutostart", "UninstallAutostart")]
  [string]$Action = "Gui"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$ApiPort = 8787
$UiPort = 3000
$GatewayPort = 8790
$BackupRoot = Join-Path $RepoRoot ".agentos\backups"
$DesktopLauncher = Join-Path $env:USERPROFILE "Desktop\AgentOS Control.cmd"
$script:GuiLogSink = $null

function Write-GuiLine([string]$Text, [string]$Level = "Info") {
  if ($script:GuiLogSink) {
    & $script:GuiLogSink $Text $Level
    return
  }
  switch ($Level) {
    "Ok" { Write-Host "  [OK]  $Text" -ForegroundColor Green }
    "Warn" { Write-Host "  [!!]  $Text" -ForegroundColor Yellow }
    "Bad" { Write-Host "  [XX]  $Text" -ForegroundColor Red }
    "Title" {
      Write-Host ""
      Write-Host "  AgentOS Control" -ForegroundColor Cyan
      Write-Host "  $Text" -ForegroundColor DarkGray
      Write-Host ("  " + ("-" * 52)) -ForegroundColor DarkGray
    }
    default { Write-Host "  ..    $Text" -ForegroundColor Gray }
  }
}

function Write-Title([string]$Text) { Write-GuiLine $Text "Title" }
function Write-Ok([string]$Text) { Write-GuiLine $Text "Ok" }
function Write-Warn([string]$Text) { Write-GuiLine $Text "Warn" }
function Write-Bad([string]$Text) { Write-GuiLine $Text "Bad" }
function Write-Info([string]$Text) { Write-GuiLine $Text "Info" }

function Get-ListenPid([int]$Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { return $conn.OwningProcess }
  return $null
}

function Test-HttpOk([string]$Url, [int]$TimeoutSec = 4) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
    return @{ Ok = $true; Status = [int]$response.StatusCode; Body = $response.Content }
  } catch {
    $status = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
    }
    return @{ Ok = $false; Status = $status; Error = $_.Exception.Message }
  }
}

function Stop-Port([int]$Port, [string]$Label) {
  $processId = Get-ListenPid $Port
  if (-not $processId) {
    Write-Info "$Label (port $Port) is not running."
    return $false
  }
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 600
  Write-Ok "Stopped $Label (pid $processId, port $Port)."
  return $true
}

function Wait-PortFree([int]$Port, [int]$TimeoutSec = 20) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (-not (Get-ListenPid $Port)) { return $true }
    Start-Sleep -Milliseconds 400
  }
  return -not (Get-ListenPid $Port)
}

function Stop-ProjectNodeProcesses {
  $repoPattern = [regex]::Escape($RepoRoot)
  $matches = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match $repoPattern }
  if (-not $matches) {
    Write-Info "No repo-scoped node.exe processes found."
    return 0
  }
  foreach ($proc in $matches) {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Ok "Stopped node.exe pid $($proc.ProcessId)."
  }
  return @($matches).Count
}

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

function Test-TunnelConnection() {
  $cf = Get-CloudflaredPath
  if (-not $cf) { return $false }
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $cf tunnel info agentos 2>&1 | ForEach-Object { "$_" } | Out-String
    return $output -match "CONNECTOR ID" -and $output -notmatch "does not have any active connection"
  } finally {
    $ErrorActionPreference = $prevEap
  }
}

function Get-StackLogDir() {
  $dir = Join-Path $RepoRoot ".agentos\logs"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  return $dir
}

function Get-StackStateDir() {
  $dir = Join-Path $RepoRoot ".agentos\state"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  return $dir
}

function Get-LauncherPidFile() {
  return Join-Path (Get-StackStateDir) "stack-launcher.pids"
}

function Register-LauncherPid([int]$ProcessId) {
  if ($ProcessId -le 0) { return }
  Add-Content -Path (Get-LauncherPidFile) -Value $ProcessId -Encoding ASCII
}

function Stop-HiddenStackLaunchers() {
  $pidFile = Get-LauncherPidFile
  if (Test-Path $pidFile) {
    foreach ($launcherPid in Get-Content $pidFile -ErrorAction SilentlyContinue) {
      $parsed = 0
      if ([int]::TryParse("$launcherPid".Trim(), [ref]$parsed) -and $parsed -gt 0) {
        Stop-Process -Id $parsed -Force -ErrorAction SilentlyContinue
        Write-Ok "Stopped hidden launcher cmd.exe (pid $parsed)."
      }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }

  $repoPattern = [regex]::Escape($RepoRoot)
  $launchers = Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match $repoPattern -and
      $_.CommandLine -match 'pnpm (dev:full|dev:api|dev:stack)'
    }
  foreach ($proc in @($launchers)) {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Ok "Stopped repo launcher cmd.exe pid $($proc.ProcessId)."
  }
}

function Start-HiddenPnpm([string]$Label, [string]$PnpmCommand) {
  $logDir = Get-StackLogDir
  $logFile = Join-Path $logDir "$Label.log"
  $header = "`n===== $Label started $(Get-Date -Format o) =====`n"
  Add-Content -Path $logFile -Value $header -Encoding UTF8

  $inner = "cd /d `"$RepoRoot`" && pnpm $PnpmCommand >> `"$logFile`" 2>&1"
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $inner -WorkingDirectory $RepoRoot -WindowStyle Hidden -PassThru
  Register-LauncherPid $proc.Id
  Write-Ok "Started $Label in background (no terminal window). Log: $logFile"
  return $true
}

function Test-StackRunning() {
  return [bool](Get-ListenPid $ApiPort -or Get-ListenPid $UiPort -or Get-ListenPid $GatewayPort)
}

function Install-AutostartTask() {
  $taskName = "AgentOS Background Stack"
  $scriptPath = Join-Path $RepoRoot "scripts\agentos-background.ps1"
  $arg = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`" -Action Start -IfNotRunning"
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arg
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 2)
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Starts AgentOS stack in the background at Windows logon (no terminal windows)." -Force | Out-Null
  Write-Ok "Registered scheduled task '$taskName' (runs at logon)."
  Write-Info "Logs: $(Join-Path $RepoRoot '.agentos\logs')"
}

function Uninstall-AutostartTask() {
  $taskName = "AgentOS Background Stack"
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Ok "Removed scheduled task '$taskName' (if it existed)."
}

function Wait-ApiHealth([int]$TimeoutSec = 90) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $health = Test-HttpOk "http://127.0.0.1:$ApiPort/health"
    if ($health.Ok) {
      Write-Ok "API healthy on port $ApiPort."
      return $true
    }
    Start-Sleep -Seconds 2
  }
  Write-Bad "API did not become healthy within ${TimeoutSec}s."
  return $false
}

function Start-ApiDedicated() {
  if (Get-ListenPid $ApiPort) {
    Write-Info "API already listening on port $ApiPort."
    return $true
  }

  if (-not (Start-HiddenPnpm "dev-api" "dev:api")) {
    return $false
  }
  return Wait-ApiHealth
}

function Start-StackServices() {
  $uiUp = [bool](Get-ListenPid $UiPort)
  $gwUp = [bool](Get-ListenPid $GatewayPort)
  if ($uiUp -and $gwUp) {
    Write-Info "Command Center and Gateway already listening."
    return
  }
  Start-HiddenPnpm "dev-stack" "dev:stack" | Out-Null
}

function Test-StackHealthy() {
  $apiHealthy = (Test-HttpOk "http://127.0.0.1:$ApiPort/health").Ok
  $uiUp = [bool](Get-ListenPid $UiPort)
  $gwUp = [bool](Get-ListenPid $GatewayPort)
  return $apiHealthy -and $uiUp -and $gwUp
}

function Start-StackSequential() {
  param([switch]$IncludeTunnel)

  if (-not (Get-ListenPid $ApiPort)) {
    if (-not (Start-ApiDedicated)) {
      Write-Bad "API failed to start."
      return $false
    }
  } elseif (-not (Test-HttpOk "http://127.0.0.1:$ApiPort/health").Ok) {
    Write-Warn "API port is bound but unhealthy - restarting API."
    Stop-Port $ApiPort "API" | Out-Null
    Wait-PortFree $ApiPort 12 | Out-Null
    if (-not (Start-ApiDedicated)) {
      Write-Bad "API failed to restart."
      return $false
    }
  } else {
    Write-Info "API already healthy on port $ApiPort."
  }

  Start-StackServices
  Start-Sleep -Seconds 2
  return Wait-ForStack -IncludeTunnel:$IncludeTunnel
}

function Invoke-DiscordSmoke {
  param([switch]$Full)

  if (-not (Get-ListenPid $ApiPort)) {
    Write-Bad "API is not running - cannot run Discord smoke test."
    return $false
  }

  $label = if ($Full) { "discord:smoke:full" } else { "discord:smoke" }
  try {
    Invoke-Repo "Running $label" @($(if ($Full) { "discord:smoke:full" } else { "discord:smoke" }))
    Write-Ok "$label passed."
    return $true
  } catch {
    Write-Bad "$label failed: $($_.Exception.Message)"
    return $false
  }
}

function Start-CloudflaredTunnel() {
  $cf = Get-CloudflaredPath
  if (-not $cf) {
    Write-Warn "cloudflared not found - install with: winget install Cloudflare.cloudflared"
    return $false
  }

  if (Test-TunnelConnection) {
    Write-Ok "cloudflared tunnel 'agentos' has an active connection."
    return $true
  }

  $svc = Get-Service cloudflared -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -eq "StopPending") {
    Write-Warn "cloudflared Windows service is stuck (StopPending). Run scripts\repair-cloudflare-tunnel.ps1 as Administrator."
  } elseif ($svc -and $svc.Status -eq "Running") {
    Write-Warn "cloudflared service is running but tunnel has no connection."
  }

  $existing = Get-Process cloudflared -ErrorAction SilentlyContinue
  if (-not $existing) {
    Start-Process -FilePath $cf -ArgumentList "tunnel", "run", "agentos" -WindowStyle Minimized
    Write-Ok "Started cloudflared tunnel 'agentos'."
  } else {
    Start-Process -FilePath $cf -ArgumentList "tunnel", "run", "agentos" -WindowStyle Minimized
    Write-Ok "Started additional cloudflared tunnel run (existing process had no connection)."
  }

  Start-Sleep -Seconds 6
  if (Test-TunnelConnection) {
    Write-Ok "Tunnel connection established."
    return $true
  }

  Write-Bad "Tunnel still has no active connection. Run repair-cloudflare-tunnel.ps1 as Administrator."
  return $false
}

function Invoke-Repo([string]$Label, [string[]]$Command) {
  Write-Info $Label
  Push-Location $RepoRoot
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & pnpm @Command
    if ($LASTEXITCODE -ne 0) { throw "Command failed with exit code $LASTEXITCODE." }
  } finally {
    $ErrorActionPreference = $prevEap
    Pop-Location
  }
}

function Get-JsonFromOutput([string]$Text) {
  $start = $Text.IndexOf("{")
  $end = $Text.LastIndexOf("}")
  if ($start -lt 0 -or $end -le $start) { return $null }
  try {
    return ($Text.Substring($start, $end - $start + 1) | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Get-DiscordInteractionsMode() {
  Push-Location $RepoRoot
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = (& pnpm exec tsx scripts/discord-interactions-mode.mjs status 2>&1 | Out-String)
    return Get-JsonFromOutput $output
  } finally {
    $ErrorActionPreference = $prevEap
    Pop-Location
  }
}

function Show-Health {
  Write-Title 'Health and status'

  $apiPid = Get-ListenPid $ApiPort
  $uiPid = Get-ListenPid $UiPort
  $gwPid = Get-ListenPid $GatewayPort

  if ($apiPid) { Write-Ok "API listening on port $ApiPort (pid $apiPid)" } else { Write-Bad "API not listening on port $ApiPort" }
  if ($uiPid) { Write-Ok "Command Center on port $UiPort (pid $uiPid)" } else { Write-Warn "Command Center not listening on port $UiPort" }
  if ($gwPid) { Write-Ok "Gateway on port $GatewayPort (pid $gwPid)" } else { Write-Info "Gateway not listening on port $GatewayPort" }

  $cf = Get-CloudflaredPath
  if ($cf) {
    if (Test-TunnelConnection) {
      Write-Ok "cloudflared tunnel 'agentos' connected"
    } else {
      $cfProcs = Get-Process cloudflared -ErrorAction SilentlyContinue
      if ($cfProcs) {
        Write-Bad "cloudflared process running but tunnel NOT connected (530 errors). Run repair-cloudflare-tunnel.ps1 as Admin."
      } else {
        Write-Warn "cloudflared installed but tunnel not running"
      }
    }
    $svc = Get-Service cloudflared -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq "StopPending") {
      Write-Bad "cloudflared Windows service stuck in StopPending"
    }
  } else {
    Write-Warn "cloudflared not installed"
  }

  $tunnelDash = Test-HttpOk "https://flous.dev"
  if ($tunnelDash.Ok) { Write-Ok "https://flous.dev -> $($tunnelDash.Status)" } else { Write-Warn "https://flous.dev not reachable: $($tunnelDash.Error)" }

  $health = Test-HttpOk "http://127.0.0.1:$ApiPort/health"
  if ($health.Ok) { Write-Ok "GET /health -> $($health.Status)" } else { Write-Bad "GET /health failed: $($health.Error)" }

  try {
    $mock = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/discord/mock" -TimeoutSec 5
    Write-Ok "Discord mode: $($mock.mode), guild: $($mock.guild.guildName)"
    if ($mock.guild.webhooks.general) { Write-Ok "General chat webhook configured" } else { Write-Warn "General chat webhook missing" }
  } catch {
    Write-Bad "GET /discord/mock failed: $($_.Exception.Message)"
  }

  try {
    Push-Location $RepoRoot
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & pnpm env:check 2>&1 | Where-Object {
      $_ -notmatch '^\s*>' -and $_ -notmatch '^\s*$'
    } | ForEach-Object { Write-Host "  $_" }
    $ErrorActionPreference = $prevEap
  } catch {
    Write-Bad "env:check failed: $($_.Exception.Message)"
  } finally {
    Pop-Location
  }

  $mode = Get-DiscordInteractionsMode
  if ($mode) {
    Write-Ok "Discord interactions mode: $($mode.mode)"
    if ($mode.interactionsEndpointUrl) {
      Write-Info "Interactions endpoint URL: $($mode.interactionsEndpointUrl)"
    } else {
      Write-Info "Interactions endpoint URL: none (gateway mode)"
    }
  } else {
    Write-Warn "Could not read Discord interactions mode."
  }
}

function Start-Stack {
  param(
    [switch]$IncludeTunnel,
    [switch]$RunDiscordSmoke
  )

  Write-Title "Starting AgentOS stack (background, hot-reload)"

  if ($IfNotRunning -and (Test-StackHealthy)) {
    Write-Info "Stack already healthy - skipping start."
    Show-Health
    return
  }
  if ($IfNotRunning -and (Test-StackRunning)) {
    Write-Info "Stack partially running - repairing missing services."
  }

  if ($IncludeTunnel) {
    Start-CloudflaredTunnel | Out-Null
  }

  $ready = Start-StackSequential -IncludeTunnel:$IncludeTunnel
  Show-Health

  if ($RunDiscordSmoke -and $ready) {
    Invoke-DiscordSmoke -Full | Out-Null
  }
}

function Restart-Api {
  Write-Title "Restarting API"
  Stop-Port $ApiPort "API"
  Wait-PortFree $ApiPort 10 | Out-Null
  Start-Sleep -Seconds 1

  if (-not (Start-ApiDedicated)) {
    Write-Bad "API restart failed."
    return $false
  }
  Show-Health
  return $true
}

function Stop-Stack {
  Write-Title "Stopping AgentOS processes"
  Stop-HiddenStackLaunchers
  Stop-Port $ApiPort "API" | Out-Null
  Stop-Port $UiPort "Command Center" | Out-Null
  Stop-Port $GatewayPort "Gateway" | Out-Null
  Stop-ProjectNodeProcesses | Out-Null

  $cf = Get-Process cloudflared -ErrorAction SilentlyContinue
  if ($cf) {
    $cf | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Ok "Stopped cloudflared."
  } else {
    Write-Info "cloudflared was not running."
  }

  foreach ($port in @($ApiPort, $UiPort, $GatewayPort)) {
    if (-not (Wait-PortFree $port 8)) {
      Write-Warn "Port $port is still in use after shutdown."
    }
  }
  Write-Ok "Stop complete."
}

function Wait-ForStack {
  param(
    [switch]$IncludeTunnel,
    [int]$TimeoutSec = 90
  )

  $checks = @(
    @{ Label = "API /health"; Url = "http://127.0.0.1:$ApiPort/health"; Required = $true; TimeoutSec = 4 },
    @{ Label = "Gateway /health"; Url = "http://127.0.0.1:$GatewayPort/health"; Required = $true; TimeoutSec = 4 },
    @{ Label = "Command Center"; Url = "http://127.0.0.1:$UiPort"; Required = $true; TimeoutSec = 6 }
  )

  if ($IncludeTunnel) {
    $checks += @(
      @{ Label = "cloudflared process"; ProcessName = "cloudflared"; Required = $true },
      @{ Label = "Tunnel API"; Url = "https://api.flous.dev/health"; Required = $false; TimeoutSec = 10 },
      @{ Label = "Tunnel app (flous.dev)"; Url = "https://flous.dev"; Required = $false; TimeoutSec = 12 }
    )
  }

  Write-Title "Waiting for services to come up"
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $results = @{}

  while ((Get-Date) -lt $deadline) {
    $allRequiredReady = $true
    foreach ($check in $checks) {
      if ($results[$check.Label] -eq $true) { continue }

      if ($check.ProcessName) {
        $running = [bool](Get-Process $check.ProcessName -ErrorAction SilentlyContinue)
        if ($running) {
          $results[$check.Label] = $true
          Write-Ok "$($check.Label) is running."
        } else {
          $allRequiredReady = $false
        }
        continue
      }

      $probe = Test-HttpOk $check.Url $check.TimeoutSec
      if ($probe.Ok) {
        $results[$check.Label] = $true
        Write-Ok "$($check.Label) responded ($($probe.Status))."
      } elseif ($check.Required) {
        $allRequiredReady = $false
      }
    }

    if ($allRequiredReady) {
      foreach ($check in $checks) {
        if ($check.Required -and $results[$check.Label] -ne $true) {
          $allRequiredReady = $false
          break
        }
      }
    }

    if ($allRequiredReady) {
      Write-Host ""
      Write-Ok "All required services are up."
      return $true
    }

    Start-Sleep -Seconds 2
  }

  Write-Host ""
  Write-Bad "Timed out after ${TimeoutSec}s waiting for required services."
  foreach ($check in $checks) {
    if ($check.Required -and $results[$check.Label] -ne $true) {
      Write-Bad "Still down: $($check.Label)"
    } elseif (-not $check.Required -and $results[$check.Label] -ne $true) {
      Write-Warn "Optional check not ready: $($check.Label)"
    }
  }
  return $false
}

function Restart-Stack {
  param(
    [switch]$IncludeTunnel,
    [switch]$RunDiscordSmoke
  )

  Write-Title "Restarting AgentOS (shutdown -> API first -> stack -> verify)"
  Stop-Stack
  Start-Sleep -Seconds 2

  if ($IncludeTunnel) {
    Start-CloudflaredTunnel | Out-Null
  }

  $ready = Start-StackSequential -IncludeTunnel:$IncludeTunnel
  Show-Health

  if ($ready -and $RunDiscordSmoke) {
    Write-Info "Running full Discord server smoke test..."
    $smokeOk = Invoke-DiscordSmoke -Full
    if (-not $smokeOk) {
      $ready = $false
    }
  }

  if ($ready) {
    Write-Host ""
    Write-Ok "Restart complete - stack is up."
  } else {
    Write-Host ""
    Write-Bad "Restart finished but one or more required checks failed. See report above."
  }
  return $ready
}

function Get-StackStatusSnapshot {
  $apiUp = [bool](Get-ListenPid $ApiPort)
  $uiUp = [bool](Get-ListenPid $UiPort)
  $gwUp = [bool](Get-ListenPid $GatewayPort)
  $cfUp = Test-TunnelConnection
  return [pscustomobject]@{
    Api = if ($apiUp) { "UP" } else { "DOWN" }
    Ui = if ($uiUp) { "UP" } else { "DOWN" }
    Gateway = if ($gwUp) { "UP" } else { "DOWN" }
    Tunnel = if ($cfUp) { "UP" } else { "DOWN" }
    ApiUp = $apiUp
    UiUp = $uiUp
    GatewayUp = $gwUp
    TunnelUp = $cfUp
  }
}

function Copy-BackupItem(
  [string]$SourcePath,
  [string]$DestinationDir,
  [string]$Label,
  [switch]$Optional,
  [string]$TargetName
) {
  if (-not (Test-Path $SourcePath)) {
    if ($Optional) {
      Write-Info "Skipped optional backup item: $Label"
      return $null
    }
    throw "Backup source missing: $SourcePath"
  }
  $leaf = if ($TargetName) { $TargetName } else { Split-Path $SourcePath -Leaf }
  $target = Join-Path $DestinationDir $leaf
  if ((Get-Item $SourcePath).PSIsContainer) {
    Copy-Item -Path $SourcePath -Destination $target -Recurse -Force
  } else {
    Copy-Item -Path $SourcePath -Destination $target -Force
  }
  $sizeBytes = (Get-ChildItem $target -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  if (-not $sizeBytes) { $sizeBytes = (Get-Item $target -ErrorAction SilentlyContinue).Length }
  if (-not $sizeBytes) { $sizeBytes = 0 }
  Write-Ok "Backed up $Label ($([Math]::Round($sizeBytes / 1KB, 1)) KB)."
  return [pscustomobject]@{
    Label = $Label
    Source = $SourcePath
    Target = $target
    SizeBytes = [int64]$sizeBytes
  }
}

function Backup-AgentOS {
  param(
    [switch]$StopServicesFirst,
    [switch]$OpenFolder
  )

  Write-Title "Backing up AgentOS data"
  New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

  $stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
  $archiveName = "agentos-local-backup_$stamp"
  $zipPath = Join-Path $BackupRoot "$archiveName.zip"
  $stagingRoot = Join-Path $env:TEMP "agentos-backup-$stamp"
  $stagingDir = Join-Path $stagingRoot $archiveName

  if (Test-Path $stagingRoot) {
    Remove-Item $stagingRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

  $apiWasRunning = $false
  if ($StopServicesFirst) {
    $apiWasRunning = [bool](Get-ListenPid $ApiPort)
    if ($apiWasRunning) {
      Stop-Port $ApiPort "API" | Out-Null
      Wait-PortFree $ApiPort 10 | Out-Null
      Write-Info "Paused API briefly for a consistent database backup."
    }
  }

  $stateDir = Join-Path $RepoRoot ".agentos\state"
  $entries = @()
  try {
    $entries += Copy-BackupItem $stateDir $stagingDir "state" -Optional
    $entries += Copy-BackupItem (Join-Path $RepoRoot ".env") $stagingDir "env" -Optional -TargetName ".env"
    $entries += Copy-BackupItem (Join-Path $RepoRoot ".agentos\stops") $stagingDir "quota-stops" -Optional -TargetName "stops"
    $entries += Copy-BackupItem (Join-Path $env:USERPROFILE ".cloudflared\config.yml") $stagingDir "cloudflared-config" -Optional -TargetName "cloudflared-config.yml"

    $included = @($entries | Where-Object { $_ })
    if ($included.Count -eq 0) {
      throw "Nothing was backed up. At least one runtime data source must exist."
    }

    $manifest = [ordered]@{
      archiveName = $archiveName
      createdAt = (Get-Date).ToString("o")
      repoRoot = $RepoRoot
      stopServicesFirst = [bool]$StopServicesFirst
      items = $included
    }
    $manifestPath = Join-Path $stagingDir "manifest.json"
    ($manifest | ConvertTo-Json -Depth 6) | Set-Content -Path $manifestPath -Encoding UTF8

    Get-ChildItem $BackupRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
    Get-ChildItem $BackupRoot -File -ErrorAction SilentlyContinue | Where-Object {
      $_.Extension -ne ".zip"
    } | ForEach-Object {
      Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path $stagingDir -DestinationPath $zipPath -Force
    $zipSizeKb = [Math]::Round((Get-Item $zipPath).Length / 1KB, 1)
    Write-Ok "Created $archiveName.zip ($zipSizeKb KB)"
    Write-Info "Stored in $BackupRoot"
  } finally {
    if (Test-Path $stagingRoot) {
      Remove-Item $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($StopServicesFirst -and $apiWasRunning) {
      Write-Info "API was running before backup. Restart the stack if needed."
    }
  }

  if ($OpenFolder) {
    Start-Process explorer.exe "/select,`"$zipPath`""
  }

  return [pscustomobject]@{
    Ok = $true
    ArchiveName = $archiveName
    ZipPath = $zipPath
    BackupRoot = $BackupRoot
    ManifestPath = "manifest.json"
  }
}

function Show-ControlGui {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing

  $form = New-Object System.Windows.Forms.Form
  $form.Text = "AgentOS Control"
  $form.StartPosition = "CenterScreen"
  $form.Size = New-Object System.Drawing.Size(640, 620)
  $form.MinimumSize = New-Object System.Drawing.Size(560, 520)
  $form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

  $header = New-Object System.Windows.Forms.Label
  $header.Text = "AgentOS Local Control"
  $header.AutoSize = $true
  $header.Location = New-Object System.Drawing.Point(16, 12)
  $header.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 12)

  $statusPanel = New-Object System.Windows.Forms.Panel
  $statusPanel.Location = New-Object System.Drawing.Point(16, 44)
  $statusPanel.Size = New-Object System.Drawing.Size(590, 54)
  $statusPanel.BorderStyle = "FixedSingle"

  $statusLabels = @{}
  $statusNames = @("API", "UI", "Gateway", "Tunnel")
  for ($index = 0; $index -lt $statusNames.Count; $index += 1) {
    $name = $statusNames[$index]
    $label = New-Object System.Windows.Forms.Label
    $label.Text = "$name`: checking..."
    $label.AutoSize = $true
    $label.Location = New-Object System.Drawing.Point((12 + ($index * 140)), 18)
    $statusLabels[$name] = $label
    $statusPanel.Controls.Add($label) | Out-Null
  }

  $buttonPanel = New-Object System.Windows.Forms.FlowLayoutPanel
  $buttonPanel.Location = New-Object System.Drawing.Point(16, 108)
  $buttonPanel.Size = New-Object System.Drawing.Size(590, 150)
  $buttonPanel.WrapContents = $true
  $buttonPanel.AutoSize = $false

  $logBox = New-Object System.Windows.Forms.TextBox
  $logBox.Multiline = $true
  $logBox.ReadOnly = $true
  $logBox.ScrollBars = "Vertical"
  $logBox.Location = New-Object System.Drawing.Point(16, 270)
  $logBox.Size = New-Object System.Drawing.Size(590, 280)
  $logBox.Anchor = "Top,Bottom,Left,Right"

  $script:GuiLogSink = {
    param([string]$Text, [string]$Level)
    $prefix = switch ($Level) {
      "Ok" { "[OK] " }
      "Warn" { "[!!] " }
      "Bad" { "[XX] " }
      "Title" { "=== " }
      default { "..   " }
    }
    $line = "$prefix$Text"
    if ($form.InvokeRequired) {
      $form.Invoke([action]{ $logBox.AppendText("$line`r`n") }) | Out-Null
    } else {
      $logBox.AppendText("$line`r`n")
    }
  }

  function Update-StatusLabels {
    $snapshot = Get-StackStatusSnapshot
    $map = @{
      API = $snapshot.Api
      UI = $snapshot.Ui
      Gateway = $snapshot.Gateway
      Tunnel = $snapshot.Tunnel
    }
    foreach ($key in $map.Keys) {
      $value = $map[$key]
      $label = $statusLabels[$key]
      $label.Text = "$key`: $value"
      $label.ForeColor = if ($value -eq "UP") { [System.Drawing.Color]::ForestGreen } else { [System.Drawing.Color]::Firebrick }
    }
  }

  function Set-Busy([bool]$IsBusy) {
    foreach ($control in $buttonPanel.Controls) {
      if ($control -is [System.Windows.Forms.Button]) {
        $control.Enabled = -not $IsBusy
      }
    }
    $form.Cursor = if ($IsBusy) { [System.Windows.Forms.Cursors]::WaitCursor } else { [System.Windows.Forms.Cursors]::Default }
  }

  function Invoke-GuiAction([string]$Title, [scriptblock]$Action) {
    Set-Busy $true
    try {
      Write-Title $Title
      & $Action
      Update-StatusLabels
    } catch {
      Write-Bad $_.Exception.Message
    } finally {
      Set-Busy $false
    }
  }

  function New-ActionButton([string]$Text, [scriptblock]$OnClick) {
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $Text
    $button.Width = 180
    $button.Height = 36
    $button.Margin = New-Object System.Windows.Forms.Padding(6)
    $button.Add_Click({
      param($sender, $eventArgs)
      & $OnClick
    })
    $buttonPanel.Controls.Add($button) | Out-Null
    return $button
  }

  New-ActionButton "Start stack" { Invoke-GuiAction "Starting stack (background)" { Start-Stack } } | Out-Null
  New-ActionButton "Start at logon" { Invoke-GuiAction "Installing autostart" { Install-AutostartTask } } | Out-Null
  New-ActionButton "Remove logon start" { Invoke-GuiAction "Removing autostart" { Uninstall-AutostartTask } } | Out-Null
  New-ActionButton "Start + tunnel" { Invoke-GuiAction "Starting stack with tunnel" { Start-Stack -IncludeTunnel } } | Out-Null
  New-ActionButton "Restart all" { Invoke-GuiAction "Restarting stack" { Restart-Stack | Out-Null } } | Out-Null
  New-ActionButton "Restart + tunnel" { Invoke-GuiAction "Restarting stack with tunnel" { Restart-Stack -IncludeTunnel | Out-Null } } | Out-Null
  New-ActionButton "Repair tunnel" {
    Invoke-GuiAction "Repairing Cloudflare tunnel" {
      $repair = Join-Path $RepoRoot "scripts\repair-cloudflare-tunnel.ps1"
      Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $repair
      Write-Info "Launched repair script (Administrator). Retrying user-mode tunnel..."
      Start-CloudflaredTunnel | Out-Null
      Update-StatusLabels
    }
  } | Out-Null
  New-ActionButton "Stop all" { Invoke-GuiAction "Stopping stack" { Stop-Stack } } | Out-Null
  New-ActionButton "Backup data" { Invoke-GuiAction "Backing up AgentOS" { Backup-AgentOS -StopServicesFirst -OpenFolder | Out-Null } } | Out-Null
  New-ActionButton "Health report" { Invoke-GuiAction "Health and status" { Show-Health } } | Out-Null
  New-ActionButton "Open dashboard" { Start-Process "http://localhost:$UiPort"; Write-Ok "Opened local dashboard." } | Out-Null
  New-ActionButton "Open flous.dev" { Start-Process "https://flous.dev"; Write-Ok "Opened https://flous.dev" } | Out-Null
  New-ActionButton "Open backups" { Start-Process explorer.exe $BackupRoot; Write-Ok "Opened backup folder." } | Out-Null
  New-ActionButton "Refresh status" { Update-StatusLabels; Write-Ok "Status refreshed." } | Out-Null

  $form.Controls.AddRange(@($header, $statusPanel, $buttonPanel, $logBox))
  $form.Add_Shown({
    Update-StatusLabels
    Write-Ok "AgentOS control panel ready."
    Write-Info "Repo: $RepoRoot"
    Write-Info "Backups: $BackupRoot"
  })
  $form.Add_FormClosed({
    $script:GuiLogSink = $null
  })

  [void]$form.ShowDialog()
}

function Install-DesktopLauncher {
  $controlScript = Join-Path $RepoRoot "scripts\agentos-control.ps1"
  $controlCmd = @(
    "@echo off",
    "title AgentOS Control",
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -Sta -File `"$controlScript`" -Action Gui"
  ) -join "`r`n"
  $menuCmd = @(
    "@echo off",
    "title AgentOS Control (Menu)",
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$controlScript`" -Action Menu"
  ) -join "`r`n"
  $restartCmd = @(
    "@echo off",
    "title AgentOS Restart",
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$controlScript`" -Action RestartWithTunnel",
    "pause"
  ) -join "`r`n"
  $backupCmd = @(
    "@echo off",
    "title AgentOS Backup",
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$controlScript`" -Action Backup",
    "pause"
  ) -join "`r`n"
  $ps1 = @(
    "# AgentOS Control GUI",
    "& powershell.exe -NoProfile -ExecutionPolicy Bypass -Sta -File `"$controlScript`" -Action Gui"
  ) -join "`r`n"
  $restartPs1 = @(
    "# AgentOS Restart - stop all, start in sequence, verify health",
    "& powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$controlScript`" -Action RestartWithTunnel"
  ) -join "`r`n"
  $backupPs1 = @(
    "# AgentOS Backup",
    "& powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$controlScript`" -Action Backup"
  ) -join "`r`n"
  Set-Content -Path $DesktopLauncher -Value $controlCmd -Encoding ASCII
  Set-Content -Path (Join-Path $env:USERPROFILE "Desktop\AgentOS Control.ps1") -Value $ps1 -Encoding ASCII
  Set-Content -Path (Join-Path $env:USERPROFILE "Desktop\AgentOS Control (Menu).cmd") -Value $menuCmd -Encoding ASCII
  Set-Content -Path (Join-Path $env:USERPROFILE "Desktop\AgentOS Restart.cmd") -Value $restartCmd -Encoding ASCII
  Set-Content -Path (Join-Path $env:USERPROFILE "Desktop\AgentOS Restart.ps1") -Value $restartPs1 -Encoding ASCII
  Set-Content -Path (Join-Path $env:USERPROFILE "Desktop\AgentOS Backup.cmd") -Value $backupCmd -Encoding ASCII
  Set-Content -Path (Join-Path $env:USERPROFILE "Desktop\AgentOS Backup.ps1") -Value $backupPs1 -Encoding ASCII
  Write-Ok "Desktop launchers updated:"
  Write-Info $DesktopLauncher
  Write-Info (Join-Path $env:USERPROFILE "Desktop\AgentOS Control.ps1")
  Write-Info (Join-Path $env:USERPROFILE "Desktop\AgentOS Control (Menu).cmd")
  Write-Info (Join-Path $env:USERPROFILE "Desktop\AgentOS Restart.cmd")
  Write-Info (Join-Path $env:USERPROFILE "Desktop\AgentOS Backup.cmd")
}

function Show-Menu {
  Write-Title "AgentOS HQ - $RepoRoot"
  Write-Host ""
  Write-Host "  1) Start stack (pnpm dev)" -ForegroundColor White
  Write-Host "  2) Start stack + Cloudflare tunnel" -ForegroundColor White
  Write-Host "  3) Restart everything (stop -> start -> verify)" -ForegroundColor White
  Write-Host "  4) Restart everything + Cloudflare tunnel" -ForegroundColor White
  Write-Host "  5) Restart API only" -ForegroundColor White
  Write-Host "  6) Stop API / UI / gateway / tunnel" -ForegroundColor White
  Write-Host "  7) Health and status report" -ForegroundColor White
  Write-Host "  8) Discord smoke test (basic)" -ForegroundColor White
  Write-Host "  8b) Discord smoke test (full server)" -ForegroundColor White
  Write-Host "  9) Post Discord pulse" -ForegroundColor White
  Write-Host " 10) Sync Discord commands" -ForegroundColor White
  Write-Host " 11) Sync Discord roles" -ForegroundColor White
  Write-Host " 12) Open Command Center (browser)" -ForegroundColor White
  Write-Host " 13) Open project folder" -ForegroundColor White
  Write-Host " 14) New PowerShell in project" -ForegroundColor White
  Write-Host " 15) Backup AgentOS data" -ForegroundColor White
  Write-Host " 16) Refresh desktop launchers" -ForegroundColor White
  Write-Host " 17) Install start-at-logon (no windows)" -ForegroundColor White
  Write-Host " 18) Remove start-at-logon" -ForegroundColor White
  Write-Host "  0) Exit" -ForegroundColor DarkGray
  Write-Host ""
}

if ($NonInteractive -and $Action -in @("Gui", "Menu")) {
  $Action = "Health"
}

switch ($Action) {
  "Gui" {
    Show-ControlGui
    exit 0
  }
  "Backup" {
    $result = Backup-AgentOS -StopServicesFirst -OpenFolder
    if ($result.Ok) {
      Write-Ok "Backup saved: $($result.ArchiveName).zip"
      Write-Info $result.ZipPath
      exit 0
    }
    exit 1
  }
  "Health" {
    Show-Health
    exit 0
  }
  "Start" {
    Start-Stack
    exit 0
  }
  "StartWithTunnel" {
    Start-Stack -IncludeTunnel
    exit 0
  }
  "Restart" {
    $ok = Restart-Stack
    exit $(if ($ok) { 0 } else { 1 })
  }
  "RestartWithTunnel" {
    $ok = Restart-Stack -IncludeTunnel -RunDiscordSmoke
    exit $(if ($ok) { 0 } else { 1 })
  }
  "Stop" {
    Stop-Stack
    exit 0
  }
  "RefreshDesktop" {
    Install-DesktopLauncher
    exit 0
  }
  "InstallAutostart" {
    Install-AutostartTask
    exit 0
  }
  "UninstallAutostart" {
    Uninstall-AutostartTask
    exit 0
  }
  "Menu" {
    break
  }
  default {
    Write-Bad "Unknown action: $Action"
    exit 1
  }
}

if ($Action -ne "Menu") {
  exit 0
}

Install-DesktopLauncher | Out-Null

while ($true) {
  Show-Menu
  $choice = Read-Host "  Choose"
  switch ($choice) {
    "1" { Start-Stack }
    "2" { Start-Stack -IncludeTunnel }
    "3" { Restart-Stack | Out-Null }
    "4" { Restart-Stack -IncludeTunnel -RunDiscordSmoke | Out-Null }
    "5" { Restart-Api }
    "6" { Stop-Stack }
    "7" { Show-Health }
    "8" { Invoke-DiscordSmoke | Out-Null }
    "8b" { Invoke-DiscordSmoke -Full | Out-Null }
    "9" {
      try {
        $pulse = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/discord/pulse" -Method POST -ContentType "application/json" -Body "{}" -TimeoutSec 20
        Write-Ok "Pulse posted: ok=$($pulse.ok)"
      } catch {
        Write-Bad "Pulse failed: $($_.Exception.Message)"
      }
    }
    "10" { try { Invoke-Repo "Syncing Discord commands" @("discord:sync-commands") } catch { Write-Bad $_.Exception.Message } }
    "11" { try { Invoke-Repo "Syncing Discord roles" @("discord:sync-roles") } catch { Write-Bad $_.Exception.Message } }
    "12" { Start-Process "http://localhost:$UiPort" ; Write-Ok "Opened http://localhost:$UiPort" }
    "13" { Start-Process explorer.exe $RepoRoot ; Write-Ok "Opened project folder." }
    "14" {
      Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", "Set-Location -LiteralPath '$RepoRoot'"
      Write-Ok "Opened PowerShell in project root."
    }
    "15" { Backup-AgentOS -StopServicesFirst -OpenFolder | Out-Null }
    "16" { Install-DesktopLauncher }
    "17" { Install-AutostartTask }
    "18" { Uninstall-AutostartTask }
    "0" { exit 0 }
    default { Write-Warn "Unknown option." }
  }
  Read-Host "  Press Enter to continue"
}
