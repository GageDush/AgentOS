# AgentOS Design System

## Overview

AgentOS is a **local-first AI agent command center** built by Gage Dush under the **flous.dev** brand. It is not a marketing product — it's a personal operating interface for running, managing, and monitoring AI agents that carry out multi-step missions.

Two surfaces exist under this brand:
1. **flous.dev** — the marketing/landing site (public-facing, premium dark SaaS aesthetic)
2. **AgentOS dashboard** — the operational shell (personal tool, schematic-functional, Forge identity)

### Sources
- `uploads/DESIGN.md` — naming conventions, vocabulary, UI copy rules
- `uploads/agentos-forge-style-study.md` — Forge visual identity study
- `uploads/base-site-completion-wireframe.md` — full page/feature wireframe
- `uploads/Intended target/` — Framer-exported reference site (Platform® template on plat-form.framer.ai, June 2026)
- GitHub: https://github.com/GageDush/AgentOS (production codebase — requires access)

---

## CONTENT FUNDAMENTALS

### Voice & Tone
- **Calm, operational, direct.** AgentOS is a tool, not a product. Copy reads like a trusted colleague, not a salesperson.
- **Second person, present tense.** "Your agents are running." Not "Users can run agents."
- **Sentence case everywhere** except product names (AgentOS, Flous.dev) and acronyms (API, AMS).
- **No emoji in navigation, headings, or status labels.** Emoji only in agent quick-action suggestions in the compose panel.
- **No hyperbole.** "Run missions" not "Supercharge your workflow." "Approve once" not "Grant permission."

### Vocabulary (from DESIGN.md)
| UI Term | Not |
|---|---|
| Mission | Task, Job, Workflow |
| Agent | Bot, Assistant, Model |
| Run | Execute, Trigger, Fire |
| Approve once | Grant permission |
| Deny | Reject, Block |
| Awaiting | Waiting, Pending approval |
| Control Gate | Permission prompt |
| Memory | Knowledge base |
| Skills | Capabilities, Tools |
| Staging | Preview, Sandbox |

### Copy Style Examples
- "1 mission running" not "You have 1 active task"
- "Approve for this mission" not "Authorize"
- "run-8x4f failed — see logs" not "An error occurred"
- "No missions yet. Start one." not "You haven't created any missions"

---

## VISUAL FOUNDATIONS

### Color System
- **Background:** `#0A0908` — warm near-black (NOT pure `#000000`, has brown undertone)
- **Surfaces:** 3-level system — raised (`#131110`), surface (`#1C1A17`), overlay (`#262320`)
- **Primary accent:** `#FF6A35` molten orange — used sparingly for primary actions, active states, glows
- **No purple, no blue primary** — those colors are reserved for a future AMS feature panel
- **Status colors:** green `#22C97A` (ok), amber `#F5A623` (warn), red `#EF4545` (err) — runtime state only, never decorative

### Typography
- **Inter Display** — display headings (hero, section titles), weights 500–700, tight letter-spacing
- **Inter** — all body text, UI copy, nav labels, weights 400–600
- **Switzer** — italic accent for marketing/landing display (italicized hero sub-phrases)
- **JetBrains Mono** — all machine-readable text: IDs, paths, log lines, code, command inputs, status labels, section headers in the dashboard
- Avoid mixing display and body in the same visual line; use Inter Display for headings, Inter for paragraphs

### Backgrounds & Textures
- Near-black `#0A0908` base — no full-bleed photos in the dashboard shell
- **Dot-grid pattern** (`assets/dot-grid.svg`) as a subtle repeating texture on hero sections
- Dashboard uses flat dark surfaces — no gradients on background panels
- Marketing/landing may use subtle radial glow at hero center (orange, very low opacity)

### Cards
- `border-radius: 8px` (`--radius-lg`) standard; `12px` for elevated modals
- `border: 1px solid rgba(255,255,255,0.07)` hairline
- `box-shadow: inset 0 1px 0 rgba(255,255,255,0.06)` inner-top highlight
- Background: `#1C1A17` (`--color-surface`)
- Active/selected: accent orange border `rgba(255,106,53,0.28)`

### Motion
- **150ms base** for color/border transitions — snappy, not sluggish
- **250ms** for opacity fades, panel entries
- **400ms + spring ease** for modal entrances, card stagger animations
- Entrance animations always animate *from* hidden so static render shows content
- Respect `prefers-reduced-motion` — all animation gated

### Hover & Press States
- Hover: background lightens by one surface level, border shifts to `--color-border-mid`
- Active/press: transform scale `0.97` + shadow collapse
- Primary button hover: orange brightens to `--forge-orange-300`, soft glow added
- No opacity changes on hover — use background/border changes instead

### Borders
- `1px solid rgba(255,255,255,0.07)` — default hairline (most cards, inputs)
- `rgba(255,255,255,0.12)` — mid (hover state)
- `rgba(255,255,255,0.18)` — strong (active panel borders)
- `rgba(255,106,53,0.28)` — accent (selected item, focused input)

### Shadows & Glows
- Elevation via shadow depth (sm → xl), not blur alone
- Orange glow (`--glow-accent-*`) used on: active marks, pulsing status dots, the boot orb
- No colored drop-shadows on text

