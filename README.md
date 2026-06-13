# AgentOS

AgentOS Local is the canonical product in this repo. It is a local-first, host-ready AI dev operations hub for creating missions, supervising safe execution, routing through installed `.agentos` profiles, approving risky actions, reading audit trails, and controlling the system through normal conversation plus quick actions.

## What Exists Now

- Host-ready domain model with workspace and operator boundaries
- SQL-backed local persistence behind a repository layer that can be swapped for a real Postgres adapter later
- Mission, run, approval, audit, archive, routine, session, routing, chat, and quick-action records
- Deterministic `.agentos` profile-driven routing
- Safe local worker spine for claiming queued runs and executing allow-listed commands
- Conversational control layer for normal-language prompts like `approve that`, `pause it`, `run QA`, and `show details`
- Quick actions with emoji-driven controls such as `✅`, `❌`, `⏸️`, `▶️`, `👀`, `🧪`, `🔒`, `🔁`, and `🧾`
- Rich agent message cards for chat-first control (`[Admin] Ash` placard layout with destination, context, and structured quick-action emojis)
- Rich-card emoji actions route through `POST /rich-actions/execute` with scoped approve/deny Control Gate enforcement
- Mock-first behavior with optional Ollama support for local prompt work

## Core Principles

- AgentOS Local is canonical
- The retired office demo is not part of the active product surface in this checkout
- The system is host-ready by design
- Local mode uses a default workspace and default operator
- `.agentos` profiles drive deterministic routing
- Conversational prompts and quick actions are the intended control surface
- Slash commands are not the intended UX
- Rich agent message cards reuse the same quick-action model for chat-first control and can render in Discord later without requiring slash commands
- Cloud APIs are disabled by default
- Unsafe autonomous execution is out of scope

## Monorepo Layout

### Apps

- `apps/command-center`: Next.js operator UI
- `apps/api`: Fastify API and durable control-layer endpoints
- `apps/gateway`: safe allow-listed command execution
- `apps/worker`: local worker loop for queued mission runs

### Packages

- `packages/shared`: durable domain types and default seed data
- `packages/persistence`: local persistence adapter and database shape
- `packages/persistence`: SQL adapters, repository methods, and compatibility snapshot helpers
- `packages/runtime`: worker/runtime spine, quick actions, and conversational control
- `packages/agents`: installed `.agentos` registry/profile loading
- `packages/orchestrator`: deterministic routing and intent parsing
- `packages/sandbox`: command policy and permission levels
- `packages/memory`: archive helpers
- `packages/token-manager`: usage and budget helpers

### Control-Layer Profiles

- `.agentos/agents/`
- `.agentos/contracts/`
- `.agentos/agent-registry.json`

Validate profiles with:

```powershell
pnpm agentos:validate-profiles
```

## Runtime Spine

Persistent entities:

- workspaces
- operators
- missions
- mission runs
- approval requests
- audit events
- archive entries
- routines
- sessions
- agent routing decisions
- provider usage
- chat threads
- chat messages
- quick actions

Local persistence now uses a SQL-backed database at `.agentos/state/agentos-local.db`. The older JSON persistence file is deprecated and kept only as a compatibility/import path, not the primary runtime store.

Runtime code now uses repository-native transaction bundles for the highest-churn transitions: mission creation, route persistence, approval requests, approval decisions, run execution start, pause/resume, retry, quick action consumption, run completion, run failure, and chat exchange persistence. `snapshot()`, `mutate()`, and `reset()` still remain for compatibility and local developer convenience while lower-churn paths continue to migrate.

## Safety Model

Auto-allowed commands:

- `git status`
- `git diff`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

Approval-required:

- dependency install
- network access
- `.env` access
- git commit
- git push
- workspace mutation outside the small allow-list
- elevated sandbox levels

Denied:

- `sudo`
- destructive global filesystem commands
- unrestricted elevated/system operations

## Getting Started

### Prerequisites

- Node.js 22+
- `pnpm`
- Optional: Ollama for local model-backed prompt work

### Install

```powershell
pnpm install
Copy-Item .env.example .env
```

### Initialize local durable state

```powershell
pnpm db:migrate
pnpm db:seed
```

Optional local reset:

```powershell
pnpm db:reset
```

### Validate

```powershell
pnpm sanitize:check
pnpm env:check
pnpm typecheck
pnpm test
pnpm agentos:validate-profiles
```

### Run

```powershell
pnpm dev
```

Expected local URLs:

- Dashboard: `http://localhost:3000`
- API health: `http://localhost:8787/health`
- Gateway health: `http://localhost:8790/health`

## Conversational Control

AgentOS Local is designed around normal prompts, not command syntax.

Examples:

- `approve that`
- `pause it`
- `show details`
- `run QA`
- `retry`
- `summarize`

When a request is ambiguous, AgentOS asks for clarification instead of guessing dangerously.

## Local AI With Ollama

The command center can still use Ollama for local prompt work.

Recommended setup:

```powershell
ollama serve
ollama pull qwen2.5-coder:7b
```

Optional `.env` values:

```env
AGENTOS_MODEL_PROVIDER=ollama
AGENTOS_DEFAULT_MODEL=qwen2.5-coder:7b
FEATURE_OLLAMA=true
```

Cloud APIs stay disabled by default.

## Persistence Direction

- SQLite is the active local storage engine
- Repository methods are the preferred write/read path for runtime-safe operations
- Runtime-critical transitions are bundled into SQLite transactions through the repository layer
- `snapshot()`, `mutate()`, and `reset()` still exist for compatibility and UI/dev convenience
- A hosted Postgres adapter is the intended next persistence target
- Chat plus quick actions remain the intended control UX

Supporting docs:

- [API/store mutate audit](C:\Users\gaged\Documents\AgenOS\docs\HOSTING_API_STORE_AUDIT.md)
- [Hosted execution notes](C:\Users\gaged\Documents\AgenOS\docs\HOSTED_EXECUTION_NOTES.md)
- [Hosting secrets template](C:\Users\gaged\Documents\AgenOS\docs\agentos-hosting-secrets-template.txt)

## Troubleshooting

- If the dashboard falls back to seed data, make sure the API is running on `8787`.
- If mission runs do not progress, make sure the worker is running or use the API-triggered local run path.
- If `/llm/chat` fails, verify Ollama is serving on `http://127.0.0.1:11434`.
- If a Next.js chunk error appears during local dev, clear `apps/command-center/.next` and restart the dev server.

## Status

This repository is an active local-first control-layer build. The durable SQL runtime spine is in place, the office scene has been removed from this checkout, and the next work should deepen worker recovery, richer query patterns, and hosted Postgres readiness without weakening the current safety posture.
