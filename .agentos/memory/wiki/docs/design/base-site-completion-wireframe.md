---
slug: docs/design/base-site-completion-wireframe
title: Base Site Completion Wireframe
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Base Site Completion Wireframe

Source: `docs/design/base-site-completion-wireframe.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Base Site Completion Wireframe

## Purpose

This wireframe defines the ideal "base site complete" shape for the current AgentOS Command Center checkout.

It is grounded in the live route structure:

- `/`
- `/dashboard`
- `/missions`
- `/control-gate`
- `/blackbox`
- `/operators`
- `/routines`
- `/archive`
- `/wiki`
- `/loadout`
- `/settings`
- `/scraper`

The goal is not a marketing site. The goal is a calm, mission-first operator surface that feels complete enough to demo, use daily, and extend safely.

## Completion Standard

For the base site to feel relatively complete, every primary route should satisfy these conditions:

- It has a clear first task.
- It has a clear empty state.
- It has a clear active state.
- It has a clear navigation relationship to the rest of the app.
- It exposes the right amount of detail without forcing page hops for routine work.
- Mobile keeps the same workflows, even if some panels collapse or stack.

## Site Frame

[code block omitted]

Base shell rules:

- Top navigation is always visible.
- Health strip stays compact and scannable.
- The command palette is a first-class control, not a novelty.
- A right-side context rail exists on desktop for run details, recent activity, or help.
- On mobile, the right rail becomes a bottom sheet or stacked section.

## Screen 1: Dashboard Home

Purpose: orient the operator in under ten seconds.

[code block omitted]

Must feel complete when:

- There is one obvious "what is happening right now" card.
- Approval backlog is visible without opening another page.
- The run inspector is useful enough to avoid a page switch for most checks.

## Screen 2: Missions

Purpose: compose, launch, and monitor one-off work.

[code block omitted]

Must feel complete when:

- Mission creation does not require hidden settings.
- Recent runs are readable at a glance.
- The compose form and run inspector coexist without crowding each other.

## Screen 3: Control Gate

Purpose: handle approvals with confidence.

[code block omitted]

Must feel complete when:

- Approvals can be triaged without fear of losing context.
- The selected approval explains the risk in plain language.
- Bulk and single-item flows both feel intentional.

## Screen 4: Blackbox

Purpose: answer "what happened?" fast.

[code block omitted]

Must feel complete when:

- Search covers both logs and audit history.
- Users can mo

## Related

- [[index]]
- [[areas/repo-layout]]
