---
slug: apps/command-center
title: Command Center
tags: [app, monorepo, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# @agentos/command-center
AgentOS app workspace unit.
## Role
Runnable service under `apps/command-center/`.
## Workspace dependencies
- `@agentos/shared`
- `@agentos/ui`
- `@agentos/app-generator`
## Source layout

- `src/app/`
  - `src/app/archive/`
    - `src/app/archive/page.tsx`
  - `src/app/blackbox/`
    - `src/app/blackbox/page.tsx`
  - `src/app/control-gate/`
    - `src/app/control-gate/page.tsx`
  - `src/app/dashboard/`
    - `src/app/dashboard/page.tsx`
  - `src/app/demo/`
    - `src/app/demo/office/`
  - `src/app/globals.css`
  - `src/app/layout.tsx`
  - `src/app/loadout/`
    - `src/app/loadout/page.tsx`
  - `src/app/missions/`
    - `src/app/missions/page.tsx`
  - `src/app/office/`
    - `src/app/office/page.tsx`
  - `src/app/operators/`
    - `src/app/operators/page.tsx`
  - `src/app/page.tsx`
  - `src/app/preview/`
    - `src/app/preview/forge/`
  - `src/app/routines/`
    - `src/app/routines/page.tsx`
  - `src/app/settings/`
    - `src/app/settings/page.tsx`
- `src/components/`
  - `src/components/forge/`
    - `src/components/forge/dashboard-adapters.ts`
    - `src/components/forge/DashboardHome.tsx`
    - `src/components/forge/forge-entry.css`
    - `src/components/forge/ForgeBootLoader.tsx`
    - `src/components/forge/ForgeChatDock.tsx`
    - `src/components/forge/ForgeControlGateView.tsx`
    - `src/components/forge/ForgeDashboardShell.tsx`
    - `src/components/forge/ForgeDashboardView.tsx`
    - `src/components/forge/ForgeEntryExperience.tsx`
    - `src/components/forge/ForgeInspectorSidebar.tsx`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[apps/api]]
