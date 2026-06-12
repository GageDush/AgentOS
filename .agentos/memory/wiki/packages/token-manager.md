---
slug: packages/token-manager
title: Token Manager
tags: [package, monorepo, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# @agentos/token-manager
AgentOS package workspace unit.
## Role
Shared library under `packages/token-manager/`.
## Workspace dependencies
- `@agentos/shared`
## Key exports

- `type`
- `BudgetDecision`
- `evaluateBudget`
- `clearAgentStopFile`
- `enqueueResumeItem`
- `evaluateQuotaSteward`
- `gatePremiumProviderRun`
- `listStoppedAgentIds`
- `readAgentStopFile`
- `readResumeQueue`
- `writeAgentStopFile`
## Source layout

- `src/index.ts`
- `src/quota-steward.test.ts`
- `src/quota-steward.ts`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[packages/runtime]]
