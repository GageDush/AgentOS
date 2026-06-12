---
slug: packages/runtime
title: Runtime package
tags: [runtime, missions, gates]
valid_from: 2026-06-12
---
# Runtime package

`packages/runtime` owns `processRun()` — the mission spine.

## Flow

1. Classify and route ([[packages/orchestrator]])
2. Optional context minimizer (loads [[index|wiki]] pages)
3. Agent pipeline (mock or implementer dispatch)
4. Gateway command execution
5. Completion gates: QA, security, review, release

## Gates

Gate checks run via gateway commands. Operators consume quick actions from Forge or Discord.

## Related

- [[flows/test-commands]]
- [[areas/risk-areas]]
- [[packages/agents]]

## Mission notes

- **2026-06-12T13:43:31** — memory-curator: Cursor: You are Claude running inside Cursor on my AgentOS repo. Your first job is orientation only. Do not edit files yet. AgentOS summary: AgentOS (scope: scripts/validate-agent-profiles.mjs, apps/api/src/store.ts, packages/persistence/, packages/runtime/; artifacts: cursor-transcript)

See also: [[areas/repo-layout]]

See also: [[areas/apps-api]]

See also: [[packages/persistence]]

- **2026-06-12T13:43:31** — memory-curator: Cursor: can you ge the discord running: For live replies: API must be running with FEATURE_DISCORD=true: pnpm dev:api # or pnpm control -Action Rest (scope: apps/command-center/public/agents/, apps/api/public/agents, apps/command-center/public/agents, packages/runtime; artifacts: cursor-transcript)

See also: [[areas/apps-command-center]]

See also: [[packages/ui]]

- **2026-06-12T13:43:31** — memory-curator: Cursor: Summarize all active agents in AgentOS, include all agent data and purpose in prompt cycles/agent chains Each Agent should have an assigned  (scope: packages/orchestrator, packages/agents/src/executor.ts, packages/agents/src/llm.ts, packages/agents/src/qa-gate.ts; artifacts: cursor-transcript)

- **2026-06-12T13:43:32** — memory-curator: Cursor: Search the AgentOS repository at C:\Users\gaged\Documents\AgenOS for: 1. App generation / orchestration code 2. uiPreset or similar UI prese (scope: apps/api, packages/runtime, packages/orchestrator, apps/gateway; artifacts: cursor-transcript)

See also: [[areas/apps-gateway]]

- **2026-06-12T13:43:34** — memory-curator: Cursor: Make a plan for all of the Agent profiles and routing of agents for AgentOS. Give me a map of what is supposed to happen, what agents we hav (scope: packages/orchestrator, packages/runtime, packages/agents, packages/runtime/src/index.ts; artifacts: cursor-transcript)

See also: [[packages/shared]]

- **2026-06-12T13:43:34** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. packages/agents/src/implementer-dispatch.ts - how gateway/cursor/mock work 2. packages/share (scope: packages/agents/src/implementer-dispatch.ts, packages/shared, packages/orchestrator, packages/agents; artifacts: cursor-transcript)

- **2026-06-12T13:43:35** — memory-curator: Cursor: Create me a 100 step prompt pathway to completion of this project to a demo worthy state. each step should include success parameters to eac (scope: apps/command-center, apps/api, packages/runtime, docs/AGENTOS_LOCAL_PIVOT_PLAN.md; artifacts: cursor-transcript)

- **2026-06-12T13:43:36** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for LLM executor, agents llm.ts, release manager, and runtime processRun flow. Return: (1) current e (scope: packages/agents/src/llm.ts, apps/api/src/providers.ts, apps/api/src/index.ts, apps/api/src/discord/button-handlers.ts; artifacts: cursor-transcript)

See also: [[areas/apps-worker]]

- **2026-06-12T13:43:36** — memory-curator: Cursor: Paste this into Cursor. It is designed as an **audit/report prompt**, not an implementation prompt. You are working in my AgentOS repo. Goal (scope: scripts/validate-agent-profiles.mjs, packages/orchestrator, packages/runtime, packages/persistence; artifacts: cursor-transcript)

- **2026-06-12T13:43:37** — memory-curator: Cursor: Audit runtime routing in C:\Users\gaged\Documents\AgenOS. Search and read: 1. `packages/orchestrator` - how missions are routed, conditional (scope: packages/orchestrator, packages/runtime, packages/shared, scripts/validate-agent-profiles.mjs; artifacts: cursor-transcript)

