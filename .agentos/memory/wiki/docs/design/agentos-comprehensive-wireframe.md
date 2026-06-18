---
slug: docs/design/agentos-comprehensive-wireframe
title: Agentos Comprehensive Wireframe
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Agentos Comprehensive Wireframe

Source: `docs/design/agentos-comprehensive-wireframe.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Comprehensive Wireframe

## Purpose

This document maps the full AgentOS product surface that originates from the current Command Center, runtime, scraper, memory, approval, and hosted-access work.

It is a product wireframe, not a visual style guide. It defines structure, route intent, panel relationships, states, and handoff boundaries so Codex, Cursor, Claude, Gemini, and future agents can work from the same product map without stepping on each other.

## Product Principle

AgentOS is a calm local-first operator dashboard for agent work.

It should feel like:

- a reliable command center for missions, runs, approvals, memory, and tools
- a daily-use technical product for a solo developer or small team
- a system with clear gates before risky action
- a workspace that explains what happened and what needs attention

It should not feel like:

- a military board
- a spy console
- a fictional command bunker
- a dashboard that values drama over clarity

## Global App Shell

[code block omitted]

### Global Rules

- Top navigation is always visible on desktop.
- Health strip is always visible but compact.
- Command palette is first-class navigation and action.
- Right rail is contextual: selected run, approval, agent, wiki article, asset, or settings detail.
- Mobile keeps the same workflow by stacking panels and converting the right rail into a bottom sheet or inline detail section.
- Every route needs an empty, active, loading, error, and offline state.

## Primary Navigation

Visible desktop nav:

- Dashboard
- Missions
- Control Gate
- Blackbox

Overflow nav:

- Agents
- Automations
- Integrations
- Archive
- Memory Wiki
- Settings
- Scraper

Recommended plain-language renames:

- `Control Gate` can remain `Control Gate` or become `Approvals` if the product needs plainer navigation.
- `Blackbox` can remain as an internal route, but the visible label may be `Activity` or `Logs` if it feels too stylized.
- `Automations` maps to `/routines`.
- `Integrations` maps to `/loadout`.
- `Agents` maps to `/operators`.

## Command Palette

[code block omitted]

Expected behavior:

- `Esc` closes.
- Keyboard-first filtering.
- Commands show route, impact, and whether approval is needed.
- Risky commands route to approval or step-up instead of executing silently.

## Runtime Health Strip

[code block omitted]

States:

- `Ready`
- `Degraded`
- `Offline`
- `Mock

## Related

- [[index]]
- [[areas/repo-layout]]
