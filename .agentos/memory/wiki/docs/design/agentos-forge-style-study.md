---
slug: docs/design/agentos-forge-style-study
title: Agentos Forge Style Study
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Agentos Forge Style Study

Source: `docs/design/agentos-forge-style-study.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Forge Style Study

## Reference Learnings (Conceptual)

AgentOS Forge draws conceptual inspiration from polished agent command centers:

- Dark terminal shell with mission-control framing
- Live agent presence and run visibility
- Mono labels for status, logs, and navigation
- Molten orange active states (`#FF6A35` primary, `#F04E1A` ember in gradients)
- Subtle hover motion and cursor-reactive microinteractions
- Translucent panels with thin borders
- Sandbox approval UX with clear risk and scope
- Generated app preview with responsive viewport controls
- Future click-to-edit workflow for targeted UI changes

## What AgentOS Adopts

- Near-black backgrounds with radial gradients and grid/noise overlays
- Dense but calm operator layouts
- Mission timeline and activity feed semantics
- Command palette as primary control surface (Cmd+K / Ctrl+K)
- Approval cards with allow-once / allow-for-mission / deny actions
- Reduced-motion policy and performant pointer tracking (rAF + CSS variables)

## What AgentOS Avoids Copying

- Factory logos, brand text, exact SVGs, proprietary assets, or marketing copy
- Exact page structure or proprietary layout clones
- Neon overload and bouncy SaaS dashboard styling
- Generic undifferentiated card soup

## Using the Design System

[code block omitted]

Wrap the app in `AppShell` or `ProximityProvider` for cursor-reactive behavior.

## Layout Patterns

- `.forge-dashboard-layout` — main + sidebar grid (collapses on tablet)
- `.forge-zone-hero` — mission console + command deck centerpiece
- `.forge-stats-strip` — top metric row on dashboard
- `.forge-command-deck` — primary command input rail under mission hero
- `.forge-page-grid-cards` — responsive stat/presence card grid
- `.forge-page-grid-main-rail` — timeline column + status rail
- `ForgeSectionHeader` for page kickers; `TerminalWindow` / `ReactiveCard` for panels
- `ScrollReveal` with 60–80ms stagger for dashboard and Control Gate sections

## Entry Flow

First visit to `/` or `/dashboard` runs a three-phase intro before the dashboard:

1. **Boot** — `ForgeBootLoader` asset/status sequence (~2.4s minimum)
2. **Landing** — `ForgeLandingZone` with typing `> Run Everything` prompt (click or Enter)
3. **Launch** — `ForgeLaunchTransition` flash into the dashboard shell

Repeat visits in the same tab skip the int

## Related

- [[index]]
- [[areas/repo-layout]]