### Corner Radii
- `2px` — badges, chips (micro elements)
- `4px` — buttons, inputs
- `8px` — cards, panels
- `12–16px` — modals, large feature cards
- `9999px` — pill shapes (rarely used)

### Imagery
- No stock photography in the dashboard
- Marketing site may use abstract dark renders (glowing orbs, particle fields)
- Color palette of any imagery: warm, dark, orange-lit — no cool blue tone
- Boot animation: particle field → molten orb → wordmark reveal (see boot.js)

---

## ICONOGRAPHY

AgentOS does not ship a custom icon font. Icons are used sparingly:
- **Lucide React** (CDN: `https://unpkg.com/lucide-react`) — 1.5px stroke weight, neutral, used in nav rail and action buttons
- Icon size: 16px in buttons/chips, 18px in nav items, 20px in section headers
- No filled icons — outline only, matching the schematic/structural aesthetic
- Typical icons used: `Play`, `Square`, `Check`, `X`, `ChevronRight`, `Terminal`, `Cpu`, `Database`, `Settings`, `Archive`, `Zap`, `Shield`
- **No emoji as icons** in nav or status chips
- AgentOS mark (`assets/agentos-mark.svg`) is the logo — a rounded-square with cardinal connection lines radiating from a center node

---

## FILE INDEX

### Tokens
| File | Contents |
|---|---|
| `tokens/colors.css` | Background surfaces, orange scale, neutral scale, status colors, semantic aliases |
| `tokens/typography.css` | Font families (Inter Display, Inter, Switzer, JetBrains Mono), type scale, weights, line-heights, tracking |
| `tokens/spacing.css` | 4px-base spacing scale, border radii, z-index, layout dimensions |
| `tokens/motion.css` | Duration scale, easing curves, transition presets, keyframe animations |
| `tokens/shadows.css` | Elevation shadows (sm–xl), inner shadows, orange glow system, status glows |

### Components (`components/core/`)
| Component | Description |
|---|---|
| `Button` | Primary interactive button — 4 variants (primary/secondary/ghost/danger), 3 sizes |
| `Badge` | Status badge with pulsing dot — 9 states (running/queued/paused/failed/completed/blocked/offline/ready/awaiting) |
| `Card` | Base surface container — elevated, accent, clickable variants |
| `Input` | Text input with mono label, accent focus ring, hint text |
| `StatusChip` | Health strip indicator — dot + label + optional value |
| `StatCard` | Dashboard metric card — large value, trend indicator, highlight mode |

### Guidelines
| Card | Description |
|---|---|
| `guidelines/brand.card.html` | Brand identity overview — marks, wordmarks, fonts, palette, tone rules |
| `guidelines/colors-primary.card.html` | Orange brand scale (200–800) |
| `guidelines/colors-surface.card.html` | Warm near-black background scale |
| `guidelines/colors-status.card.html` | Status colors — ok / warn / err / info |
| `guidelines/type-display.card.html` | Inter Display + Switzer type scale |
| `guidelines/type-mono.card.html` | JetBrains Mono usage — IDs, labels, logs |
| `guidelines/spacing.card.html` | 4px spacing scale + border radii |
| `guidelines/motion.card.html` | Duration scale + easing reference |
| `guidelines/shadows.card.html` | Elevation shadows + glow system |

### Assets (`assets/`)
| File | Description |
|---|---|
| `agentos-mark.svg` | AgentOS logomark — rounded square + connection diagram |
| `agentos-wordmark.svg` | AgentOS wordmark — mark + "Agent**OS**" |
| `flous-wordmark.svg` | flous.dev wordmark |
| `dot-grid.svg` | 1px dot-grid tile for hero backgrounds |

### UI Kits
| Kit | Description |
|---|---|
| `ui_kits/flous-landing/` | flous.dev marketing site — hero, features, nav |
| `ui_kits/agentos-dashboard/` | AgentOS operational shell — home, missions, agents |

---

## REAL NAV STRUCTURE (from codebase)

The actual `ForgeDashboardShell.tsx` uses a **top nav** layout (not a left sidebar):

```
TopNav: Dashboard | Missions | Control Gate | Blackbox | ···
Overflow: Agents · Automations · Integrations · Archive · Settings · Office (preview)
```

Health bar is a separate row below the nav. Connection mode pill (Live / Polling / Offline) is in the top-right.

## CODEBASE STATUS (Jun 2026)

Production tokens in `packages/ui/src/tokens/agentos-forge.css` and legacy aliases in `apps/command-center/src/app/globals.css` use the **Forge orange identity** (`#FF6A35` accent, `#0A0908` background, Inter + JetBrains Mono). Remaining work is **layout unification** (home pill nav vs operational link nav), not the color palette.

The `tokens/forge-compat.css` file maps the `--forge-*` namespace to Forge orange values for entry animation and shared components.

## CAVEATS
- Fonts are loaded via CDN (Google Fonts + Framer's fontshare). For production, self-host the woff2 files.
- Logo SVGs use `<text>` elements for the wordmarks (not outlined paths) — font rendering depends on Inter Display loading. For final production logos, export paths from a vector tool.
- Switzer italic is served from Framer's CDN — may not be available in all build environments.
- The `@agentos/ui` package (AppShell, TopNav, AmbientSystemHealthBar, CommandPalette) is referenced in the codebase but not yet included in this design system — add component wrappers when the package is published.
