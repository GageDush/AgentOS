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

**530** — Tunnel DNS exists but cloudflared cannot reach local services. Start AgentOS locally, then restart the tunnel in **Admin** PowerShell:

```powershell
Restart-Service cloudflared
```

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
