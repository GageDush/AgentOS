# AgentOS Forge UI Style

Use a dark agent-native software aesthetic:

- **Background:** near-black with subtle radial gradient, optional noise/grid overlay.
- **Typography:** clean sans for normal UI, compact mono for commands, labels, nav, status, and logs.
- **Accent:** warm orange/amber for active states, attention, approvals, and command focus.
- **Layout:** dense but calm, with large negative space where appropriate.
- **Panels:** translucent, thin bordered, terminal/workbench-inspired.
- **Motion:** subtle fade/slide, cursor proximity response, hover stripe overlays, no bouncy effects.
- **Core surfaces:** Mission Control, Agent Activity, Sandbox Approvals, Generated App Preview, System Health, Command Palette.
- **Do not copy** Factory logos, brand text, SVGs, or exact layout.
- **Generated apps** should use this preset by default unless the user explicitly requests another style.

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

### Layout & Section Primitives

- `ForgeSectionHeader` — mono kicker, large title, optional amber accent word
- `ForgeStatCard` — Halo-style stat pattern (label / value / divider / caption)
- `ForgeSegmentedControl` — view-mode toggle
- `ForgeFaqAccordion` — expandable FAQ rows
- CSS utilities: `.forge-page-grid`, `.forge-section-header`, `.forge-stat-card`, `.forge-card-glow`, `.forge-card-featured`, `.forge-dashboard-layout`
- Motion: `ScrollReveal`, `useScrollReveal` with stagger and reduced-motion fallback

### TopNav

Floating centered pill nav with backdrop blur on scroll, pending-approval badge, visible Cmd+K hint, and mobile drawer menu.

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
