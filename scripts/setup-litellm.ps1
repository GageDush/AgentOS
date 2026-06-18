<#
  setup-litellm.ps1 — prepare the optional LiteLLM sidecar for the AgentOS LLM router.

  Renders configs/litellm.config.yaml.template -> .agentos/state/litellm.config.yaml
  (gitignored). The template references os.environ/* so real keys are read by
  LiteLLM at runtime from your environment — they are never written to the repo.

  Usage:  pnpm llm:litellm:setup     (or)   powershell -File scripts/setup-litellm.ps1
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$template = Join-Path $root "configs/litellm.config.yaml.template"
$stateDir = Join-Path $root ".agentos/state"
$target = Join-Path $stateDir "litellm.config.yaml"

if (-not (Test-Path $template)) {
  Write-Error "Template not found: $template"
}

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
Copy-Item -Force $template $target
Write-Host "Wrote $target (gitignored)." -ForegroundColor Green

$havePip = $false
try { python -c "import sys" 2>$null; if ($LASTEXITCODE -eq 0) { $havePip = $true } } catch {}
$haveDocker = $false
try { docker --version 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { $haveDocker = $true } } catch {}

Write-Host ""
Write-Host "Detected: python/pip=$havePip  docker=$haveDocker"
Write-Host ""
Write-Host "Start the proxy on :4000 with ONE of:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Option A - pip"
Write-Host "  pip install 'litellm[proxy]'"
Write-Host "  litellm --config .agentos/state/litellm.config.yaml --port 4000"
Write-Host ""
Write-Host "  # Option B - docker"
Write-Host "  docker run -p 4000:4000 -v `${PWD}/.agentos/state/litellm.config.yaml:/app/config.yaml ghcr.io/berriai/litellm:main-latest --config /app/config.yaml"
Write-Host ""
Write-Host "Then set FEATURE_LITELLM_PROXY=true in .env and restart the stack:" -ForegroundColor Cyan
Write-Host "  pnpm stack:restart"
Write-Host ""
Write-Host "Health check:  pnpm llm:litellm:health" -ForegroundColor Cyan
