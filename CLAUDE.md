# CLAUDE.md — AgentOS Context for Claude

Read this first. Then read `.agentos/memory/wiki/index.md` for the full wiki.

## What this project is

**AgentOS** — a local-first AI operations platform served at `flous.dev`.
- pnpm monorepo at `C:\Users\gaged\Documents\AgenOS`
- GitHub: `github.com/GageDush/AgentOS`
- 5 services: Command Center (Next.js :3000), API (Fastify :8787), Gateway (:8790), Worker, Scheduler
- 21 Pokemon-named agents in a conditional pipeline (see `AGENTS.md` for pipeline rules)
- Public via Cloudflare Tunnel → `flous.dev`, `api.flous.dev`, `agentos.flous.dev`

## Your role in the multi-AI workflow

| Tool | Primary role |
|------|-------------|
| **Cursor** | Primary IDE — coding, file edits, wiki sync |
| **Codex** | Automated agent task runs |
| **ChatGPT** | Planning, brainstorming |
| **Claude Design** | Forge UI/UX design outputs |
| **Claude (you)** | Architecture, reports, audit, cross-cutting analysis, automation setup |

Claude is NOT the primary coder here. Default to: read the codebase → write reports/plans/specs → hand off to Cursor or Codex for implementation.

## Key files to read first

```
AGENTS.md                                    # Pipeline rules, agent policy, commands
docs/architecture.md                         # Full service + package inventory
docs/architecture/system-routing-schematic.md  # Full routing + API map + diagrams
docs/NEXT_STEPS.md                           # Open items
.agentos/memory/wiki/index.md               # Wiki index (start here for context)
.agentos/agent-registry.json               # 21 agents + pipeline order
.env.example                               # All env vars (check FEATURE_* flags)
```

## Current state (as of 2026-06-15)

**Active branch:** `pivot/agentos-local-command-center`

**What works:** SQLite persistence, Discord auth + bot, Fastify API, Next.js Forge UI, memory wiki (manual sync), mission execution (mock/Ollama mode), agent pipeline (conditional), CI on GitHub.

**Open priorities (from audit):**
1. Set `AGENTOS_CURSOR_WIKI_SYNC=true` in `.env` — Cursor sessions auto-feed wiki
2. Run `pnpm install:autostart` — stack starts on boot without manual launch
3. Add tunnel repair to Task Scheduler (every 5 min: `pnpm tunnel:repair`)
4. Delete `agentos-local.json` after confirming SQLite stability
5. Authenticate GitHub plugin in Claude Cowork for CI status reads

**Audit report:** `docs/AgentOS-Audit-Report.md` — full findings and fix priority order.

## Commands you'll use

```bash
pnpm stack:background     # start all services backgrounded
pnpm stack:status         # check service health
pnpm stack:restart        # restart stack
pnpm tunnel:repair        # repair Cloudflare tunnel
pnpm typecheck            # TypeScript check
pnpm test                 # Vitest unit tests
pnpm wiki:sync-cursor     # sync Cursor transcripts → wiki
pnpm wiki:sync-chatgpt    # sync ChatGPT exports → wiki
pnpm wiki:index-repo      # rebuild wiki index from repo
pnpm db:migrate           # run SQLite migrations
```

## Data stores

- **Primary:** `.agentos/state/agentos-local.db` (SQLite) — missions, runs, approvals, audit
- **Wiki:** `.agentos/memory/wiki/` — markdown articles, manifest at `_meta/index.json`
- **Agents:** `.agentos/agents/*.md` — 21 profile files
- **Registry:** `.agentos/agent-registry.json` — pipeline + tiers

## Forge design system

UI is `packages/ui` — warm-dark Forge theme, molten-orange accent `#FF6A35`, ember `#F04E1A`. Canonical spec: `apps/command-center/src/styles/forge-ds/DESIGN-SYSTEM.md`. Design handoff outputs also live in `docs/design/`. Don't override design decisions without checking those sources first.

## What NOT to do

- Don't reintroduce the Phaser office (`/demo/office` route) unless explicitly asked
- Don't switch to Postgres — SQLite is intentional until multi-machine hosting
- Don't add autonomous execution without approval gates and audit events
- Don't commit to `main` directly — use PRs via `release-manager` gate

## Multi-AI context sync

When switching back to this project in a new Claude session:
1. Read this file (you're doing it)
2. Check `docs/NEXT_STEPS.md` for what's pending
3. Check `.agentos/memory/wiki/sessions/` for recent Cursor session summaries
4. Check `docs/AgentOS-Audit-Report.md` for the current improvement plan

---

_Maintained by Claude Cowork · update this file when major decisions change_
