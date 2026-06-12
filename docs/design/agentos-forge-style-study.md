# AgentOS Forge Style Study

## Reference Learnings (Conceptual)

AgentOS Forge draws conceptual inspiration from polished agent command centers:

- Dark terminal shell with mission-control framing
- Live agent presence and run visibility
- Mono labels for status, logs, and navigation
- Cool blue/violet active states (Halo-inspired palette)
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

```tsx
import "@agentos/ui/styles/agentos-forge.css";
import {
  AppShell,
  ForgeSectionHeader,
  ForgeStatCard,
  MissionControlPanel,
  CommandPalette,
  ScrollReveal
} from "@agentos/ui";
```

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

Repeat visits in the same tab skip the intro via `sessionStorage` key `agentos-forge-entered`. Clear it to replay: `sessionStorage.removeItem('agentos-forge-entered')`.

## TopNav Behavior

- Sticky floating pill with blur on scroll
- `pendingApprovals` prop drives accent badge
- Command button shows ⌘K hint; wires to `CommandPalette`
- Mobile: hamburger drawer for overflow nav links

## Requesting the Preset in Generated Apps

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

The orchestrator attaches `uiGeneration` to frontend-routed `TaskEnvelope` objects by default.

Scaffold reference: `packages/app-generator/templates/agentos-forge/`

Style contract: `.agentos/ui-style.md`

## Reduced Motion Policy

When `prefers-reduced-motion: reduce` is active:

- Pointer spotlight is hidden
- Magnetic transforms and stripe overlays are disabled
- Status pulse and shake animations are suppressed

## Pointer Tracking Performance

- Single `requestAnimationFrame` loop; no React state updates on `mousemove`
- Proximity written to per-element CSS variables (`--proximity`, `--magnet-x`, `--magnet-y`)
- Global pointer position on `document.documentElement`
- Interactive elements register via `data-forge-proximity`

## Preview Routes

- Component gallery: `http://localhost:3000/preview/forge`
- Experimental office map: `http://localhost:3000/office`
- Command center: `http://localhost:3000/`
