---
slug: packages/agents
title: Agents package
tags: [agents, pipeline]
valid_from: 2026-06-12
---
# Agents package

`packages/agents` implements specialist steps, implementer dispatch, and the [[flows/memory-curator|memory curator]].

## Key modules

- `executor.ts` — `executeAgentPipelineStep`
- `implementer-dispatch.ts` — gateway / cursor implementer
- `memory-curator.ts` — repo memory files (migrating to wiki)

## Related

- [[packages/runtime]]
- [[flows/test-commands]]

## Mission notes

- **2026-06-12T13:43:31** — memory-curator: Cursor: Summarize all active agents in AgentOS, include all agent data and purpose in prompt cycles/agent chains Each Agent should have an assigned  (scope: packages/orchestrator, packages/agents/src/executor.ts, packages/agents/src/llm.ts, packages/agents/src/qa-gate.ts; artifacts: cursor-transcript)

See also: [[areas/repo-layout]]

See also: [[packages/orchestrator]]

See also: [[packages/ui]]

- **2026-06-12T13:43:34** — memory-curator: Cursor: Make a plan for all of the Agent profiles and routing of agents for AgentOS. Give me a map of what is supposed to happen, what agents we hav (scope: packages/orchestrator, packages/runtime, packages/agents, packages/runtime/src/index.ts; artifacts: cursor-transcript)

See also: [[packages/shared]]

- **2026-06-12T13:43:34** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. packages/agents/src/implementer-dispatch.ts - how gateway/cursor/mock work 2. packages/share (scope: packages/agents/src/implementer-dispatch.ts, packages/shared, packages/orchestrator, packages/agents; artifacts: cursor-transcript)

See also: [[areas/apps-api]]

- **2026-06-12T13:43:36** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for LLM executor, agents llm.ts, release manager, and runtime processRun flow. Return: (1) current e (scope: packages/agents/src/llm.ts, apps/api/src/providers.ts, apps/api/src/index.ts, apps/api/src/discord/button-handlers.ts; artifacts: cursor-transcript)

See also: [[areas/apps-worker]]

- **2026-06-12T13:43:37** — memory-curator: Cursor: Audit runtime routing in C:\Users\gaged\Documents\AgenOS. Search and read: 1. `packages/orchestrator` - how missions are routed, conditional (scope: packages/orchestrator, packages/runtime, packages/shared, scripts/validate-agent-profiles.mjs; artifacts: cursor-transcript)

- **2026-06-12T13:43:38** — memory-curator: Cursor: Audit the AgentOS `.agentos/` control layer in C:\Users\gaged\Documents\AgenOS. Read and summarize: 1. List all files in `.agentos/` includi (scope: scripts/validate-agent-profiles.mjs, docs/spec, docs/memory, packages/shared/src/index.ts; artifacts: cursor-transcript)

See also: [[packages/persistence]]

- **2026-06-12T13:43:38** — memory-curator: Cursor: Audit persistence, worker, gates, and sandbox in C:\Users\gaged\Documents\AgenOS: 1. `packages/persistence` - backend type (JSON/SQLite/Post (scope: packages/persistence, apps/worker, packages/sandbox, apps/gateway; artifacts: cursor-transcript)

See also: [[packages/sandbox]]

- **2026-06-12T13:43:39** — memory-curator: Cursor: all other chats on this repositories have or are working on pushing their git commits. summarize what the project should eventually do, what (scope: packages/orchestrator, packages/agents, packages/ui, scripts/agentos-control.ps1; artifacts: cursor-transcript)

- **2026-06-12T13:43:41** — memory-curator: Cursor: Explore the AgentOS monorepo at C:\Users\gaged\Documents\AgenOS and return a structured report covering: 1. Top-level folder structure (apps (scope: apps/api/src/index.ts, apps/api/src/discord/, apps/command-center, packages/agents; artifacts: cursor-transcript)

See also: [[areas/apps-command-center]]

- **2026-06-16T14:10:48** — memory-curator: Cursor: I'll start by locating the single AgentOS repository root under `C:\Users\gaged`. Let me search for identifying markers. Two candidate locat (scope: docs/AGENTOS_FULL_REVIEW.md, docs/AGENTOS_SMOKE_TEST_REPORT.md, docs/AGENTOS_FEATURE_MATRIX.md, docs/AGENTOS_ARCHITECTURE_MAP.md; artifacts: cursor-transcript)
