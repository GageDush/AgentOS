---
slug: areas/system-routing-schematic
title: AgentOS System Routing & Schematic (IcePanel)
tags: [architecture, routing, icepanel, schematic, auto-indexed]
valid_from: 2026-06-12
---
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

```text
┌─────────────────────────────────────────────────────────────────┐
│ OPERATOR                                                         │
│  Browser · Discord client · Cursor IDE                          │
└────────────┬───────────────────────────────┬────────────────────┘
             │ HTTPS                         │ OAuth / Gateway / WS
             ▼                               ▼
┌────────────────────────┐      ┌──────────────────────────────┐
│ Command Center :3000   │      │ API :8787                     │
│ Next.js + Forge UI     │─────▶│ Fastify + Discord bot/gateway   │
│ @agentos/ui            │proxy │ @agentos/runtime orchestration  │
└────────────────────────┘      └───────┬──────────┬─────────────┘
                                        │          │
                    ┌───────────────────┘          └──────────────────┐
                    ▼                                                    ▼
         ┌──────────────────┐                              ┌──────────────────┐
         │ Gateway :8790    │                              │ Worker (poll)    │
         │ Allowlisted cmds │                              │ processRun loop  │
         │ git/pnpm/semgrep │                              │ claims queued runs│
         └──────────────────┘                              └──────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Repo filesystem  │
         │ + .agentos/      │
         └──────────────────┘
```

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
| `/wiki` | wiki | Memory wiki browser |
| `/settings` | settings | Policy + FAQ |
| `/preview/forge` | — | UI component gallery |
| `/scraper` | — | Website scraper workbench |
| `/office` | — | Experimental map (preview) |
| `/demo/office` | — | Legacy Phaser demo |

**Nav:** Dashboard · Missions · Control Gate · Blackbox · More (Agents, Automations, Integrations, Archive, **Memory Wiki**, Settings, Office, Scraper)

**Global chrome:** TopNav · Health bar · Command palette (⌘K) · Chat FAB · Run inspector sidebar

## 4. API route groups

### Health & media
- `GET /health`
- `GET /media/agents/:file`

### Auth (Discord OAuth)
- `GET /auth/discord` → callback → `GET /auth/success`
- `GET /auth/me` (sliding session refresh)
- `POST /auth/logout`

### Operator dashboard (primary UI data)
- `GET /dashboard` — aggregated payload (missions, runs, agents, audit, chat, etc.)
- `GET /system` — service posture
- `GET /events` — WebSocket live events

### Missions & runs
- `GET|POST /missions`, `GET /missions/:id`
- `POST /missions/:id/run`
- Questionnaire / generated-app / regen / feedback / preview subroutes
- `GET /runs`, `GET /runs/:id`, `GET /runs/:id/logs`
- `POST /runs/:id/{continue,pause,resume,retry}`
- `GET /runs/:id/gates`, release prepare/approve/PR

### Control & approvals
- `GET /approvals`, `GET /control-gate`
- `POST /approvals/:id/{approve-once,approve-for-mission,deny}`
- `POST /approvals/bulk/approve-once`
- `POST /rich-actions/execute`

### Chat & quick actions
- `GET|POST /chat/threads`, messages subroutes
- `GET /quick-actions`, `POST /quick-actions/:id/consume`

### Memory & wiki
- `GET /memory`, `POST /memory/search`
- `GET /memory/wiki`, `/manifest`, `/article`, `/backlinks`
- `POST /memory/wiki/{search,expand,rebuild,sync-cursor,sync-chatgpt}`
- `GET /memory/queue`, approve/dismiss

### Agents & roster
- `GET /agents`, `/agents/:id`, `/agents/roster`

### Usage & quota
- `GET /usage`, `/usage/summary`, `/quota/status`, `/usage/budgets`

### Discord admin
- `POST /discord/interactions` (or Gateway mode)
- `POST /discord/{bootstrap,restructure,sync-commands,sync-roles,sync-outbox,post-guides,pulse}`
- `GET /discord/mock`

