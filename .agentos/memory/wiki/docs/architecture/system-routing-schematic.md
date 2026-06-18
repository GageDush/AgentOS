---
slug: docs/architecture/system-routing-schematic
title: System Routing Schematic
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# System Routing Schematic

Source: `docs/architecture/system-routing-schematic.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS System Routing & Schematic

Full routing map for IcePanel / architecture review. Covers deployment, UI, API, agent pipeline, Discord, memory, and data stores.

## 1. Deployment topology

### Production (Cloudflare Tunnel `agentos`)

| Public hostname | Local target | Service |
|-----------------|--------------|---------|
| `flous.dev` | `127.0.0.1:3000` | Command Center (Next.js) |
| `app.flous.dev` | `127.0.0.1:3000` | Command Center (alias) |
| `agentos.flous.dev` | `127.0.0.1:3000` | Command Center (alias) |
| `api.flous.dev` | `127.0.0.1:8787` | API (Fastify) |

### Local dev ports

| Service | Port | Package |
|---------|------|---------|
| Command Center | 3000 | `apps/command-center` |
| API | 8787 | `apps/api` |
| Gateway | 8790 | `apps/gateway` |
| Worker | — (polls API) | `apps/worker` |
| Scheduler | — (polls API) | `apps/scheduler` |
| Ollama (optional) | 11434 | external |
| Postgres (optional) | 5432 | docker |
| Redis (optional) | 6379 | docker |

### Browser → API proxy

Command Center rewrites `/agentos-api/*` → API base (`127.0.0.1:8787` local, `api.flous.dev` prod). Cookies stay on app origin.

## 2. Service inventory (IcePanel containers)

[code block omitted]

### Shared packages (logical layer under API/Worker)

| Package | Role |
|---------|------|
| `packages/shared` | Types, contracts, seed data |
| `packages/persistence` | SQLite `agentos-local.db` + repository |
| `packages/orchestrator` | Route classification, TaskEnvelope, intent |
| `packages/runtime` | Mission/run lifecycle, gates, chat |
| `packages/agents` | Profile load, executor pipeline, LLM |
| `packages/memory` | Wiki read/write/search/expand |
| `packages/token-manager` | Quota steward, budgets |
| `packages/sandbox` | Command policy |
| `packages/ui` | Forge design system |
| `packages/app-generator` | Generated app preview |

## 3. Command Center UI routes

| Path | Section | Purpose |
|------|---------|---------|
| `/` | dashboard | Mission control + entry experience |
| `/dashboard` | dashboard | Same as home |
| `/missions` | missions | Compose & run missions |
| `/control-gate` | control-gate | Approvals |
| `/blackbox` | blackbox | Audit + run logs |
| `/operators` | operators | Agent roster + sessions |
| `/routines` | routines | Scheduled automations |
| `/loadout` | loadout | Integrations / models |
| `/archive` | archive | Mission memory records |
|

## Related

- [[index]]
- [[areas/repo-layout]]
