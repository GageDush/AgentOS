---
slug: packages/sandbox
title: Sandbox
tags: [package, monorepo, auto-indexed]
valid_from: 2026-06-16
---
# @agentos/sandbox
AgentOS package workspace unit.
## Role
Shared library under `packages/sandbox/`.
## Workspace dependencies
- _(none)_
## Key exports

- `SandboxMode`
- `defaultSandboxMode`
- `sandboxPermissionLevels`
- `CommandPolicyDecision`
- `assessCommandPolicy`
## Source layout

- `src/index.test.ts`
- `src/index.ts`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[packages/runtime]]

## Mission notes

- **2026-06-17T01:08:37** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. packages/agents/src/implementer-dispatch.ts - how gateway/cursor/mock work 2. packages/share (scope: packages/agents/src/implementer-dispatch.ts, packages/shared, packages/orchestrator, packages/agents; artifacts: cursor-transcript)

See also: [[packages/agents]]

See also: [[packages/shared]]

See also: [[packages/orchestrator]]

- **2026-06-17T01:13:39** — memory-curator: Cursor: Audit persistence, worker, gates, and sandbox in C:\Users\gaged\Documents\AgenOS: 1. `packages/persistence` - backend type (JSON/SQLite/Post (scope: packages/persistence, apps/worker, packages/sandbox, apps/gateway; artifacts: cursor-transcript)

See also: [[packages/persistence]]

See also: [[areas/apps-worker]]

See also: [[areas/apps-gateway]]

- **2026-06-17T01:16:07** — memory-curator: Cursor: Analyze the complete file structure, integration network, and any other system schematic profile you can think of that pertains to the Agent (scope: docs/demo/BUILD_PROGRESS.md, docs/demo/IMPLEMENTATION_BRIEF.md, scripts/validate-profiles, apps/command-center; artifacts: cursor-transcript)

See also: [[areas/apps-command-center]]

See also: [[areas/apps-api]]

See also: [[packages/tools]]
