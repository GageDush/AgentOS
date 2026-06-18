# Deploy AgentOS to Oracle Cloud (laptop-off, ~$0/month)

Master runbook for moving the AgentOS stack off the laptop onto an Oracle Cloud Always
Free VM, with the static Nebraska Ledger on Cloudflare Pages. The Cloudflare Tunnel is
**reused** (same UUID), so the cutover needs **no DNS change**.

**Decisions baked in:** SQLite stays (single writer — only the API opens it) with
**Litestream** continuous backup to Cloudflare R2; **Postgres is not used**. cloudflared
runs as a **host systemd service** (survives app restarts). Production images are separate
from the dev Dockerfiles (`docker-compose.prod.yml` + `docker/*.prod.Dockerfile`).

```
Cloudflare DNS ──┬─ flous.dev / app / agentos ─► Tunnel ─► command-center :3000 ┐
                 ├─ api.flous.dev             ─► Tunnel ─► api :8787            │ Oracle ARM VM
                 ├─ news.flous.dev            ─► Cloudflare Pages (Ledger alias)│ (Docker Compose,
                 ├─ nebraskaledger.tech       ─► Cloudflare Pages (Ledger)      │  laptop OFF)
                 └─ pulsex.me                 ─► parked placeholder             ┘
```

---

## Phase A — All domains fully on Cloudflare DNS  *(you, dashboards)*

1. **flous.dev (fix the split delegation):** at name.com, set the nameservers to **only**
   the two Cloudflare NS shown in Cloudflare → flous.dev → Overview (`brady` / `walk`
   .ns.cloudflare.com). **Remove** `ns1-4.name.com`. Wait for "Active".
2. Confirm the tunnel CNAMEs survived: `api`, `app`, `agentos`, `flous` → the
   `333ca9b1….cfargotunnel.com` target, all **Proxied** (orange cloud).
3. **nebraskaledger.tech** and **pulsex.me:** add each as a Cloudflare site (Free), repoint
   registrar NS to the assigned Cloudflare pair, wait for "Active".

Verify: `dig +short NS flous.dev` returns only the Cloudflare pair.

---

## Phase B — Provision the Oracle VM via OCI CLI

**Credentials I need (set up so the private key never enters chat):** in the OCI Console →
Profile → **API Keys → Add API Key → Generate**, download the private key, and click
**"View configuration file"**. Put that block into `C:\Users\gaged\.oci\config` and save the
key as `C:\Users\gaged\.oci\oci_api_key.pem`. That gives the CLI: tenancy OCID, user OCID,
fingerprint, region, key path. Tell me your **home region**.

Then provisioning (I run these once the CLI is configured):

```bash
# Install CLI (Windows PowerShell):  see https://docs.oracle.com/iaas/Content/API/SDKDocs/cliinstall.htm
oci setup repair-file-permissions --file ~/.oci/config
oci iam compartment list           # sanity check auth works

# Create: Ampere A1 (arm64), Ubuntu 24.04, 2 OCPU / 12 GB, only inbound SSH 22.
# (Exact create command assembled from your region/AD/compartment + an Ubuntu image OCID.)
```

Notes:
- **ARM A1 capacity** is the famously hard part — "Out of host capacity" is common. Retry
  across Availability Domains, or script a retry loop. AMD micro (1 GB) is a fallback host
  only, too small for the full stack.
- **No inbound web ports** — the tunnel is outbound-only. Security List / NSG: allow **SSH
  22** from your IP only; everything else stays closed.

Verify: `ssh ubuntu@<vm-ip>` works.

---

## Phase C — Bootstrap the host  *(on the VM)*

```bash
# copy infra/oracle/setup.sh over (or curl it), then:
bash setup.sh
```

Installs: 4 GB swap, Docker + compose plugin, cloudflared. Creates `/opt/agentos`.

---

## Phase D — Code, secrets, tunnel creds, data  *(laptop → VM)*

```bash
# 1. Repo into /opt/agentos (private repo — use a GitHub token/deploy key, or rsync):
git clone https://github.com/GageDush/AgentOS /opt/agentos

# 2. Secrets (NEVER committed). Rotate first (see "Secret rotation" below), then:
scp .env  ubuntu@<vm>:/opt/agentos/.env
ssh ubuntu@<vm> 'chmod 600 /opt/agentos/.env'

# 3. Tunnel credentials + config:
scp C:/Users/gaged/.cloudflared/333ca9b1-2503-409c-8bc0-4433866b6382.json ubuntu@<vm>:/tmp/
ssh ubuntu@<vm> 'sudo mv /tmp/333ca9b1-*.json /etc/cloudflared/ \
   && sudo cp /opt/agentos/infra/cloudflared/config.yml /etc/cloudflared/config.yml'

# 4. R2 backup keys: add to /opt/agentos/.env
#    LITESTREAM_ACCESS_KEY_ID=...   LITESTREAM_SECRET_ACCESS_KEY=...
#    (Cloudflare → R2 → create bucket "agentos-litestream" + an R2 API token)
```

