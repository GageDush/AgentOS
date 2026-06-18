#!/usr/bin/env bash
# One-time bootstrap for the Oracle Cloud Always Free VM (Ubuntu 22.04/24.04, arm64 or amd64).
# Idempotent: safe to re-run. Run as a sudo-capable user on the VM:
#   curl -fsSL .../setup.sh | bash      (or copy the file over and `bash setup.sh`)
#
# What it does: swap file, Docker + compose plugin, cloudflared, repo dir at /opt/agentos.
# It does NOT start the stack — see docs/DEPLOY-ORACLE.md for the deploy steps.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/agentos}"
ARCH="$(dpkg --print-architecture)"   # arm64 on Ampere A1, amd64 on the micro VM
echo "==> Bootstrapping AgentOS host ($ARCH) into $REPO_DIR"

# --- 1. Swap (next build is memory-hungry on free-tier RAM) ---
if ! swapon --show | grep -q '/swapfile'; then
  echo "==> Creating 4G swap file"
  sudo fallocate -l 4G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
else
  echo "==> Swap already present, skipping"
fi

# --- 2. Docker Engine + compose plugin ---
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "    (log out/in for the docker group to apply, or use 'sudo docker' for now)"
else
  echo "==> Docker already installed, skipping"
fi
sudo systemctl enable --now docker

# --- 3. cloudflared (host systemd service; reuses the existing tunnel) ---
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "==> Installing cloudflared ($ARCH)"
  curl -fsSL -o /tmp/cloudflared.deb \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb"
  sudo dpkg -i /tmp/cloudflared.deb
  rm -f /tmp/cloudflared.deb
else
  echo "==> cloudflared already installed, skipping"
fi
sudo mkdir -p /etc/cloudflared

# --- 4. Repo directory + Oracle firewall note ---
sudo mkdir -p "$REPO_DIR"
sudo chown "$USER":"$USER" "$REPO_DIR"

cat <<'NEXT'

==> Bootstrap complete. Next steps (see docs/DEPLOY-ORACLE.md for detail):

  1. Get the repo into /opt/agentos:
       git clone https://github.com/GageDush/AgentOS /opt/agentos      # needs a token/deploy key (private repo)
       # OR rsync/scp it from the laptop.

  2. Place secrets + tunnel creds (NOT in git):
       scp .env             user@vm:/opt/agentos/.env   && chmod 600 /opt/agentos/.env
       scp 333ca9b1-...json user@vm:/etc/cloudflared/
       sudo cp /opt/agentos/infra/cloudflared/config.yml /etc/cloudflared/config.yml

  3. (optional) Migrate existing data — copy the laptop's SQLite DB into the volume:
       see docs/DEPLOY-ORACLE.md "Data migration".

  4. Build + start the stack:
       cd /opt/agentos
       docker compose -f docker-compose.prod.yml build
       docker compose -f docker-compose.prod.yml up -d

  5. Start the tunnel as a service, then cut over from the laptop:
       sudo cloudflared service install
       sudo systemctl enable --now cloudflared

  6. Install the health watchdog + verify:
       sudo cp infra/systemd/agentos-health.* /etc/systemd/system/
       sudo systemctl enable --now agentos-health.timer

NEXT
