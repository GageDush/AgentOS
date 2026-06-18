# AgentOS Forge — Open CoDesign design memory

Use this file in Open CoDesign workspaces so generated artifacts match the AgentOS Command Center.

**Canonical source:** `apps/command-center/src/styles/forge-ds/DESIGN-SYSTEM.md`  
**CSS tokens:** `packages/ui/src/tokens/agentos-forge.css`

## Brand

- Product: **AgentOS** (operational shell) under **flous.dev**
- Identity: warm-dark **Forge** — molten orange accent, schematic dashboard (not marketing SaaS)

## Voice

- Calm, operational, direct. Second person, present tense.
- Sentence case. No emoji in nav or status labels.
- Vocabulary: Mission, Agent, Run, Control Gate, Approve once, Deny, Memory, Skills.

## Colors (required)

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg` | `#0A0908` | Page background (warm near-black) |
| `--color-raised` | `#131110` | Raised panels |
| `--color-surface` | `#1C1A17` | Cards |
| `--color-overlay` | `#262320` | Modals / overlays |
| `--color-accent` | `#FF6A35` | Primary actions, active nav, glows |
| `--color-ok` | `#22C97A` | Healthy / success |
| `--color-warn` | `#F5A623` | Warnings |
| `--color-err` | `#EF4545` | Errors |

**Do not use blue or violet as primary accents** — orange Forge is canonical.

Borders: `1px solid rgba(255,255,255,0.07)`  
Active border: `rgba(255,106,53,0.28)`

## Typography

- **Inter Display** — section headings (500–700)
- **Inter** — body and UI copy (400–600)
- **JetBrains Mono** — IDs, logs, paths, status chips, command input

## Layout patterns

### Home (`/`)

- Centered pill top nav: Dashboard, Missions, Control Gate, Agents, Memory, Settings
- Hero: mission compose + quick actions
- Cards: active missions, pending approvals, integrations, router stats
- Dark flat surfaces; subtle dot-grid on hero only

### Operational shell (inner routes)

- Top bar: flat links + health strip + operator session
- Optional right **Run Inspector** sidebar on mission-heavy views
- Dense data tables, monospace run IDs, status pills

### Control Gate

- Approval queue with Approve once / Deny
- Show mission title, agent, risk summary, diff hint

## Motion

- 150–200ms ease transitions
- No bouncy springs on dashboard chrome
- Subtle orange glow on primary CTA hover only

## Export handoff

When using **Decompose to UI Kit**, emit:

- `tokens.css` with variables above
- React components using semantic class names aligned with `packages/ui` Forge primitives
- No placeholder lorem for status labels — use realistic AgentOS copy ("1 mission running", "8 awaiting approval")
