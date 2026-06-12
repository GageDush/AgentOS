---
slug: packages/persistence
title: Persistence
tags: [package, monorepo, auto-indexed]
valid_from: 2026-06-12
---
# @agentos/persistence
AgentOS package workspace unit.
## Role
Shared library under `packages/persistence/`.
## Workspace dependencies
- `@agentos/shared`
## Key exports

- `AgentOSDatabase`
- `PersistenceAdapter`
- `CURRENT_SCHEMA_VERSION`
- `buildSeedDatabase`
- `findRepoRoot`
- `resolveAgentOSDataPath`
- `resolveLegacyAgentOSJsonPath`
- `JsonFilePersistenceAdapter`
- `SqlitePersistenceAdapter`
- `FilePersistenceAdapter`
- `getPersistenceAdapter`
- `getJsonFallbackAdapter`
- `resetPersistenceAdapterForTests`
- `resetSqliteDatabaseFile`
- `type`
- `emitApprovalCreated`
- `onApprovalCreated`
- `resetApprovalCreatedListenersForTests`
## Source layout

- `src/adapters/`
  - `src/adapters/json.ts`
  - `src/adapters/postgres.ts`
  - `src/adapters/sqlite.ts`
- `src/approval-hooks.ts`
- `src/index.test.ts`
- `src/index.ts`
- `src/repository.ts`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[packages/runtime]]

## Mission notes

- **2026-06-12T13:43:31** — memory-curator: Cursor: You are Claude running inside Cursor on my AgentOS repo. Your first job is orientation only. Do not edit files yet. AgentOS summary: AgentOS (scope: scripts/validate-agent-profiles.mjs, apps/api/src/store.ts, packages/persistence/, packages/runtime/; artifacts: cursor-transcript)

See also: [[areas/apps-api]]

- **2026-06-12T13:43:32** — memory-curator: Cursor: Search the AgentOS repository at C:\Users\gaged\Documents\AgenOS for: 1. App generation / orchestration code 2. uiPreset or similar UI prese (scope: apps/api, packages/runtime, packages/orchestrator, apps/gateway; artifacts: cursor-transcript)

See also: [[packages/orchestrator]]

- **2026-06-12T13:43:35** — memory-curator: Cursor: Create me a 100 step prompt pathway to completion of this project to a demo worthy state. each step should include success parameters to eac (scope: apps/command-center, apps/api, packages/runtime, docs/AGENTOS_LOCAL_PIVOT_PLAN.md; artifacts: cursor-transcript)

See also: [[areas/apps-command-center]]

- **2026-06-12T13:43:35** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: playwright e2e setup, demo-smoke scripts, redis/queue/cron scheduler stubs, release manager API (scope: docs/demo, packages/persistence, apps/worker/src/index.ts, docs/architecture.md; artifacts: cursor-transcript)

See also: [[areas/apps-worker]]

See also: [[areas/apps-scheduler]]

See also: [[packages/queue]]

- **2026-06-12T13:43:36** — memory-curator: Cursor: Paste this into Cursor. It is designed as an **audit/report prompt**, not an implementation prompt. You are working in my AgentOS repo. Goal (scope: scripts/validate-agent-profiles.mjs, packages/orchestrator, packages/runtime, packages/persistence; artifacts: cursor-transcript)

See also: [[packages/shared]]

- **2026-06-12T13:43:38** — memory-curator: Cursor: Audit the AgentOS `.agentos/` control layer in C:\Users\gaged\Documents\AgenOS. Read and summarize: 1. List all files in `.agentos/` includi (scope: scripts/validate-agent-profiles.mjs, docs/spec, docs/memory, packages/shared/src/index.ts; artifacts: cursor-transcript)

See also: [[packages/agents]]

- **2026-06-12T13:43:38** — memory-curator: Cursor: Audit persistence, worker, gates, and sandbox in C:\Users\gaged\Documents\AgenOS: 1. `packages/persistence` - backend type (JSON/SQLite/Post (scope: packages/persistence, apps/worker, packages/sandbox, apps/gateway; artifacts: cursor-transcript)

See also: [[packages/sandbox]]

See also: [[areas/apps-gateway]]

- **2026-06-12T13:43:39** — memory-curator: Cursor: all other chats on this repositories have or are working on pushing their git commits. summarize what the project should eventually do, what (scope: packages/orchestrator, packages/agents, packages/ui, scripts/agentos-control.ps1; artifacts: cursor-transcript)

See also: [[packages/ui]]

- **2026-06-12T13:43:39** — memory-curator: Cursor: <plugin_info kind="matched_installed"> display_name: Cloudflare description: Skills for the Cloudflare developer platform: Workers, Durable  (scope: docs/troubleshooting.md, scripts/setup-cloudflare-tunnel.ps1, scripts/agentos-control.ps1, packages/runtime; artifacts: cursor-transcript)

- **2026-06-12T13:43:39** — memory-curator: Cursor: You are Agent 3 (Discord Control Gate) for AgentOS at C:\Users\gaged\Documents\AgenOS. **OWNERSHIP — only touch:** - `apps/api/src/discord/n (scope: apps/api/src/discord/notify.ts, apps/api/src/discord/button-handlers.ts, apps/api/src/discord/embeds.ts, apps/api/src/discord/interactions.ts; artifacts: cursor-transcript)

- **2026-06-12T13:43:39** — memory-curator: Cursor: You are Agent 4 (Postgres Host-Readiness) for AgentOS at C:\Users\gaged\Documents\AgenOS. **OWNERSHIP — only touch:** - `packages/persistenc (scope: packages/persistence/src/adapters/postgres.ts, packages/persistence/src/index.test.ts, packages/persistence/package.json, packages/persistence; artifacts: cursor-transcript)

- **2026-06-12T13:43:40** — memory-curator: Cursor: You are Agent 5 (CI & Merge Prep) for AgentOS at C:\Users\gaged\Documents\AgenOS. **READ-ONLY + validation + PR text. Do NOT commit or push  (scope: docs/PIVOT_MERGE_CHECKLIST.md, packages/persistence, packages/persistence/src/index.test.ts, apps/api; artifacts: cursor-transcript)

- **2026-06-12T13:43:42** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. Existing discord embeds in apps/api/src/discord/embeds.ts, personas.ts 2. packages/shared st (scope: apps/api/src/discord/embeds.ts, packages/shared, apps/command-center, apps/api/src/discord/; artifacts: cursor-transcript)
