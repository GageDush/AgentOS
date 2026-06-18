---
slug: packages/ui
title: Ui
tags: [package, monorepo, auto-indexed]
valid_from: 2026-06-16
---
# @agentos/ui
AgentOS package workspace unit.
## Role
Shared library under `packages/ui/`.
## Workspace dependencies
- `@agentos/shared`
## Key exports

- `panelChromeClassName`
## Source layout

- `src/adapters/`
  - `src/adapters/types.ts`
- `src/blocks/`
  - `src/blocks/index.ts`
- `src/components/`
  - `src/components/AgentActivityFeed.tsx`
  - `src/components/AgentPresenceCard.tsx`
  - `src/components/AgentPresenceOrb.tsx`
  - `src/components/AgentPresenceStrip.tsx`
  - `src/components/AgentRichMessageCard.tsx`
  - `src/components/AmbientSystemHealthBar.tsx`
  - `src/components/ApprovalCard.test.tsx`
  - `src/components/ApprovalCard.tsx`
  - `src/components/AppShell.tsx`
  - `src/components/CommandInput.tsx`
  - `src/components/CommandPalette.test.tsx`
  - `src/components/CommandPalette.tsx`
  - `src/components/ForgeFaqAccordion.tsx`
  - `src/components/ForgeMetricStrip.tsx`
  - `src/components/ForgeSectionHeader.tsx`
  - `src/components/ForgeSegmentedControl.tsx`
  - `src/components/ForgeStatCard.tsx`
  - `src/components/GeneratedAppFrame.tsx`
  - `src/components/IntegrationCard.tsx`
  - `src/components/MetricPill.tsx`
  - `src/components/MissionControlPanel.tsx`
  - `src/components/MissionTimeline.test.tsx`
  - `src/components/MissionTimeline.tsx`
  - `src/components/QuickActionButton.tsx`
  - `src/components/ReactiveWorkbenchPanel.tsx`
  - `src/components/SandboxApprovalCenter.tsx`
  - `src/components/StatusRail.tsx`
  - `src/components/TerminalWindow.tsx`
  - `src/components/TopNav.tsx`
- `src/index.ts`
- `src/layout/`
  - `src/layout/index.ts`
- `src/motion/`
  - `src/motion/AnimatedStripeOverlay.tsx`
  - `src/motion/CursorSpotlight.tsx`
## Related
- [[areas/repo-layout]]
- [[areas/dependency-graph]]
- [[packages/runtime]]

## Mission notes

- **2026-06-16T03:59:19** — memory-curator: Cursor: Claude is working on a web design overhaul and is at this current state:Were going to rewire our AgentOS/Flous.dev project to this new desig (scope: apps/command-center, packages/ui/src/tokens/agentos-forge.css, apps/command-center/src/styles/forge-ds/, packages/ui; artifacts: cursor-transcript)

See also: [[areas/apps-command-center]]

- **2026-06-17T00:10:43** — memory-curator: Cursor: can you ge the discord running: For live replies: API must be running with FEATURE_DISCORD=true: pnpm dev:api # or pnpm control -Action Rest (scope: apps/command-center/public/agents/, apps/api/public/agents, apps/command-center/public/agents, packages/runtime; artifacts: cursor-transcript)

See also: [[areas/apps-api]]

- **2026-06-17T00:10:53** — memory-curator: Cursor: Summarize all active agents in AgentOS, include all agent data and purpose in prompt cycles/agent chains Each Agent should have an assigned  (scope: packages/orchestrator, packages/agents/src/executor.ts, packages/agents/src/llm.ts, packages/agents/src/qa-gate.ts; artifacts: cursor-transcript)

See also: [[packages/orchestrator]]

See also: [[packages/agents]]

- **2026-06-17T00:11:00** — memory-curator: Cursor: You are working inside the AgentOS repository in Cursor. Your job is to implement a premium AgentOS UI/UX system inspired by the provided Fa (scope: packages/ui/, packages/ui/src/tokens/agentos-forge.css, packages/ui/src/motion/, packages/app-generator/templates/agentos-forge/; artifacts: cursor-transcript)

See also: [[packages/app-generator]]

- **2026-06-17T00:11:09** — memory-curator: Cursor: Research and return findings for a UI improvement plan. 1. Fetch and analyze https://halotemplate.framer.website/ - document: - Visual style (scope: apps/command-center, packages/ui, packages/ui/src/tokens/agentos-forge.css, apps/command-center/src/app/globals.css; artifacts: cursor-transcript)

- **2026-06-17T00:11:12** — memory-curator: Cursor: Explore the AgentOS repository at C:\Users\gaged\Documents\AgenOS. Find and report: 1. Overall monorepo structure (packages, apps) 2. Fronte (scope: packages/ui, apps/command-center, docs/agent, apps/command-center/src/; artifacts: cursor-transcript)

- **2026-06-17T00:11:16** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS on current branch. Identify remaining gaps from Forge/Halo UI polish work: 1. Legacy globals.css usa (scope: packages/ui/src/adapters/types.ts, packages/ui; artifacts: cursor-transcript)

- **2026-06-17T01:08:03** — memory-curator: Cursor: Execute the FULL Halo-inspired AgentOS UI polish implementation in C:\Users\gaged\Documents\AgenOS. ## Phase Order (execute in this sequence (scope: apps/command-center/src/app/globals.css, packages/ui/src/tokens/agentos-forge.css, packages/ui, packages/ui/src/index.ts; artifacts: cursor-transcript)

- **2026-06-17T01:08:18** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS dashboard/command-center UI on main branch. Return: 1. Key files: ForgeDashboardView, ForgeDashboard (scope: docs/design/agentos-forge-style-study.md, apps/command-center, packages/ui, apps/command-center/src/app/layout.tsx; artifacts: cursor-transcript)

- **2026-06-17T01:08:22** — memory-curator: Cursor: Complete three follow-up tasks in C:\Users\gaged\Documents\AgenOS: ## Task 1 — Dead code removal 1. Remove unused `DashboardView` function ( (scope: apps/command-center/src/components/local/AgentOSLocalApp.tsx, packages/ui/src/components/ForgeSegmentedControl.tsx, packages/ui/src/components/ForgeFaqAccordion.tsx, apps/command-center/src/app/globals.css; artifacts: cursor-transcript)

- **2026-06-17T01:08:28** — memory-curator: Cursor: <plugin_info kind="matched_installed"> display_name: Figma description: Plugin that includes the Figma MCP server and Skills for common work (scope: packages/ui, docs/design/, docs/design/platform-gallery-handoff/, packages/ui-blocks/; artifacts: cursor-transcript)

See also: [[packages/ui-blocks]]

See also: [[areas/apps-worker]]

- **2026-06-17T01:13:50** — memory-curator: Cursor: all other chats on this repositories have or are working on pushing their git commits. summarize what the project should eventually do, what (scope: packages/orchestrator, packages/agents, packages/ui, scripts/agentos-control.ps1; artifacts: cursor-transcript)

See also: [[packages/persistence]]

- **2026-06-17T01:16:01** — memory-curator: Cursor: You are Agent 5 (CI & Merge Prep) for AgentOS at C:\Users\gaged\Documents\AgenOS. **READ-ONLY + validation + PR text. Do NOT commit or push  (scope: docs/PIVOT_MERGE_CHECKLIST.md, packages/persistence, packages/persistence/src/index.test.ts, apps/api; artifacts: cursor-transcript)

See also: [[packages/shared]]
