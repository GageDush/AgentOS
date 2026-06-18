#!/usr/bin/env bash
# Pull + rebuild + restart the AgentOS prod stack on the VM. Run from /opt/agentos.
set -euo pipefail
cd "${REPO_DIR:-/opt/agentos}"

echo "==> git pull"
git pull --ff-only || echo "   (skipped: not a git checkout or no fast-forward)"

echo "==> build"
docker compose -f docker-compose.prod.yml build

echo "==> up"
docker compose -f docker-compose.prod.yml up -d

echo "==> status"
docker compose -f docker-compose.prod.yml ps
