---
slug: packages/queue
title: Queue
tags: [package, monorepo, auto-indexed]
valid_from: 2026-06-12
---
# @agentos/queue
AgentOS package workspace unit.
## Role
Shared library under `packages/queue/`.
## Workspace dependencies
- _(none)_
## Key exports

- `QueueBackend`
- `MissionRunJob`
- `getQueueBackend`
- `enqueueMissionRun`
- `dequeueMissionRunJobs`
- `peekMissionRunQueue`
## Source layout

- `src/index.test.ts`
- `src/index.ts`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[packages/runtime]]

## Mission notes

- **2026-06-12T13:43:35** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: playwright e2e setup, demo-smoke scripts, redis/queue/cron scheduler stubs, release manager API (scope: docs/demo, packages/persistence, apps/worker/src/index.ts, docs/architecture.md; artifacts: cursor-transcript)

See also: [[packages/persistence]]

See also: [[areas/apps-worker]]

See also: [[areas/apps-scheduler]]
