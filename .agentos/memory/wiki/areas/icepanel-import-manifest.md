---
slug: areas/icepanel-import-manifest
title: IcePanel Import Manifest — AgentOS
tags: [architecture, icepanel, import, auto-indexed]
valid_from: 2026-06-12
---
# IcePanel Import Manifest — AgentOS

Structured object + connection list for MCP write tools. Use after OAuth connect in Cursor.

**Source schematic:** [[areas/system-routing-schematic]]

## MCP setup (Cursor)

```jsonc
{
  "mcpServers": {
    "icepanel": {
      "type": "streamable-http",
      "url": "https://mcp.icepanel.io/mcp"
    }
  }
}
```

1. Cursor → Settings → Tools & MCP → Add Custom MCP (paste above)
2. Click **Connect** → log in → pick landscape → **Allow**
3. IcePanel org → AI settings → enable **OAuth write access** (required to create objects)
4. New chat → ask agent to "import AgentOS from icepanel-import-manifest"

**MCP limits:** can create/update **model objects** and **connections**; cannot auto-create **diagrams** (add objects to a diagram manually in IcePanel UI).

---

## Recommended landscape structure

### Root system
| Name | Type | Description |
|------|------|-------------|
| **AgentOS** | system | Local-first agent orchestration platform — missions, gates, memory wiki, Discord bridge |

### Child systems (optional grouping)
| Name | Type | Parent | Description |
|------|------|--------|-------------|
| AgentOS Runtime | system | AgentOS | Mission execution, agent pipeline, persistence |
| AgentOS Control Plane | system | AgentOS | Operator UI, auth, approvals, audit |
| AgentOS Integrations | system | AgentOS | Discord, Cursor, Cloudflare, LLM providers |

---

## Apps (containers)

| Name | Parent | Tech tags | Port | Package path |
|------|--------|-----------|------|--------------|
| Command Center | AgentOS Control Plane | Next.js, React, TypeScript | 3000 | `apps/command-center` |
| API | AgentOS Runtime | Fastify, Node.js, TypeScript | 8787 | `apps/api` |
| Gateway | AgentOS Runtime | Fastify, Node.js | 8790 | `apps/gateway` |
| Worker | AgentOS Runtime | Node.js | — | `apps/worker` |
| Scheduler | AgentOS Runtime | Node.js | — | `apps/scheduler` |

### API components (nested under API app)
| Name | Description |
|------|-------------|
| Auth Module | Discord OAuth, sliding sessions, `/auth/*` |
| Mission Runtime | `/missions`, `/runs`, gate orchestration |
| Wiki API | `/memory/wiki/*`, curator queue |
| Discord Bridge | Bot, slash commands, outbox, `#cursor` |
| Events WS | `GET /events` WebSocket fan-out |
| Worker Trigger | `POST /worker/process` |

### Command Center components
| Name | Description |
|------|-------------|
| Forge Shell | Nav, command palette, health bar, chat FAB |
| Dashboard Home | Mission control, stats, timeline |
| Memory Wiki View | `/wiki` browse + sync |
| Control Gate View | Approvals UI |

---

## Stores

| Name | Type | Path | Contents |
|------|------|------|----------|
| agentos-local.db | store | `.agentos/state/agentos-local.db` | missions, runs, approvals, audit, chat, sessions |
| Memory Wiki | store | `.agentos/memory/wiki/` | markdown articles, wikilinks, graph |
| Agent Profiles | store | `.agentos/agents/*.md` | 21 agent profile definitions |
| Repo Filesystem | store | workspace root | source code, configs, logs |

---

## External actors / systems

| Name | Type | Role |
|------|------|------|
| Operator | actor | Human — browser, Discord, approvals |
| Discord | system | OAuth, bot channels, slash commands |
| Cloudflare Tunnel | system | `flous.dev` → local ports |
| Cursor IDE | system | Implementer dispatch, transcript wiki sync |
| Ollama | system | Local LLM lane `:11434` |
| GitHub | system | Release manager PR flow |

---

## Connections (create in order)

### Operator ↔ UI
| From | To | Label | Protocol |
|------|-----|-------|----------|
| Operator | Cloudflare Tunnel | browses | HTTPS |
| Cloudflare Tunnel | Command Center | routes flous.dev | HTTP :3000 |
| Operator | Command Center | direct dev | HTTP localhost:3000 |

