---
slug: areas/repo-layout
title: Repository layout
tags: [navigation, monorepo, auto-indexed]
valid_from: 2026-06-16
---
# Repository layout

Auto-indexed monorepo map (paths only; no secrets).

## Applications

- [[apps/api]] — `apps/api/`
- [[apps/command-center]] — `apps/command-center/`
- [[apps/gateway]] — `apps/gateway/`
- [[apps/scheduler]] — `apps/scheduler/`
- [[apps/worker]] — `apps/worker/`

## Packages

- [[packages/agents]] — `packages/agents/`
- [[packages/app-generator]] — `packages/app-generator/`
- [[packages/memory]] — `packages/memory/`
- [[packages/orchestrator]] — `packages/orchestrator/`
- [[packages/persistence]] — `packages/persistence/`
- [[packages/queue]] — `packages/queue/`
- [[packages/runtime]] — `packages/runtime/`
- [[packages/sandbox]] — `packages/sandbox/`
- [[packages/shared]] — `packages/shared/`
- [[packages/token-manager]] — `packages/token-manager/`
- [[packages/ui]] — `packages/ui/`

## Agent profiles

- [[agents/admin-agent]]
- [[agents/task-classifier]]
- [[agents/context-minimizer]]
- [[agents/quota-steward]]
- [[agents/planner-partitioner]]
- [[agents/product-agent]]
- [[agents/architect-agent]]
- [[agents/repo-cartographer]]
- [[agents/code-implementer]]
- [[agents/systems-synthesizer]]
- [[agents/memory-curator]]
- [[agents/qa-agent]]
- [[agents/code-reviewer]]
- [[agents/security-auditor]]
- [[agents/release-manager]]
- [[agents/frontend-ui-agent]]
- [[agents/backend-service-agent]]

## Other paths

- `scripts/` — stack control, smoke, wiki indexing
- `.agentos/agents/` — agent profile markdown
- `.agentos/memory/wiki/` — this wiki
- `e2e/` — Playwright acceptance tests

## Related

- [[index]]
- [[areas/dependency-graph]]

## Observations

- **2026-06-16T03:59:19** — memory-curator: Cursor: Claude is working on a web design overhaul and is at this current state:Were going to rewire our AgentOS/Flous.dev project to this new desig (scope: apps/command-center, packages/ui/src/tokens/agentos-forge.css, apps/command-center/src/styles/forge-ds/, packages/ui; artifacts: cursor-transcript)

See also: [[areas/apps-command-center]]

- **2026-06-16T14:10:48** — memory-curator: Cursor: I'll start by locating the single AgentOS repository root under `C:\Users\gaged`. Let me search for identifying markers. Two candidate locat (scope: docs/AGENTOS_FULL_REVIEW.md, docs/AGENTOS_SMOKE_TEST_REPORT.md, docs/AGENTOS_FEATURE_MATRIX.md, docs/AGENTOS_ARCHITECTURE_MAP.md; artifacts: cursor-transcript)

- **2026-06-16T17:22:27** — memory-curator: Cursor: AgentOS functionalization — start 0.1: Capture baseline snapshot Phase phase-0: Baseline and invariants Record typecheck, test, mission:smok (scope: docs/functionalization/baseline.json., docs/functionalization/baseline.json; artifacts: cursor-transcript)

- **2026-06-16T18:40:24** — memory-curator: Cursor: Check the website and see if its up (scope: n/a; artifacts: cursor-transcript)

