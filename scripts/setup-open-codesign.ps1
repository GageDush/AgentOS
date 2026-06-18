# Setup Open CoDesign for AgentOS (local-first design handoff)
# https://github.com/OpenCoworkAI/open-codesign

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$DesignMd = Join-Path $RepoRoot ".agentos\codesign\DESIGN.md"
$Exe = Join-Path $env:LOCALAPPDATA "Programs\Open CoDesign\Open CoDesign.exe"

function Test-Ollama {
  try {
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3
    return $r.models
  } catch {
    return $null
  }
}

function Ensure-OpenCoDesign {
  if (Test-Path $Exe) {
    Write-Host '(ok) Open CoDesign installed:' $Exe
    return
  }

  Write-Host '[install] Open CoDesign not found — installing via winget...'
  winget install --id OpenCoworkAI.OpenCoDesign --accept-package-agreements --accept-source-agreements
  if (-not (Test-Path $Exe)) {
    throw "Install finished but executable missing at $Exe"
  }
  Write-Host '(ok) Installed:' $Exe
}

function Show-ProviderSteps {
  $models = Test-Ollama
  Write-Host ""
  Write-Host "=== First launch (Settings -> Models) ==="
  if ($models) {
    $names = ($models | ForEach-Object { $_.name }) -join ", "
    Write-Host '(ok) Ollama reachable at http://127.0.0.1:11434'
    Write-Host "     Models: $names"
    Write-Host "     Add provider: Ollama -> base URL http://127.0.0.1:11434"
    Write-Host "     Suggested model: qwen2.5-coder:7b (or your preferred chat model)"
  } else {
    Write-Host '(warn) Ollama not reachable. Start it, then in Open CoDesign:'
    Write-Host "       Settings -> Models -> Ollama -> http://127.0.0.1:11434"
    Write-Host "       Or paste an Anthropic/OpenAI API key instead."
  }
  Write-Host ""
  Write-Host "Config file (after first launch):"
  foreach ($p in @(
    (Join-Path $env:USERPROFILE ".config\open-codesign\config.toml"),
    (Join-Path $env:APPDATA "open-codesign\config.toml")
  )) {
    if (Test-Path $p) { Write-Host "  $p" }
  }
}

function Show-AgentOSHandoff {
  Write-Host ""
  Write-Host "=== AgentOS handoff ==="
  Write-Host "Canonical tokens: apps/command-center/src/styles/forge-ds/DESIGN-SYSTEM.md"
  Write-Host "Open CoDesign DESIGN.md: $DesignMd"
  Write-Host ""
  Write-Host "In Open CoDesign workspace:"
  Write-Host "  1. Copy DESIGN.md into the workspace root (or symlink)"
  Write-Host "  2. Prompt with dashboard / missions / control-gate briefs"
  Write-Host "  3. Use 'Decompose to UI Kit' for ui_kits/ -> Cursor implementer"
  Write-Host ""
  Write-Host "Live reference UI: http://localhost:3000 (pnpm stack:background)"
}

Ensure-OpenCoDesign
Show-ProviderSteps
Show-AgentOSHandoff

if ($args -contains "--launch") {
  Write-Host '[launch] Starting Open CoDesign...'
  Start-Process -FilePath $Exe
}