### UI ↔ API
| From | To | Label | Protocol |
|------|-----|-------|----------|
| Command Center | API | `/agentos-api/*` proxy | HTTP |
| Command Center | API | session cookies | HTTP |
| Command Center | API | `/events` | WebSocket |

### Runtime internal
| From | To | Label | Protocol |
|------|-----|-------|----------|
| API | Gateway | QA/security commands | HTTP :8790 |
| Worker | API | poll process runs | HTTP |
| Scheduler | API | scheduled triggers | HTTP |
| Gateway | Repo Filesystem | git/pnpm/semgrep | subprocess |
| API | agentos-local.db | read/write state | SQLite |
| API | Memory Wiki | wiki CRUD + search | filesystem |
| API | Agent Profiles | load agent defs | filesystem |

### External integrations
| From | To | Label | Protocol |
|------|-----|-------|----------|
| Operator | Discord | chat + slash | Discord API |
| Discord | API | interactions / gateway | HTTPS |
| API | Cursor IDE | `#cursor` bridge | Cursor SDK |
| API | Ollama | quota lane local LLM | HTTP :11434 |
| API | GitHub | release PR | gh CLI / API |
| Cloudflare Tunnel | API | api.flous.dev | HTTP :8787 |

---

## Flows (create as IcePanel flows)

### Flow 1: Mission Run
1. Operator → Command Center: compose mission
2. Command Center → API: `POST /missions/:id/run`
3. API → agentos-local.db: run `queued`
4. Worker → API: `POST /worker/process`
5. API → Mission Runtime: `processRun`
6. Mission Runtime → Gateway: optional QA commands
7. Mission Runtime → Memory Wiki: curator updates
8. API → Events WS → Command Center: live status

### Flow 2: Discord OAuth Session
1. Operator → Command Center: login
2. Command Center → API: `GET /auth/discord`
3. API → Discord: OAuth redirect
4. Discord → API: callback
5. API → agentos-local.db: session row
6. API → Command Center: cookie + `/auth/success`

### Flow 3: Memory Wiki Sync
1. Operator → Memory Wiki View: Sync Cursor
2. Command Center → API: `POST /memory/wiki/sync-cursor`
3. API → Cursor IDE: read transcripts
4. API → Memory Wiki: write `sessions/cursor/*`
5. API → Memory Wiki: rebuild `_meta/index.json`

### Flow 4: Approval Gate
1. Mission Runtime → agentos-local.db: `awaiting_approval`
2. API → Discord Bridge: outbox card → `#approvals`
3. Operator → Discord: approve button
4. Discord → API: button handler
5. API → Mission Runtime: continue run

---

## Agent pipeline (ADR or separate diagram)

Document as ADR: **Conditional Agent Pipeline**

```text
admin → classifier → context? → quota → planner? → specialists? → qa? → security? → reviewer? → release? → synthesizer → memory-curator? → admin
```

Primary routing table lives in [[areas/system-routing-schematic]] §6.

---

## UI route map (annotation on Command Center)

`/`, `/dashboard`, `/missions`, `/control-gate`, `/blackbox`, `/operators`, `/routines`, `/loadout`, `/archive`, `/wiki`, `/settings`, `/scraper`, `/office`

---

## Discord channel map (annotation on Discord system)

Zones: START, OPS, BRIEFING, NEIGHBORHOOD, LOUNGE — see [[areas/system-routing-schematic]] §10.

---

## Import prompt (paste after MCP connected)

```
Using IcePanel MCP write tools, import the AgentOS architecture from our repo wiki article "icepanel-import-manifest":
1. Create system AgentOS with child systems Runtime, Control Plane, Integrations
2. Create apps Command Center, API, Gateway, Worker, Scheduler with tech tags
3. Create stores agentos-local.db, Memory Wiki, Agent Profiles, Repo Filesystem
4. Create external systems Operator, Discord, Cloudflare Tunnel, Cursor, Ollama, GitHub
5. Create all connections from the manifest tables
6. Create flows: Mission Run, OAuth Session, Wiki Sync, Approval Gate
7. List what was created and what I need to add to a diagram manually
```
