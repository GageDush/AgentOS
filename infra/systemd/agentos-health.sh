#!/usr/bin/env bash
# AgentOS health watchdog — the Linux port of scripts/repair-cloudflare-tunnel.ps1.
# Probes the public health endpoint; if it fails, restarts the stack and the tunnel.
# Driven hourly by agentos-health.timer. `restart: unless-stopped` already covers
# crashes/reboots; this catches the "up but unhealthy" case.
set -uo pipefail

URL="${AGENTOS_HEALTH_URL:-https://api.flous.dev/health}"
REPO_DIR="${REPO_DIR:-/opt/agentos}"
LOG="/var/log/agentos-health.log"

if curl -fsS --max-time 15 "$URL" | grep -q '"ok":true'; then
  exit 0
fi

echo "$(date -Is) health check FAILED ($URL) — restarting stack + tunnel" >>"$LOG"
cd "$REPO_DIR" && docker compose -f docker-compose.prod.yml restart >>"$LOG" 2>&1
systemctl restart cloudflared >>"$LOG" 2>&1

# Re-probe once after recovery so the log shows the outcome.
sleep 20
if curl -fsS --max-time 15 "$URL" | grep -q '"ok":true'; then
  echo "$(date -Is) recovery OK" >>"$LOG"
else
  echo "$(date -Is) recovery did NOT restore health — manual check needed" >>"$LOG"
fi
