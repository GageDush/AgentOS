param(
  [ValidateSet("start", "next", "prompt", "status", "gates", "reset", "list", "run", "loop")]
  [string]$Action = "prompt",
  [switch]$NoClipboard
)

$ErrorActionPreference = "Stop"
$Runner = Join-Path $PSScriptRoot "functionalization-runner.mjs"

$output = node $Runner $Action 2>&1 | Out-String

$prompt = $null
if ($output -match '(?s)={72}\r?\n(?:PASTE[^\r\n]*|CURRENT PROMPT[^\r\n]*)\r?\n={72}\r?\n(.*?)\r?\n={72}') {
  $prompt = $Matches[1].Trim()
}

Write-Host $output

if ($prompt -and -not $NoClipboard -and $Action -in @("start", "next", "prompt")) {
  try {
    Set-Clipboard -Value $prompt
    Write-Host "`n[clipboard] Functionalization prompt copied`n" -ForegroundColor Green
  } catch {
    Write-Host "`n[clipboard] Copy from output above`n" -ForegroundColor Yellow
  }
}
