# Troubleshooting

## pnpm is missing

Install or enable pnpm with Corepack:

```powershell
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

## Hot reload during development (avoid full restarts)

You do **not** need **Restart all** in AgentOS Control after every code change.

| What you changed | What happens automatically |
|------------------|----------------------------|
| Command center UI (`apps/command-center`, `@agentos/ui`) | Browser **Fast Refresh** — save the file, page updates in ~1s |
| API / Discord / Cursor bridge (`apps/api`) | `tsx watch` **restarts API only** (~2–5s); Discord gateway reconnects |
| Gateway / worker | `tsx watch` restarts that service only |

**Best workflow**

1. Start once: AgentOS Control → **Start stack** (runs in the **background — no terminal windows**), or `pnpm stack:background`.
2. You can close all terminals; the stack keeps running. Logs: `.agentos/logs/dev-api.log` and `.agentos/logs/dev-stack.log`.
3. Use **http://localhost:3000** for UI work (best hot reload). `flous.dev` may need a manual refresh for some changes.
4. Use **Restart API only** (control menu option 5) only if Discord/gateway looks stuck after an API change.
5. Use **Restart all** only after `.env` changes, dependency installs (`pnpm install`), or port conflicts.

## Run without keeping terminals open (Windows)

AgentOS Control **Start stack** now launches `pnpm dev:full` as a **hidden background process** — no minimized PowerShell windows required.

| Goal | Command |
|------|---------|
| Start stack (background) | `pnpm stack:background` or AgentOS Control → **Start stack** |
| Restart stack (full) | `pnpm stack:restart` or AgentOS Control → **Restart all** |
| Stop stack | `pnpm stack:stop` or AgentOS Control → **Stop all** |
| Health check | `pnpm stack:status` |

`pnpm stack:restart` and the Control menu use the same path: stop hidden launchers, start API first, then UI/gateway/worker. Use this after `.env` changes instead of `stack:stop` + `stack:background` alone.
| Start automatically at Windows logon | `pnpm install:autostart` or Control → **Start at logon** |
| Remove logon autostart | `pnpm uninstall:autostart` |

Hot reload still works in background mode (`tsx watch` / Next.js Fast Refresh). Restart only after `.env` changes.

## Dashboard shows mock API

Start the API:

```powershell
pnpm --filter @agentos/api dev
```

The dashboard intentionally falls back to local mock seed data if the API is offline.

## flous.dev tunnel URLs (525, 530, or DNS not found)

**Dashboard URLs** (use one of these):

| URL | Purpose |
|-----|---------|
| `https://flous.dev` | Command center (canonical) |
| `https://app.flous.dev` | Command center (alternate) |
| `https://agentos.flous.dev` | Command center (alternate) |
| `https://api.flous.dev/health` | API health |

**525** — Cloudflare cannot complete SSL to the tunnel (no active connector or DNS not proxied). Fix DNS and restart the tunnel:

```powershell
Restart-Service cloudflared
```

If the service is stuck, use the **530** quick fix or **Full repair** below.

**530** — Tunnel has no active connector. Common causes:

1. **Windows service stuck** (`StopPending`) — process exists but tunnel is dead
2. Local API (`8787`) or command center (`3000`) not running

**Quick fix** (from repo root, no admin):

```powershell
& "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe" tunnel run agentos
```

Or use AgentOS Control → **Start + tunnel**.

**Full repair** (Admin PowerShell, from any directory):

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\gaged\Documents\AgenOS\scripts\repair-cloudflare-tunnel.ps1
```

Or from the repo root:

```powershell
cd C:\Users\gaged\Documents\AgenOS
pnpm tunnel:repair
```

This kills stuck processes, restarts the cloudflared service, and falls back to `tunnel run` if needed.

**DNS records** (all CNAME → `agentos` tunnel, Proxied):

- `flous.dev` → dashboard (`:3000`)
- `api.flous.dev` → API (`:8787`)
- `app.flous.dev` → dashboard (`:3000`)
- `agentos.flous.dev` → dashboard (`:3000`)

If the apex record is missing, create it:

```powershell
& "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe" tunnel route dns agentos flous.dev
```

Ensure tunnel ingress includes `flous.dev` → `http://127.0.0.1:3000`, then restart cloudflared (Admin PowerShell):

```powershell
Restart-Service cloudflared
```
