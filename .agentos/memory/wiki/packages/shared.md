---
slug: packages/shared
title: Shared
tags: [package, monorepo, auto-indexed]
valid_from: 2026-06-16
---
# @agentos/shared
AgentOS package workspace unit.
## Role
Shared library under `packages/shared/`.
## Workspace dependencies
- _(none)_
## Key exports

- `AgentStatus`
- `AgentProfile`
- `WorkspaceMode`
- `WorkspaceRecord`
- `OperatorRecord`
- `TaskStatus`
- `AgentTask`
- `MemoryType`
- `MemoryRecord`
- `UsageEvent`
- `UsageBudget`
- `SandboxPermissionLevel`
- `ApprovalScope`
- `ApprovalRecord`
- `AuditEvent`
- `SystemHealth`
- `LlmProviderId`
- `LlmChatRequest`
- `LlmChatResponse`
- `DemoMissionStep`
- `DemoMissionRun`
- `MissionCommandPolicy`
- `MissionRunLogLevel`
- `MissionRunLog`
## Source layout

- `src/agent-id-map.ts`
- `src/agent-rich-action.test.ts`
- `src/agent-rich-action.ts`
- `src/agent-rich-message.test.ts`
- `src/agent-rich-message.ts`
- `src/agent-roster.ts`
- `src/build-intent.test.ts`
- `src/build-intent.ts`
- `src/gates.test.ts`
- `src/gates.ts`
- `src/index.test.ts`
- `src/index.ts`
- `src/memory-update.ts`
- `src/release.ts`
- `src/tools.test.ts`
- `src/tools.ts`
- `src/wiki-edit.ts`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[packages/runtime]]

## Mission notes

- **2026-06-17T00:10:43** — memory-curator: Cursor: can you ge the discord running: For live replies: API must be running with FEATURE_DISCORD=true: pnpm dev:api # or pnpm control -Action Rest (scope: apps/command-center/public/agents/, apps/api/public/agents, apps/command-center/public/agents, packages/runtime; artifacts: cursor-transcript)

See also: [[areas/apps-command-center]]

See also: [[areas/apps-api]]

- **2026-06-17T00:11:04** — memory-curator: Cursor: Search the AgentOS repository at C:\Users\gaged\Documents\AgenOS for: 1. App generation / orchestration code 2. uiPreset or similar UI prese (scope: apps/api, packages/runtime, packages/orchestrator, apps/gateway; artifacts: cursor-transcript)

See also: [[packages/orchestrator]]

- **2026-06-17T01:08:11** — memory-curator: Cursor: Search the AgentOS repository at C:\Users\gaged\Documents\AgenOS for the main command center / dashboard application. Look for: 1. Dashboard (scope: packages/shared, apps/command-center, apps/api; artifacts: cursor-transcript)

- **2026-06-17T01:08:33** — memory-curator: Cursor: Make a plan for all of the Agent profiles and routing of agents for AgentOS. Give me a map of what is supposed to happen, what agents we hav (scope: packages/orchestrator, packages/runtime, packages/agents, packages/runtime/src/index.ts; artifacts: cursor-transcript)

See also: [[packages/agents]]

- **2026-06-17T01:08:37** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. packages/agents/src/implementer-dispatch.ts - how gateway/cursor/mock work 2. packages/share (scope: packages/agents/src/implementer-dispatch.ts, packages/shared, packages/orchestrator, packages/agents; artifacts: cursor-transcript)

- **2026-06-17T01:08:42** — memory-curator: Cursor: Create me a 100 step prompt pathway to completion of this project to a demo worthy state. each step should include success parameters to eac (scope: apps/command-center, apps/api, packages/runtime, docs/AGENTOS_LOCAL_PIVOT_PLAN.md; artifacts: cursor-transcript)

- **2026-06-17T01:09:11** — memory-curator: Cursor: In repo C:\Users\gaged\Documents\AgenOS, implement Wave 0 Lane L5: add `app_creation` task type to packages/shared and stub contract at .age (scope: packages/shared, packages/shared., packages/shared/src/build-intent.ts, packages/shared/src/build-intent.test.ts; artifacts: cursor-transcript)

- **2026-06-17T01:09:30** — memory-curator: Cursor: Explore the AgentOS monorepo at C:\Users\gaged\Documents\AgenOS for unused/ghost code from previous iterations. Look for: 1. Orphaned files  (scope: apps/api/src, apps/api/src/index.ts, packages/tools, packages/shared/src/index.ts; artifacts: cursor-transcript)

See also: [[packages/tools]]

See also: [[packages/config]]

- **2026-06-17T01:10:21** — memory-curator: Cursor: Paste this into Cursor. It is designed as an **audit/report prompt**, not an implementation prompt. You are working in my AgentOS repo. Goal (scope: scripts/validate-agent-profiles.mjs, packages/orchestrator, packages/runtime, packages/persistence; artifacts: cursor-transcript)

See also: [[packages/persistence]]

- **2026-06-17T01:10:34** — memory-curator: Cursor: Audit runtime routing in C:\Users\gaged\Documents\AgenOS. Search and read: 1. `packages/orchestrator` - how missions are routed, conditional (scope: packages/orchestrator, packages/runtime, packages/shared, scripts/validate-agent-profiles.mjs; artifacts: cursor-transcript)

- **2026-06-17T01:10:41** — memory-curator: Cursor: Audit the AgentOS `.agentos/` control layer in C:\Users\gaged\Documents\AgenOS. Read and summarize: 1. List all files in `.agentos/` includi (scope: scripts/validate-agent-profiles.mjs, docs/spec, docs/memory, packages/shared/src/index.ts; artifacts: cursor-transcript)

- **2026-06-17T01:15:53** — memory-curator: Cursor: You are the Phase 2 implementation agent for AgentOS at C:\Users\gaged\Documents\AgenOS. ## Part A — Merge PR #1 (do this FIRST) 1. `git fet (scope: packages/runtime/src/index.ts, apps/api/src/store.ts, apps/api/src/discord/notify.ts, packages/orchestrator; artifacts: cursor-transcript)

- **2026-06-17T01:16:01** — memory-curator: Cursor: You are Agent 5 (CI & Merge Prep) for AgentOS at C:\Users\gaged\Documents\AgenOS. **READ-ONLY + validation + PR text. Do NOT commit or push  (scope: docs/PIVOT_MERGE_CHECKLIST.md, packages/persistence, packages/persistence/src/index.test.ts, apps/api; artifacts: cursor-transcript)

- **2026-06-17T01:16:17** — memory-curator: Cursor: Plan a layout for the discord server/guild that utilizes the full spectrum of what can be modified in a discord server with a fully authed a (scope: scripts/bootstrap-discord-guild.ts, apps/api/src/discord/, packages/shared/src/index.ts, apps/command-center/src/components/local/AgentOSLocalApp.tsx; artifacts: cursor-transcript)

- **2026-06-17T01:16:31** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. Existing discord embeds in apps/api/src/discord/embeds.ts, personas.ts 2. packages/shared st (scope: apps/api/src/discord/embeds.ts, packages/shared, apps/command-center, apps/api/src/discord/; artifacts: cursor-transcript)