- **2026-06-16T18:44:24** — memory-curator: Cursor: Continue AgentOS functionalization: complete task 0.2 — API auth route matrix. Prior task 0.1 is marked done. Run phase gates with `pnpm fun (scope: docs/architecture/api-auth-matrix.md., docs/architecture/api-auth-matrix.md, apps/api/src/index.ts, apps/api/src/scraper/routes.ts; artifacts: cursor-transcript)

See also: [[areas/apps-api]]

- **2026-06-17T00:06:54** — memory-curator: Cursor: You are Claude running inside Cursor on my AgentOS repo. Your first job is orientation only. Do not edit files yet. AgentOS summary: AgentOS (scope: scripts/validate-agent-profiles.mjs, apps/api/src/store.ts, packages/persistence/, packages/runtime/; artifacts: cursor-transcript)

- **2026-06-17T00:10:43** — memory-curator: Cursor: can you ge the discord running: For live replies: API must be running with FEATURE_DISCORD=true: pnpm dev:api # or pnpm control -Action Rest (scope: apps/command-center/public/agents/, apps/api/public/agents, apps/command-center/public/agents, packages/runtime; artifacts: cursor-transcript)

- **2026-06-17T00:10:53** — memory-curator: Cursor: Summarize all active agents in AgentOS, include all agent data and purpose in prompt cycles/agent chains Each Agent should have an assigned  (scope: packages/orchestrator, packages/agents/src/executor.ts, packages/agents/src/llm.ts, packages/agents/src/qa-gate.ts; artifacts: cursor-transcript)

- **2026-06-17T00:10:58** — memory-curator: Cursor: Read ALL files in C:\Users\gaged\Documents\AgenOS\.agentos\agents\*.md and for each agent return: 1. agent id (from filename) 2. frontmatter (scope: n/a; artifacts: cursor-transcript)

- **2026-06-17T00:11:00** — memory-curator: Cursor: You are working inside the AgentOS repository in Cursor. Your job is to implement a premium AgentOS UI/UX system inspired by the provided Fa (scope: packages/ui/, packages/ui/src/tokens/agentos-forge.css, packages/ui/src/motion/, packages/app-generator/templates/agentos-forge/; artifacts: cursor-transcript)

- **2026-06-17T00:11:04** — memory-curator: Cursor: Search the AgentOS repository at C:\Users\gaged\Documents\AgenOS for: 1. App generation / orchestration code 2. uiPreset or similar UI prese (scope: apps/api, packages/runtime, packages/orchestrator, apps/gateway; artifacts: cursor-transcript)

See also: [[areas/apps-gateway]]

- **2026-06-17T00:11:09** — memory-curator: Cursor: Research and return findings for a UI improvement plan. 1. Fetch and analyze https://halotemplate.framer.website/ - document: - Visual style (scope: apps/command-center, packages/ui, packages/ui/src/tokens/agentos-forge.css, apps/command-center/src/app/globals.css; artifacts: cursor-transcript)

- **2026-06-17T00:11:12** — memory-curator: Cursor: Explore the AgentOS repository at C:\Users\gaged\Documents\AgenOS. Find and report: 1. Overall monorepo structure (packages, apps) 2. Fronte (scope: packages/ui, apps/command-center, docs/agent, apps/command-center/src/; artifacts: cursor-transcript)

- **2026-06-17T00:11:16** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS on current branch. Identify remaining gaps from Forge/Halo UI polish work: 1. Legacy globals.css usa (scope: packages/ui/src/adapters/types.ts, packages/ui; artifacts: cursor-transcript)

- **2026-06-17T00:11:20** — memory-curator: Cursor: You are working in C:\Users\gaged\Documents\AgenOS The user asked: confirm .env has what was requested for Discord stay-logged-in; if not, a (scope: n/a; artifacts: cursor-transcript)

- **2026-06-17T01:08:03** — memory-curator: Cursor: Execute the FULL Halo-inspired AgentOS UI polish implementation in C:\Users\gaged\Documents\AgenOS. ## Phase Order (execute in this sequence (scope: apps/command-center/src/app/globals.css, packages/ui/src/tokens/agentos-forge.css, packages/ui, packages/ui/src/index.ts; artifacts: cursor-transcript)

- **2026-06-17T01:08:08** — memory-curator: Cursor: You are completing a follow-up task for the AgentOS repo at C:\Users\gaged\Documents\AgenOS. ## Context The user previously had work done on (scope: docs/design/platform-template-motion-reference-pack.md, apps/api/src/scraper/, apps/api/src/scraper/routes.ts, apps/api/src/scraper/downloader.ts; artifacts: cursor-transcript)

- **2026-06-17T01:08:11** — memory-curator: Cursor: Search the AgentOS repository at C:\Users\gaged\Documents\AgenOS for the main command center / dashboard application. Look for: 1. Dashboard (scope: packages/shared, apps/command-center, apps/api; artifacts: cursor-transcript)

- **2026-06-17T01:08:15** — memory-curator: Cursor: <plugin_info kind="matched_installed"> display_name: Cloudflare description: Skills for the Cloudflare developer platform: Workers, Durable  (scope: n/a; artifacts: cursor-transcript)

- **2026-06-17T01:08:18** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS dashboard/command-center UI on main branch. Return: 1. Key files: ForgeDashboardView, ForgeDashboard (scope: docs/design/agentos-forge-style-study.md, apps/command-center, packages/ui, apps/command-center/src/app/layout.tsx; artifacts: cursor-transcript)

- **2026-06-17T01:08:22** — memory-curator: Cursor: Complete three follow-up tasks in C:\Users\gaged\Documents\AgenOS: ## Task 1 — Dead code removal 1. Remove unused `DashboardView` function ( (scope: apps/command-center/src/components/local/AgentOSLocalApp.tsx, packages/ui/src/components/ForgeSegmentedControl.tsx, packages/ui/src/components/ForgeFaqAccordion.tsx, apps/command-center/src/app/globals.css; artifacts: cursor-transcript)

- **2026-06-17T01:08:25** — memory-curator: Cursor: Discord Commands/Prompts (scope: n/a; artifacts: cursor-transcript)

- **2026-06-17T01:08:28** — memory-curator: Cursor: <plugin_info kind="matched_installed"> display_name: Figma description: Plugin that includes the Figma MCP server and Skills for common work (scope: packages/ui, docs/design/, docs/design/platform-gallery-handoff/, packages/ui-blocks/; artifacts: cursor-transcript)

See also: [[packages/ui-blocks]]

See also: [[areas/apps-worker]]

- **2026-06-17T01:08:33** — memory-curator: Cursor: Make a plan for all of the Agent profiles and routing of agents for AgentOS. Give me a map of what is supposed to happen, what agents we hav (scope: packages/orchestrator, packages/runtime, packages/agents, packages/runtime/src/index.ts; artifacts: cursor-transcript)

- **2026-06-17T01:08:37** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. packages/agents/src/implementer-dispatch.ts - how gateway/cursor/mock work 2. packages/share (scope: packages/agents/src/implementer-dispatch.ts, packages/shared, packages/orchestrator, packages/agents; artifacts: cursor-transcript)

- **2026-06-17T01:08:42** — memory-curator: Cursor: Create me a 100 step prompt pathway to completion of this project to a demo worthy state. each step should include success parameters to eac (scope: apps/command-center, apps/api, packages/runtime, docs/AGENTOS_LOCAL_PIVOT_PLAN.md; artifacts: cursor-transcript)

- **2026-06-17T01:09:04** — memory-curator: Cursor: Explore the AgentOS monorepo at C:\Users\gaged\Documents\AgenOS thoroughly. Return: 1. Top-level directory structure and main apps/packages  (scope: apps/packages, docs/prompts, apps/api, apps/api/src/discord/; artifacts: cursor-transcript)

See also: [[areas/apps-packages]]

- **2026-06-17T01:09:06** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: playwright e2e setup, demo-smoke scripts, redis/queue/cron scheduler stubs, release manager API (scope: docs/demo, packages/persistence, apps/worker/src/index.ts, docs/architecture.md; artifacts: cursor-transcript)

See also: [[areas/apps-scheduler]]

- **2026-06-17T01:09:11** — memory-curator: Cursor: In repo C:\Users\gaged\Documents\AgenOS, implement Wave 0 Lane L5: add `app_creation` task type to packages/shared and stub contract at .age (scope: packages/shared, packages/shared., packages/shared/src/build-intent.ts, packages/shared/src/build-intent.test.ts; artifacts: cursor-transcript)

- **2026-06-17T01:09:20** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for LLM executor, agents llm.ts, release manager, and runtime processRun flow. Return: (1) current e (scope: packages/agents/src/llm.ts, apps/api/src/providers.ts, apps/api/src/index.ts, apps/api/src/discord/button-handlers.ts; artifacts: cursor-transcript)

- **2026-06-17T01:09:30** — memory-curator: Cursor: Explore the AgentOS monorepo at C:\Users\gaged\Documents\AgenOS for unused/ghost code from previous iterations. Look for: 1. Orphaned files  (scope: apps/api/src, apps/api/src/index.ts, packages/tools, packages/shared/src/index.ts; artifacts: cursor-transcript)

See also: [[packages/tools]]

See also: [[packages/config]]

- **2026-06-17T01:10:21** — memory-curator: Cursor: Paste this into Cursor. It is designed as an **audit/report prompt**, not an implementation prompt. You are working in my AgentOS repo. Goal (scope: scripts/validate-agent-profiles.mjs, packages/orchestrator, packages/runtime, packages/persistence; artifacts: cursor-transcript)

- **2026-06-17T01:10:34** — memory-curator: Cursor: Audit runtime routing in C:\Users\gaged\Documents\AgenOS. Search and read: 1. `packages/orchestrator` - how missions are routed, conditional (scope: packages/orchestrator, packages/runtime, packages/shared, scripts/validate-agent-profiles.mjs; artifacts: cursor-transcript)

- **2026-06-17T01:10:39** — memory-curator: Cursor: Audit conversational control and product narrative in C:\Users\gaged\Documents\AgenOS: 1. `apps/command-center` - chat-first vs slash comman (scope: apps/command-center, apps/api, packages/orchestrator, packages/runtime; artifacts: cursor-transcript)

- **2026-06-17T01:10:41** — memory-curator: Cursor: Audit the AgentOS `.agentos/` control layer in C:\Users\gaged\Documents\AgenOS. Read and summarize: 1. List all files in `.agentos/` includi (scope: scripts/validate-agent-profiles.mjs, docs/spec, docs/memory, packages/shared/src/index.ts; artifacts: cursor-transcript)

- **2026-06-17T01:10:47** — memory-curator: Cursor: Audit persistence, worker, gates, and sandbox in C:\Users\gaged\Documents\AgenOS: 1. `packages/persistence` - backend type (JSON/SQLite/Post (scope: packages/persistence, apps/worker, packages/sandbox, apps/gateway; artifacts: cursor-transcript)

- **2026-06-17T01:13:45** — memory-curator: Cursor: Working now? (scope: n/a; artifacts: cursor-transcript)

- **2026-06-17T01:13:50** — memory-curator: Cursor: all other chats on this repositories have or are working on pushing their git commits. summarize what the project should eventually do, what (scope: packages/orchestrator, packages/agents, packages/ui, scripts/agentos-control.ps1; artifacts: cursor-transcript)

- **2026-06-17T01:14:04** — memory-curator: Cursor: You are Agent 3 (Discord Control Gate) for AgentOS at C:\Users\gaged\Documents\AgenOS. **OWNERSHIP — only touch:** - `apps/api/src/discord/n (scope: apps/api/src/discord/notify.ts, apps/api/src/discord/button-handlers.ts, apps/api/src/discord/embeds.ts, apps/api/src/discord/interactions.ts; artifacts: cursor-transcript)