### Worker trigger
- `POST /worker/process` — process pending mission runs

### LLM
- `POST /llm/chat`

## 5. Mission execution flow

```text
Operator → POST /missions → POST /missions/:id/run
    → mission_run status: queued
    → Worker polls → POST /worker/process OR internal processPendingMissionRuns
    → runtime.processRun(runId)
        1. claim run (lease)
        2. orchestrator.determineMissionRoute → AgentRoutingDecisionRecord
        3. quota-steward.evaluateQuotaSteward (lane: mock_local | ollama_local | defer)
        4. optional: tier1/tier2 classifier refine
        5. optional: context-minimizer → ContextPacket + wiki expand
        6. agents.executeAgentPipelineStep(primary, envelope, context)
        7. gates: qa | security | review | release (deterministic + agent)
        8. memory-curator → wiki merges or memory queue
        9. finalize run / awaiting_approval / failed
    → audit events → GET /audit, Blackbox UI, Discord ops-feed
```

### Run statuses
`queued` → `running` → (`awaiting_approval` | `paused` | `failed` | `complete`)

## 6. Conditional agent pipeline

Registry (`.agentos/agent-registry.json`):

```text
admin-agent
→ task-classifier
→ context-minimizer?     (if requiresRepoContext)
→ quota-steward
→ planner-partitioner?     (if complexity moderate/complex)
→ specialists?           (primary + supporting from route)
→ qa-agent?              (if requiresQa gate)
→ security-auditor?      (if requiresSecurityReview)
→ code-reviewer?         (if requiresCodeReview)
→ release-manager?       (if requiresReleaseGate)
→ admin-agent            (return / synthesizer handoff)
```

### Orchestrator primary agent selection (tier-0)

| Task signal | Primary agent |
|-------------|---------------|
| answer_only | admin-agent |
| research | issue-intake-researcher |
| app_creation / frontend keywords | frontend-ui-agent |
| qa keywords | qa-agent |
| security keywords | security-auditor |
| release keywords | release-manager |
| docs keywords | docs-agent |
| backend keywords | backend-service-agent |
| database keywords | database-migration-agent |
| integration keywords | integration-broker |
| repo_analysis | repo-cartographer |
| default code | code-implementer |

Supporting agents added by complexity, gates, domain span, planner score.

### Executor pipeline order (within one run step)

```text
planner-partitioner? (subtasks → delegate specialists)
→ primary specialist (code-implementer / frontend / etc.)
→ code-reviewer? (if scheduled)
→ security-auditor? (if required)
→ qa-agent? (if required; runs gateway commands)
→ release-manager? (if required)
→ systems-synthesizer (always)
→ memory-curator? (MemoryUpdateEnvelope → wiki or queue)
```

## 7. Gateway command routing

`apps/gateway` allowlist (sandbox policy in `@agentos/sandbox`):

- `git status`, `git diff`, `git diff --stat`, `git diff --name-only`
- `pnpm test`, `pnpm typecheck`, `pnpm lint`
- `semgrep --config .semgrep.yml --error --quiet`

QA/security gates call gateway via runtime → `executeGatewayCommand`.

Implementer dispatch modes: `gateway` | `cursor` | `mock` (`AGENTOS_IMPLEMENTER_MODE`).

## 8. Persistence & memory stores

| Store | Path | Contents |
|-------|------|----------|
| SQLite DB | `.agentos/state/agentos-local.db` | missions, runs, approvals, audit, chat, sessions |
| JSON fallback | `.agentos/state/agentos-local.json` | legacy mirror |
| Agent profiles | `.agentos/agents/*.md` | 21 pipeline agents |
| Agent registry | `.agentos/agent-registry.json` | pipeline + tiers |
| Memory wiki | `.agentos/memory/wiki/` | markdown articles + wikilinks |
| Wiki manifest | `.agentos/memory/wiki/_meta/index.json` | search index |
| Memory queue | `.agentos/state/memory-queue.json` | curator approval queue |
| Cursor sync state | `.agentos/state/cursor-wiki-sync.json` | transcript sync cursor |
| Discord registry | `.agentos/state/discord-registry.json` | guild/channel IDs |
| Logs | `.agentos/logs/dev-api.log`, `dev-stack.log` | background stack |

