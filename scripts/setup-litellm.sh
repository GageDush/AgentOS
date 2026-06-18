#!/usr/bin/env bash
# setup-litellm.sh — prepare the optional LiteLLM sidecar for the AgentOS LLM router.
# Renders configs/litellm.config.yaml.template -> .agentos/state/litellm.config.yaml
# (gitignored). The template references os.environ/* so real keys stay in your env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$ROOT/configs/litellm.config.yaml.template"
STATE_DIR="$ROOT/.agentos/state"
TARGET="$STATE_DIR/litellm.config.yaml"

[ -f "$TEMPLATE" ] || { echo "Template not found: $TEMPLATE" >&2; exit 1; }
mkdir -p "$STATE_DIR"
cp -f "$TEMPLATE" "$TARGET"
echo "Wrote $TARGET (gitignored)."
echo
echo "Start the proxy on :4000 with ONE of:"
echo
echo "  # Option A - pip"
echo "  pip install 'litellm[proxy]'"
echo "  litellm --config .agentos/state/litellm.config.yaml --port 4000"
echo
echo "  # Option B - docker"
echo "  docker run -p 4000:4000 -v \"\$PWD/.agentos/state/litellm.config.yaml:/app/config.yaml\" ghcr.io/berriai/litellm:main-latest --config /app/config.yaml"
echo
echo "Then set FEATURE_LITELLM_PROXY=true in .env and run: pnpm stack:restart"
echo "Health check: pnpm llm:litellm:health"
