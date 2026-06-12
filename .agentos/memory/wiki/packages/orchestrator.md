---
slug: packages/orchestrator
title: Orchestrator package
tags: [routing, classifier]
valid_from: 2026-06-12
---
# Orchestrator package

Deterministic routing: task classifier, context minimizer, quota hints, planner scoring.

## Outputs

- `determineMissionRoute()` — primary agent + required gates
- `buildTaskEnvelope()` — compact mission contract for agents
- `buildContextPacket()` — scoped files + wiki memory (`FEATURE_MEMORY_WIKI`)

## Related

- [[packages/runtime]]
- [[areas/code-ownership]]

## Mission notes

- **2026-06-12T13:43:31** — memory-curator: Cursor: Summarize all active agents in AgentOS, include all agent data and purpose in prompt cycles/agent chains Each Agent should have an assigned  (scope: packages/orchestrator, packages/agents/src/executor.ts, packages/agents/src/llm.ts, packages/agents/src/qa-gate.ts; artifacts: cursor-transcript)

See also: [[areas/repo-layout]]

See also: [[packages/agents]]

See also: [[packages/ui]]

- **2026-06-12T13:43:32** — memory-curator: Cursor: Search the AgentOS repository at C:\Users\gaged\Documents\AgenOS for: 1. App generation / orchestration code 2. uiPreset or similar UI prese (scope: apps/api, packages/runtime, packages/orchestrator, apps/gateway; artifacts: cursor-transcript)

See also: [[areas/apps-api]]

See also: [[areas/apps-gateway]]

- **2026-06-12T13:43:34** — memory-curator: Cursor: Make a plan for all of the Agent profiles and routing of agents for AgentOS. Give me a map of what is supposed to happen, what agents we hav (scope: packages/orchestrator, packages/runtime, packages/agents, packages/runtime/src/index.ts; artifacts: cursor-transcript)

See also: [[packages/shared]]

- **2026-06-12T13:43:34** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. packages/agents/src/implementer-dispatch.ts - how gateway/cursor/mock work 2. packages/share (scope: packages/agents/src/implementer-dispatch.ts, packages/shared, packages/orchestrator, packages/agents; artifacts: cursor-transcript)

- **2026-06-12T13:43:36** — memory-curator: Cursor: Paste this into Cursor. It is designed as an **audit/report prompt**, not an implementation prompt. You are working in my AgentOS repo. Goal (scope: scripts/validate-agent-profiles.mjs, packages/orchestrator, packages/runtime, packages/persistence; artifacts: cursor-transcript)

See also: [[packages/persistence]]

- **2026-06-12T13:43:37** — memory-curator: Cursor: Audit runtime routing in C:\Users\gaged\Documents\AgenOS. Search and read: 1. `packages/orchestrator` - how missions are routed, conditional (scope: packages/orchestrator, packages/runtime, packages/shared, scripts/validate-agent-profiles.mjs; artifacts: cursor-transcript)

- **2026-06-12T13:43:37** — memory-curator: Cursor: Audit conversational control and product narrative in C:\Users\gaged\Documents\AgenOS: 1. `apps/command-center` - chat-first vs slash comman (scope: apps/command-center, apps/api, packages/orchestrator, packages/runtime; artifacts: cursor-transcript)

See also: [[areas/apps-command-center]]

- **2026-06-12T13:43:38** — memory-curator: Cursor: Audit the AgentOS `.agentos/` control layer in C:\Users\gaged\Documents\AgenOS. Read and summarize: 1. List all files in `.agentos/` includi (scope: scripts/validate-agent-profiles.mjs, docs/spec, docs/memory, packages/shared/src/index.ts; artifacts: cursor-transcript)

- **2026-06-12T13:43:39** — memory-curator: Cursor: all other chats on this repositories have or are working on pushing their git commits. summarize what the project should eventually do, what (scope: packages/orchestrator, packages/agents, packages/ui, scripts/agentos-control.ps1; artifacts: cursor-transcript)

- **2026-06-12T13:43:40** — memory-curator: Cursor: You are the Phase 2 implementation agent for AgentOS at C:\Users\gaged\Documents\AgenOS. ## Part A — Merge PR #1 (do this FIRST) 1. `git fet (scope: packages/runtime/src/index.ts, apps/api/src/store.ts, apps/api/src/discord/notify.ts, packages/orchestrator; artifacts: cursor-transcript)

- **2026-06-12T13:43:40** — memory-curator: Cursor: You are Agent 5 (CI & Merge Prep) for AgentOS at C:\Users\gaged\Documents\AgenOS. **READ-ONLY + validation + PR text. Do NOT commit or push  (scope: docs/PIVOT_MERGE_CHECKLIST.md, packages/persistence, packages/persistence/src/index.test.ts, apps/api; artifacts: cursor-transcript)

- **2026-06-12T13:43:41** — memory-curator: Cursor: Plan a layout for the discord server/guild that utilizes the full spectrum of what can be modified in a discord server with a fully authed a (scope: scripts/bootstrap-discord-guild.ts, apps/api/src/discord/, packages/shared/src/index.ts, apps/command-center/src/components/local/AgentOSLocalApp.tsx; artifacts: cursor-transcript)

- **2026-06-12T13:43:42** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. Existing discord embeds in apps/api/src/discord/embeds.ts, personas.ts 2. packages/shared st (scope: apps/api/src/discord/embeds.ts, packages/shared, apps/command-center, apps/api/src/discord/; artifacts: cursor-transcript)
