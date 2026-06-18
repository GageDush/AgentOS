---
slug: apps/command-center
title: Command Center
tags: [app, monorepo, auto-indexed]
archived: false
valid_from: 2026-06-16
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
  - `src/app/docs/`
    - `src/app/docs/layout.tsx`
    - `src/app/docs/page.tsx`
    - `src/app/docs/[...slug]/`
  - `src/app/globals.css`
  - `src/app/layout.tsx`
  - `src/app/loadout/`
    - `src/app/loadout/page.tsx`
  - `src/app/missions/`
    - `src/app/missions/page.tsx`
  - `src/app/operators/`
    - `src/app/operators/page.tsx`
  - `src/app/page.tsx`
  - `src/app/preview/`
    - `src/app/preview/forge/`
  - `src/app/routines/`
    - `src/app/routines/page.tsx`
  - `src/app/scraper/`
    - `src/app/scraper/page.tsx`
  - `src/app/settings/`
    - `src/app/settings/page.tsx`
  - `src/app/wiki/`
    - `src/app/wiki/page.tsx`
- `src/components/`
  - `src/components/docs/`
    - `src/components/docs/DocsArticleView.tsx`
    - `src/components/docs/DocsHub.tsx`
    - `src/components/docs/DocsMarkdown.tsx`
    - `src/components/docs/DocsShell.tsx`
    - `src/components/docs/DocsSidebar.tsx`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[apps/api]]
