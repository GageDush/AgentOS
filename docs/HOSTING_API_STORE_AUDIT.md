# AgentOS API Store Mutate Audit

This file tracks the remaining `mutate()` usage in [C:\Users\gaged\Documents\AgenOS\apps\api\src\store.ts](C:\Users\gaged\Documents\AgenOS\apps\api\src\store.ts) after the hosting-readiness migration.

## Migrated To Repository Methods Or Bundles

- `addUsageEvent`
  - moved to `appendUsageEvent()`
- `resolveApproval`
  - moved to `resolveApprovalRequest()`
- `createApproval`
  - moved to `createApprovalRequest()`
- `createMission`
  - moved to `createMission()`
- `createMissionRun`
  - moved to `createMissionRun()`
- `appendMissionLog`
  - moved to `appendMissionLog()`
- `getRoutine`
  - moved to `getRoutineById()`
- `createRoutine`
  - moved to `createRoutine()`
- `updateRoutine`
  - moved to `updateRoutine()`
- `getSession`
  - moved to `getSessionById()`
- `createSession`
  - moved to `createSession()`
- `updateSession`
  - moved to `updateSession()`
- `listChatThreads`
  - moved to `listChatThreads()`
- `listChatMessages`
  - moved to `listChatMessages()`
- `createChatThread`
  - moved to `createChatThread()`
- `createChatMessage`
  - moved to `appendChatExchangeBundle()`
- `createMissionResultMemory`
  - moved to `createArchiveEntry()`
- `persistMemory`
  - moved to `createArchiveEntry()`
- `archiveMemoryEntry`
  - moved to `archiveMemoryEntry()`
- `createQuickAction`
  - moved to `createQuickAction()`
- `consumeQuickAction`
  - moved to `consumeQuickAction()`

## Intentionally Left On Compatibility `mutate()`

These are still acceptable for now because they are local-only admin/dev surfaces, broad patch-style helpers, or archival demo behavior:

- `createTask`
  - local task helper; not part of the durable mission runtime path
- `addBudget`
  - budget records do not yet have a dedicated repository write path
- `addAudit`
  - thin compatibility helper for ad hoc manual audit inserts
- `updateTask`
  - generic local task patch helper
- `updateMission`
  - broad partial patch helper; should be replaced later with narrower repository methods
- `updateMissionRun`
  - broad partial patch helper; should be replaced later with narrower repository methods
- `ensureSessionForMission`
  - reads and conditional updates across mission/session records; worth a dedicated session-link bundle later
- `runDemoMission`
  - archival/demo only
- `completeDemoMission`
  - archival/demo only

## Hosting Guidance

The remaining `mutate()` usage is intentionally outside the worker/runtime hot path. Before real hosted rollout, the next store migration should focus on:

1. replacing `updateMission` with narrow repository methods
2. replacing `updateMissionRun` with narrow repository methods
3. adding a mission-session linking bundle for `ensureSessionForMission`
4. adding a repository path for budgets if hosted budget management becomes important