- **2026-06-12T13:43:37** — memory-curator: Cursor: Audit conversational control and product narrative in C:\Users\gaged\Documents\AgenOS: 1. `apps/command-center` - chat-first vs slash comman (scope: apps/command-center, apps/api, packages/orchestrator, packages/runtime; artifacts: cursor-transcript)

- **2026-06-12T13:43:38** — memory-curator: Cursor: Audit persistence, worker, gates, and sandbox in C:\Users\gaged\Documents\AgenOS: 1. `packages/persistence` - backend type (JSON/SQLite/Post (scope: packages/persistence, apps/worker, packages/sandbox, apps/gateway; artifacts: cursor-transcript)

See also: [[packages/sandbox]]

- **2026-06-12T13:43:39** — memory-curator: Cursor: all other chats on this repositories have or are working on pushing their git commits. summarize what the project should eventually do, what (scope: packages/orchestrator, packages/agents, packages/ui, scripts/agentos-control.ps1; artifacts: cursor-transcript)

- **2026-06-12T13:43:39** — memory-curator: Cursor: <plugin_info kind="matched_installed"> display_name: Cloudflare description: Skills for the Cloudflare developer platform: Workers, Durable  (scope: docs/troubleshooting.md, scripts/setup-cloudflare-tunnel.ps1, scripts/agentos-control.ps1, packages/runtime; artifacts: cursor-transcript)

- **2026-06-12T13:43:39** — memory-curator: Cursor: You are Agent 3 (Discord Control Gate) for AgentOS at C:\Users\gaged\Documents\AgenOS. **OWNERSHIP — only touch:** - `apps/api/src/discord/n (scope: apps/api/src/discord/notify.ts, apps/api/src/discord/button-handlers.ts, apps/api/src/discord/embeds.ts, apps/api/src/discord/interactions.ts; artifacts: cursor-transcript)

- **2026-06-12T13:43:40** — memory-curator: Cursor: You are the Phase 2 implementation agent for AgentOS at C:\Users\gaged\Documents\AgenOS. ## Part A — Merge PR #1 (do this FIRST) 1. `git fet (scope: packages/runtime/src/index.ts, apps/api/src/store.ts, apps/api/src/discord/notify.ts, packages/orchestrator; artifacts: cursor-transcript)

- **2026-06-12T13:43:40** — memory-curator: Cursor: You are Agent 2 (Runtime Safety) for AgentOS at C:\Users\gaged\Documents\AgenOS. **OWNERSHIP — only touch:** - `packages/runtime/src/index.t (scope: packages/runtime/src/index.ts, packages/runtime/src/index.test.ts, packages/runtime/package.json, packages/runtime; artifacts: cursor-transcript)

- **2026-06-12T13:43:40** — memory-curator: Cursor: You are Agent 5 (CI & Merge Prep) for AgentOS at C:\Users\gaged\Documents\AgenOS. **READ-ONLY + validation + PR text. Do NOT commit or push  (scope: docs/PIVOT_MERGE_CHECKLIST.md, packages/persistence, packages/persistence/src/index.test.ts, apps/api; artifacts: cursor-transcript)

- **2026-06-12T13:43:41** — memory-curator: Cursor: Explore the AgentOS monorepo at C:\Users\gaged\Documents\AgenOS and return a structured report covering: 1. Top-level folder structure (apps (scope: apps/api/src/index.ts, apps/api/src/discord/, apps/command-center, packages/agents; artifacts: cursor-transcript)

- **2026-06-12T13:43:41** — memory-curator: Cursor: Plan a layout for the discord server/guild that utilizes the full spectrum of what can be modified in a discord server with a fully authed a (scope: scripts/bootstrap-discord-guild.ts, apps/api/src/discord/, packages/shared/src/index.ts, apps/command-center/src/components/local/AgentOSLocalApp.tsx; artifacts: cursor-transcript)

- **2026-06-12T13:43:42** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. Existing discord embeds in apps/api/src/discord/embeds.ts, personas.ts 2. packages/shared st (scope: apps/api/src/discord/embeds.ts, packages/shared, apps/command-center, apps/api/src/discord/; artifacts: cursor-transcript)
