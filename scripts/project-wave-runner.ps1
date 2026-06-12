# AgentOS project wave — interactive Cursor chat driver (P1–P10)
param(
  [ValidateSet("start", "next", "prompt", "status", "reset", "list")]
  [string]$Action = "prompt",
  [switch]$NoClipboard
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Runner = Join-Path $PSScriptRoot "project-wave-runner.mjs"

if (-not (Test-Path $Runner)) {
  Write-Error "Missing $Runner"
}

$output = node $Runner $Action 2>&1 | Out-String

# Extract prompt between ===== lines for clipboard
$prompt = $null
if ($output -match '(?s)={72}\r?\n(?:PASTE THIS[^\r\n]*|CURRENT PROMPT[^\r\n]*)\r?\n={72}\r?\n(.*?)\r?\n={72}') {
  $prompt = $Matches[1].Trim()
}

Write-Host $output

if ($prompt -and -not $NoClipboard) {
  try {
    Set-Clipboard -Value $prompt
    Write-Host "`n[clipboard] Prompt copied — paste into Cursor chat (Ctrl+V)`n" -ForegroundColor Green
  } catch {
    Write-Host "`n[clipboard] Could not copy automatically — copy from output above`n" -ForegroundColor Yellow
  }
}
