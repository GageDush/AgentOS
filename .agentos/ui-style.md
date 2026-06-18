# AgentOS Forge UI Style

**Canonical spec:** `apps/command-center/src/styles/forge-ds/DESIGN-SYSTEM.md`  
**Tokens:** `packages/ui/src/tokens/agentos-forge.css` + `apps/command-center/src/styles/forge-ds/`

Use a warm-dark, molten-orange agent command center aesthetic:

- **Background:** `#0A0908` warm near-black (brown undertone), optional dot-grid / noise overlay — not pure `#000000`
- **Typography:** Inter / Inter Display for UI; JetBrains Mono for IDs, logs, status labels, commands; Switzer italic for marketing accent phrases only
- **Accent:** molten orange `#FF6A35` for primary actions, active nav, approvals, and focus — deep ember `#F04E1A` in gradients only
- **No cool blue/violet primary accents** — blue/purple reserved for future AMS panel only
- **Layout:** dense but calm operator UI; marketing home may use more negative space
- **Panels:** `#1C1A17` surfaces, hairline borders `rgba(255,255,255,0.07)`, subtle inner highlight
- **Motion:** 150ms snappy transitions; respect `prefers-reduced-motion`
- **Core surfaces:** Mission Control, Agent Activity, Sandbox Approvals, Control Gate, System Health, Command Palette, Memory Wiki, flous.dev/docs

## Default Preset

```json
{
  "uiPreset": "agentos-forge",
  "surfaces": [
    "dashboard",
    "mission-control",
    "approval-center",
    "integration-settings",
    "generated-app-preview"
  ]
}
```

## Component Source

Import from `@agentos/ui` and `@agentos/ui/styles/agentos-forge.css` unless a missing component is explicitly required.

Layered exports:

- `@agentos/ui/primitives` — stat card, section header, pills
- `@agentos/ui/blocks` — mission control, approvals, activity feed
- `@agentos/ui/layout` — shell and nav (`AppShell`, `TopNav`)
- `@agentos/ui/motion` — scroll reveal, proximity, reactive cards

New UI: primitives under `packages/ui/src/components/`; composed surfaces in `blocks/index.ts`.

### Layout & Section Primitives

- `ForgeSectionHeader` — mono kicker, large title, optional accent word
- `ForgeStatCard` — label / value / divider / caption
- `ForgeSegmentedControl` — view-mode toggle
- `ForgeFaqAccordion` — expandable FAQ rows
- CSS utilities: `.forge-page-grid`, `.forge-section-header`, `.forge-stat-card`, `.forge-card-glow`, `.forge-dashboard-layout`
- Motion: `ScrollReveal`, `useScrollReveal` with stagger and reduced-motion fallback

### TopNav

Floating centered pill nav with backdrop blur on scroll, pending-approval badge, visible Cmd+K hint, and mobile drawer menu. **Unify this shell across `/` and inner routes** (current gap: home uses handoff nav; operational routes use legacy link nav).

## Required Generated UI Semantics

Preserve local-first agent workflow semantics:

- runs, agents, tasks, approvals, sandboxes, integrations, schedules, logs, artifacts, generated apps

Generated UI must include when relevant:

- command input
- live activity feed
- run status
- approval/sandbox elevation surface
- quick actions
- audit/log visibility
- generated app preview

## Reduced Motion

Respect `prefers-reduced-motion`. Disable pointer spotlight, magnetic transforms, and status pulse animations when reduced motion is requested.
