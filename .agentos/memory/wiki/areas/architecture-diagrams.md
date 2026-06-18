---
slug: areas/architecture-diagrams
title: Architecture diagrams (Mermaid)
tags: [architecture, mermaid, diagrams, auto-indexed]
valid_from: 2026-06-13
---
# Architecture diagrams (Mermaid)

Git-native C4 and flow diagrams. Source of truth lives in this repo under `.agentos/memory/wiki/areas/diagrams/`.

**Render:** GitLab/GitHub markdown preview, Cursor, and most IDEs render ` ```mermaid ` blocks. The in-app [[areas/apps-command-center]] wiki browser shows the source code (no live Mermaid render yet).

**Related:** [[areas/system-routing-schematic]] · [[areas/icepanel-import-manifest]] · [[product/forge-command-center-consolidated]]

## Diagram index

| Diagram | File | Level |
|---------|------|-------|
| System context | [[areas/diagrams/context]] | C4 L1 |
| Containers & hosting | [[areas/diagrams/containers]] | C4 L2 |
| UI routes → API | [[areas/diagrams/ui-routes]] | App map |
| Agent pipeline | [[areas/diagrams/agent-pipeline]] | Control flow |
| Mission run | [[areas/diagrams/mission-run-sequence]] | Sequence |
| OAuth session | [[areas/diagrams/oauth-sequence]] | Sequence |
| Wiki sync | [[areas/diagrams/wiki-sync-sequence]] | Sequence |
| Approval gate | [[areas/diagrams/approval-gate-sequence]] | Sequence |

## What changed since the first schematic (2026-06-12)

| Area | Then | Now |
|------|------|-----|
| Wiki UI | Planned | Live at `/wiki` — browse, search, sync Cursor, memory queue |
| Nav | Office in More | **Memory Wiki** + **Scraper** in More; office route exists but not in main nav |
| API | Core missions/runs | Added `/policy/check`, `/providers/status`, `/tasks/*`, `/sessions/*`, `/mission/demo`, `/agents/roster` |
| Wiki API | Basic CRUD | Full suite: manifest, backlinks, expand, sync-cursor, sync-chatgpt, memory queue approve/dismiss |
| Discord | Bot + channels | Gateway mode, pulse, post-guides, cursor bridge, house visits, briefing on complete |
| Cursor sync | Manual script only | Optional **continuous** sync on API startup (`AGENTOS_CURSOR_WIKI_SYNC`) |
| Agents | 15 personas | **21** pipeline agents + 4 addons; complete Discord placards |
| Diagrams | IcePanel + FigJam only | This Mermaid set + `pnpm icepanel:populate-diagrams` |
| Packages | 11 | **12** — includes [[packages/queue]] |

## Regenerate / sync

- **Mermaid:** edit files in `areas/diagrams/` when architecture changes
- **IcePanel layout:** `pnpm icepanel:populate-diagrams` (needs `ICEPANEL_API_KEY`)
- **Wiki index:** `pnpm wiki:index-repo` after adding articles