### Data migration (existing missions/state)
The API auto-creates its schema and seeds on first boot, so a fresh VM works with an empty
DB. To bring your **existing** data, copy the laptop's SQLite file into the volume **before**
first `up` (stop the laptop stack first so the DB is quiescent):

```bash
# create the named volume and drop the .db in:
docker volume create agentos_agentos-data
docker run --rm -v agentos_agentos-data:/state -v /tmp:/in alpine \
  sh -c 'cp /in/agentos-local.db /state/agentos-local.db'
# (scp the laptop's .agentos/state/agentos-local.db to /tmp first)
```

---

## Phase E — Build & start the stack  *(on the VM)*

```bash
cd /opt/agentos
docker compose -f docker-compose.prod.yml build     # builds agentos-service + command-center
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps         # all healthy?
curl -fsS http://127.0.0.1:8787/health               # {"ok":true,...}
```

If `better-sqlite3` fails to build on arm64, the prod Dockerfile already ships
`python3/make/g++` to compile from source — re-run `build`.

---

## Phase F — Tunnel cutover (laptop → VM, no DNS change)

1. **Smoke test first** (while the laptop tunnel still runs): on the VM,
   `sudo cloudflared --config /etc/cloudflared/config.yml tunnel run` in the foreground and
   hit `https://api.flous.dev/health` from your phone. A second connector is fine briefly.
   Ctrl-C when satisfied.
2. **Cut over:** stop the laptop's cloudflared (or shut the laptop down). On the VM:
   ```bash
   sudo cloudflared service install
   sudo systemctl enable --now cloudflared
   ```
3. Verify externally: `https://api.flous.dev/health`, `https://flous.dev`, and a **Discord
   login** (cookie domain `.flous.dev` + the OAuth redirect are unchanged, so it just works).
4. **Power the laptop OFF** and confirm everything stays up.

---

## Phase G — Litestream backup (already wired in compose)

The `litestream` service streams `agentos-local.db` to R2 once Phase D step 4 keys are set.
Verify and rehearse restore:

```bash
docker compose -f docker-compose.prod.yml logs litestream      # "replicating"
# Disaster restore onto a fresh VM (into the empty volume, before `up`):
docker run --rm -v agentos_agentos-data:/state \
  -v /opt/agentos/infra/litestream/litestream.yml:/etc/litestream.yml:ro \
  --env-file /opt/agentos/.env litestream/litestream:0.3.13 \
  restore -config /etc/litestream.yml /state/agentos-local.db
```

---

## Phase H — Nebraska Ledger → Cloudflare Pages  *(at cutover, not before)*

Flipping the export breaks the current `news.flous.dev` :3001 serving, so do this as part of
the move:

1. In `Nebraska-Ledger-Build/web/next.config.mjs` add `output: 'export'` and
   `trailingSlash: true`. `next build` then emits `out/`.
2. Push to GitHub; create a Cloudflare Pages project: root `web`, build
   `npm install && npm run build`, output `out`, `NODE_VERSION=20`.
3. Custom domains: **nebraskaledger.tech** (+ `www`) primary, **news.flous.dev** alias
   (replaces the old tunnel route — already dropped from the VM tunnel config).
4. Park **pulsex.me** with a coming-soon placeholder (a tiny Pages project or a redirect rule).

---

## Phase I — Free-tier guardrails

- **OCI Budget + alert** (Billing → Budgets, ~$1) to catch any accidental paid resource.
- Stay within Always Free: A1 total 4 OCPU / 24 GB, 200 GB block volume, 10 TB/mo egress.
- **Health watchdog** (catches "up but unhealthy"):
  ```bash
  sudo cp /opt/agentos/infra/systemd/agentos-health.* /etc/systemd/system/
  sudo systemctl daemon-reload && sudo systemctl enable --now agentos-health.timer
  ```
- Reboot test: `sudo reboot` → stack returns via `restart: unless-stopped`, tunnel via systemd.
- Kill test: `docker kill <api container>` → watchdog/restart brings it back within the hour
  (or instantly via the restart policy).
- Cloudflare Pages Free = 500 builds/month — avoid build loops.

---

## Operations cheatsheet

```bash
cd /opt/agentos
docker compose -f docker-compose.prod.yml ps             # status
docker compose -f docker-compose.prod.yml logs -f api    # tail a service
bash infra/oracle/deploy.sh                              # pull + rebuild + restart
sudo systemctl status cloudflared                        # tunnel health
journalctl -u cloudflared -f                             # tunnel logs
tail -f /var/log/agentos-health.log                      # watchdog log
```

## Secret rotation (do during the cutover window)

Rotate everything that was in plaintext (`.env` + the Cloudflare token in the notes file),
then put new values **only** in the VM `.env`:

> OpenAI · Anthropic · Discord **bot token** + client secret · Cursor · IcePanel ·
> Neon password · `SESSION_SECRET` (logs out operators) · `GH_TOKEN` · Cloudflare API token

Rotating the Discord bot token reconnects the bot; rotating `SESSION_SECRET` logs everyone
out — both expected.