- **2026-06-17T01:14:10** — memory-curator: Cursor: You are Agent 4 (Postgres Host-Readiness) for AgentOS at C:\Users\gaged\Documents\AgenOS. **OWNERSHIP — only touch:** - `packages/persistenc (scope: packages/persistence/src/adapters/postgres.ts, packages/persistence/src/index.test.ts, packages/persistence/package.json, packages/persistence; artifacts: cursor-transcript)

- **2026-06-17T01:15:53** — memory-curator: Cursor: You are the Phase 2 implementation agent for AgentOS at C:\Users\gaged\Documents\AgenOS. ## Part A — Merge PR #1 (do this FIRST) 1. `git fet (scope: packages/runtime/src/index.ts, apps/api/src/store.ts, apps/api/src/discord/notify.ts, packages/orchestrator; artifacts: cursor-transcript)

- **2026-06-17T01:15:58** — memory-curator: Cursor: You are Agent 2 (Runtime Safety) for AgentOS at C:\Users\gaged\Documents\AgenOS. **OWNERSHIP — only touch:** - `packages/runtime/src/index.t (scope: packages/runtime/src/index.ts, packages/runtime/src/index.test.ts, packages/runtime/package.json, packages/runtime; artifacts: cursor-transcript)

- **2026-06-17T01:16:01** — memory-curator: Cursor: You are Agent 5 (CI & Merge Prep) for AgentOS at C:\Users\gaged\Documents\AgenOS. **READ-ONLY + validation + PR text. Do NOT commit or push  (scope: docs/PIVOT_MERGE_CHECKLIST.md, packages/persistence, packages/persistence/src/index.test.ts, apps/api; artifacts: cursor-transcript)

- **2026-06-17T01:16:07** — memory-curator: Cursor: Analyze the complete file structure, integration network, and any other system schematic profile you can think of that pertains to the Agent (scope: docs/demo/BUILD_PROGRESS.md, docs/demo/IMPLEMENTATION_BRIEF.md, scripts/validate-profiles, apps/command-center; artifacts: cursor-transcript)

- **2026-06-17T01:16:11** — memory-curator: Cursor: Explore the AgentOS monorepo at C:\Users\gaged\Documents\AgenOS and return a structured report covering: 1. Top-level folder structure (apps (scope: apps/api/src/index.ts, apps/api/src/discord/, apps/command-center, packages/agents; artifacts: cursor-transcript)

- **2026-06-17T01:16:14** — memory-curator: Cursor: help me find free equipment to host AgentOS on. Like search facebook marketplace free stuff, or craigslist etc (scope: n/a; artifacts: cursor-transcript)

- **2026-06-17T01:16:17** — memory-curator: Cursor: Plan a layout for the discord server/guild that utilizes the full spectrum of what can be modified in a discord server with a fully authed a (scope: scripts/bootstrap-discord-guild.ts, apps/api/src/discord/, packages/shared/src/index.ts, apps/command-center/src/components/local/AgentOSLocalApp.tsx; artifacts: cursor-transcript)

- **2026-06-17T01:16:22** — memory-curator: Cursor: You are helping a user who asks: "how do I interact with the discord server? I hit pulse and nothing is really happening and I don't see any (scope: apps/api/src/discord/layout.ts, scripts/agentos-control.ps1, apps/api; artifacts: cursor-transcript)

- **2026-06-17T01:16:25** — memory-curator: Cursor: Implement Chat Rooms 1-3 for AgentOS Discord in repo: C:\Users\gaged\Documents\AgenOS ## User request Add **Chat Rooms 1-3** where agents ca (scope: apps/api/src/discord/layout.ts, apps/api/src/discord/bootstrap.ts, apps/api/src/discord/round-table.ts, apps/api/src/discord/chat.ts; artifacts: cursor-transcript)

- **2026-06-17T01:16:29** — memory-curator: Cursor: Complete the AgentOS Discord round-table/briefing deployment in repo: C:\Users\gaged\Documents\AgenOS Context: User wanted: - Round-table/Br (scope: apps/api/src/discord/, apps/api, apps/api/src/discord, scripts/.; artifacts: cursor-transcript)

- **2026-06-17T01:16:31** — memory-curator: Cursor: Explore C:\Users\gaged\Documents\AgenOS for: 1. Existing discord embeds in apps/api/src/discord/embeds.ts, personas.ts 2. packages/shared st (scope: apps/api/src/discord/embeds.ts, packages/shared, apps/command-center, apps/api/src/discord/; artifacts: cursor-transcript)

- **2026-06-17T01:17:16** — memory-curator: Cursor: Start multitasking (scope: scripts/agentos-control.ps1, scripts/discord-interactions-mode.mjs; artifacts: cursor-transcript)

- **2026-06-17T01:17:23** — memory-curator: Cursor: I learn best from formats like docs from tech websites like https://docs.factory.ai/welcome and https://developers.openai.com/api/docs Could (scope: docs/getting-started/welcome, docs/concepts/agent-pipeline, apps/command-center/src/content/docs/manifest.ts, apps/command-center/src/content/docs/; artifacts: cursor-transcript)