## 9. Memory wiki ingest routes

| Source | Script / API | Target slugs |
|--------|--------------|--------------|
| Cursor transcripts | `pnpm wiki:sync-cursor` | `sessions/cursor/*` |
| ChatGPT planning | `pnpm wiki:sync-chatgpt` | `planning/chatgpt/*` |
| Repo index | `pnpm wiki:index-repo` | `packages/*`, `areas/*`, `docs/*` |
| Agent reports | memory-curator on run complete | mapped slugs (test-commands, risk-areas, etc.) |
| Manual briefs | editor | `product/*` |

## 10. Discord routing

### Modes
- **Gateway:** bot connects while API runs (`FEATURE_DISCORD=true`)
- **Interactions endpoint:** `POST https://api.flous.dev/discord/interactions` (alternative)

### Channel zones (`layout.ts`)

| Category | Channels |
|----------|----------|
| ◈ START | `#rules`, `#welcome`, `#announcements` |
| ◈ OPS | `#status`, `#approvals`, `#missions`, `#ops-feed`, `#operator-command`, `#cursor` |
| ◈ BRIEFING | `#round-table`, `#chat-room-1..3` |
| ◈ NEIGHBORHOOD | `#town-square`, `#social-lounge`, `#ash-house`, `#brock-house`, … (per agent) |
| ◈ LOUNGE | `#general`, `#voice` |

### Discord → API flows
- Slash commands → `discord/commands.ts` → runtime/store
- Approval buttons → `discord/button-handlers.ts` → `resolveApprovalDecision`
- Rich cards → `discord/rich-card-delivery.ts`
- Audit outbox → `discord/outbox.ts` → `#ops-feed`, `#approvals`
- House visits → `discord/house-visits.ts` → wiki journal append
- Cursor bridge → `#cursor` channel ↔ Cursor SDK

## 11. External integrations

| Integration | Config | Used by |
|-------------|--------|---------|
| Discord OAuth | `DISCORD_CLIENT_*`, cookie domain | Auth, bot |
| Cloudflare Tunnel | `cloudflared` service | Public URLs |
| Ollama | `FEATURE_OLLAMA`, `:11434` | Quota lane, LLM |
| OpenAI / Anthropic | API keys | Premium lane (when enabled) |
| Cursor SDK | `CURSOR_API_KEY`, `#cursor` | Implementer dispatch |
| GitHub | `AGENTOS_GITHUB_REPO`, `gh` | Release manager |
| GitLab workflow | MR conventions | Release (policy) |

## 12. IcePanel modeling checklist

Suggested diagram objects:

1. **Person:** Operator
2. **System:** AgentOS Local (boundary)
3. **Containers:** Command Center, API, Gateway, Worker, Scheduler
4. **Containers (external):** Discord, Cloudflare, Ollama, Cursor, GitHub
5. **Data stores:** SQLite, Wiki FS, Agent profiles
6. **Components (API):** Auth, Missions, Runtime, Discord bridge, Wiki API, Events WS
7. **Components (UI):** Forge shell, Dashboard, Wiki view, Control Gate
8. **Flow overlays:** Mission run, OAuth session, Wiki sync, Approval gate

Link types to draw:
- HTTPS (operator ↔ UI/API)
- Internal HTTP (UI proxy, worker→API, runtime→gateway)
- WebSocket (`/events`)
- File I/O (wiki, sqlite, profiles)
- Conditional agent handoffs (dashed = optional gate)

## Related

- [[flows/pipeline]]
- [[flows/memory-curator]]
- [[flows/cursor-memory]]
- [[product/forge-command-center-consolidated]]
- [[areas/repo-layout]]
- [[areas/apps-api]]
- [[areas/apps-command-center]]
