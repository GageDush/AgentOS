---
slug: docs/design/agentos-dashboard-claude-design/design
title: Design
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Design

Source: `docs/design/agentos-dashboard-claude-design/design.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Dashboard Design Brief

## Scope

This handoff is only for the AgentOS dashboard and base application shell.

Use the scraped website assets only as visual reference material for polish, motion, layout density, and premium product-site craft.

## Product Direction

AgentOS is a local-first operator dashboard for running agent work safely.

The base experience should feel calm, capable, and ready for daily use. It should not feel like a secret military board, spy console, war room, or fictional command bunker.

## Naming Tone

Use clear product language:

- Dashboard
- Missions
- Approvals
- Activity
- Agents
- Archive
- Wiki
- Loadout
- Settings
- Scraper
- Runs
- Queue
- Provider Status
- Memory Sync

Avoid:

- war room
- black site
- strike team
- intel vault
- classified
- target package
- threat matrix
- operator theater
- shadow console
- command bunker

## Dashboard Goal

The dashboard should answer these questions in under ten seconds:

1. What is running right now?
2. What needs approval?
3. Is the local/runtime stack healthy?
4. What happened recently?
5. Where can I jump next?

## Primary Layout

Use a dense but breathable dashboard layout:

- persistent top navigation
- compact runtime health strip
- main dashboard grid
- active mission panel
- approvals panel
- runtime posture panel
- activity timeline
- agent/session panel
- right-side inspector rail on desktop
- stacked or bottom-sheet inspector on mobile

Do not make this a marketing landing page. The first screen should be the working dashboard.

## Visual Reference Assets

The included scraper assets came from a polished Framer-style product website capture. Use them for reference only:

- `assets/` for image, SVG, and video references.
- `screenshots/` for layout rhythm, responsive section density, and motion inspiration.
- `raw/gallery.json` and `raw/manifest.json` for metadata when useful.

Do not copy proprietary generated code or pretend these assets are final AgentOS brand assets.

## Motion Direction

Use motion to make the dashboard feel alive without distracting from work:

- initial load entrance for shell, health strip, and top cards
- subtle card state changes on hover
- activity timeline updates
- inspector rail slide/fade
- approval state transitions
- small runtime pulse indicators
- reduced-motion support

Avoid cinematic or overdramatic effects.

## Completion Stan

## Related

- [[index]]
- [[areas/repo-layout]]
