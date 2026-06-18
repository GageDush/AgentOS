---
slug: docs/troubleshooting
title: Troubleshooting
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Troubleshooting

Source: `docs/troubleshooting.md` (excerpt; secrets redacted).

## Excerpt

# Troubleshooting

## pnpm is missing

Install or enable pnpm with Corepack:

[code block omitted]

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

[code block omitted]

The dashboard intentionally falls b

## Related

- [[index]]
- [[areas/repo-layout]]
