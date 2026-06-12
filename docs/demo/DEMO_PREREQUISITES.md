# AgentOS Demo Prerequisites

## Environment
- Windows 11 + WSL2 (Ubuntu recommended) or native Windows
- Node.js 22+
- pnpm (`corepack enable`)
- Optional: Ollama + `qwen2.5-coder:7b`

## Ports
| Port | Service |
|------|---------|
| 3000 | Command Center |
| 8787 | API |
| 8790 | Gateway |

## Setup
```powershell
cd C:\Users\gaged\Documents\AgenOS
pnpm demo
```

## Discord (full integration)
Fill `.env`: `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`, `SESSION_SECRET`, `DISCORD_OAUTH_REDIRECT_URI_PROD`.

```powershell
pnpm discord:smoke:full
```

## Cloudflare tunnel
```powershell
# Admin PowerShell
powershell -ExecutionPolicy Bypass -File C:\Users\gaged\Documents\AgenOS\scripts\repair-cloudflare-tunnel.ps1
pnpm control  # Restart + tunnel
```

## Pre-demo checklist
```powershell
pnpm sanitize:check
pnpm env:check
pnpm typecheck
pnpm test
pnpm agentos:validate-profiles
pnpm discord:smoke:full
```
