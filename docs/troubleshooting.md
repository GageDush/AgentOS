# Troubleshooting

## pnpm is missing

Install or enable pnpm with Corepack:

```powershell
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

## Dashboard shows mock API

Start the API:

```powershell
pnpm --filter @agentos/api dev
```

The dashboard intentionally falls back to local mock seed data if the API is offline.

## Phaser canvas is blank

Check that `apps/command-center/public/assets/office-master.png` exists.

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

**Full repair** (Admin PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\repair-cloudflare-tunnel.ps1
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
