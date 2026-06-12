#Requires -Version 5.1
<#
.SYNOPSIS
  Create and wire the AgentOS Cloudflare Tunnel for flous.dev.

.DESCRIPTION
  - Creates tunnel "agentos" (idempotent if already exists)
  - Routes api.flous.dev -> :8787, flous.dev + app.flous.dev -> :3000
  - Writes %USERPROFILE%\.cloudflared\config.yml
  - Installs cloudflared as a Windows service (optional)

  Prerequisites:
  - cloudflared installed (winget install Cloudflare.cloudflared)
  - cloudflared tunnel login (select flous.dev)
  - AgentOS API + Command Center running locally when testing
#>
param(
  [string]$TunnelName = "agentos",
  [switch]$SkipServiceInstall
)

$ErrorActionPreference = "Stop"

$cfCandidates = @(
  "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
  "$env:ProgramFiles\cloudflared\cloudflared.exe"
)
$cf = $cfCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $cf) {
  $cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
}
if (-not $cf) {
  throw "cloudflared not found. Run: winget install Cloudflare.cloudflared"
}

function Invoke-Cloudflared {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CloudflaredArgs)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $cf @CloudflaredArgs 2>&1 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { "$_" }
    }
  } finally {
    $ErrorActionPreference = $prev
  }
}

function Get-TunnelList {
  $raw = Invoke-Cloudflared tunnel list --output json
  $text = ($raw | Where-Object { $_ -notmatch '^\s*\{"level"' }) -join "`n"
  if (-not $text.Trim()) { return @() }
  return ,($text | ConvertFrom-Json)
}

$cloudflaredDir = Join-Path $env:USERPROFILE ".cloudflared"
New-Item -ItemType Directory -Force -Path $cloudflaredDir | Out-Null

if (-not (Test-Path (Join-Path $cloudflaredDir "cert.pem"))) {
  Write-Host "Run cloudflared tunnel login first and authorize flous.dev." -ForegroundColor Yellow
  & $cf tunnel login
}

$existing = Get-TunnelList
$tunnel = $existing | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1
if (-not $tunnel) {
  Write-Host "Creating tunnel '$TunnelName'..."
  Invoke-Cloudflared tunnel create $TunnelName | ForEach-Object { Write-Host $_ }
  $existing = Get-TunnelList
  $tunnel = $existing | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1
}

if (-not $tunnel) {
  throw "Failed to resolve tunnel id for '$TunnelName'"
}

$tunnelId = $tunnel.id
Write-Host "Tunnel id: $tunnelId"

foreach ($hostName in @("api.flous.dev", "flous.dev", "app.flous.dev", "agentos.flous.dev")) {
  Write-Host "Routing DNS: $hostName"
  Invoke-Cloudflared tunnel route dns $TunnelName $hostName | ForEach-Object { Write-Host $_ }
}

$configPath = Join-Path $cloudflaredDir "config.yml"
$config = @"
tunnel: $tunnelId
credentials-file: $cloudflaredDir\$tunnelId.json

ingress:
  - hostname: api.flous.dev
    service: http://127.0.0.1:8787
  - hostname: flous.dev
    service: http://127.0.0.1:3000
  - hostname: app.flous.dev
    service: http://127.0.0.1:3000
  - hostname: agentos.flous.dev
    service: http://127.0.0.1:3000
  - service: http_status:404
"@
Set-Content -Path $configPath -Value $config -Encoding utf8
Write-Host "Wrote $configPath"

if (-not $SkipServiceInstall) {
  Write-Host "Installing cloudflared Windows service..."
  Invoke-Cloudflared service install | ForEach-Object { Write-Host $_ }
  Write-Host "Starting service..."
  Start-Service cloudflared -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Done. Verify:" -ForegroundColor Green
Write-Host "  nslookup api.flous.dev"
Write-Host "  curl https://api.flous.dev/health"
Write-Host "  https://flous.dev"
Write-Host "  https://app.flous.dev"
Write-Host ""
Write-Host "Then flip .env production URLs (see .env flous.dev section) and add Discord redirect:"
Write-Host "  https://api.flous.dev/auth/discord/callback"
