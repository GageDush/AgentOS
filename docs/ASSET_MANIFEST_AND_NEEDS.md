# AgentOS Asset Manifest and Remaining Needs

## Generated concept assets included

These images were generated during the chat and are included in `assets/generated/`.

| File | Purpose |
|---|---|
| `futuristic_operations_hub_in_pixel_art.png` | Main AgentOS office environment concept; no agents; wide background reference. |
| `agentos_hq_modular_room_kit.png` | Modular department room kit for Security, QA, Mission Board, Finance, DevOps, Knowledge, Comms, Server Room, Command Hub. |
| `sci_fi_office_pixel_art_asset_sheet.png` | Furniture, props, desks, server racks, screens, terminals, plants, signs, and office clutter. |
| `agentos_ui_kit_concept_sheet.png` | UI kit with panels, modals, buttons, cards, notifications, HUD bars, progress bars, chat boxes, avatar frames. |
| `agentos_pixel_icon_sheet_design.png` | Icons and status badges for agent state, operations, system/data, approvals, warnings, Discord, mobile control, etc. |
| `agentos_specialist_agents_dashboard.png` | Agent roster concept with 8 roles and portrait/avatar references. |
| `agentos_operator_sprite_sheet_design.png` | Character action sheet for one operator: idle, walk, run, talk, work, point, thumbs up, celebrate, blocked/worried. |
| `agentos_asset_roadmap_overview.png` | Polished visual roadmap of remaining asset categories. |

## Important production note

The generated sheets are **concept sheets**, not clean final game atlases.

Before use in Phaser, they should be processed into:

```text
transparent PNG sprites
texture atlases
JSON metadata
collision rectangles
interaction zone coordinates
animation frame definitions
```

## First production asset pass

Create these files manually or with an asset-processing pipeline:

```text
assets/game/backgrounds/office_master.png
assets/game/maps/office_interactables.json
assets/game/atlases/environment.png
assets/game/atlases/environment.json
assets/game/atlases/ui.png
assets/game/atlases/ui.json
assets/game/atlases/icons.png
assets/game/atlases/icons.json
assets/game/atlases/agents.png
assets/game/atlases/agents.json
```

## Additional assets needed

### Character animations

```text
movement variants
laptop/desk interactions
emotes and status loops
in-room idle poses
walking with tablet
typing with headphones
blocked/error pose
success pose
approval waiting pose
deploying pose
```

### VFX

```text
interaction sparks
interface pop animations
scanline pulses
success burst
error burst
warning flash
teleport/transition FX
agent task assignment beam
token warning pulse
memory upload glow
```

### Tile transitions

```text
door open/close
platform edge blends
elevator/lift tiles
room connector tiles
stairs up/down variants
floor trim corner pieces
carpet/path variations
```

### Hover and click highlights

```text
tile hover glow
clickable object pulse
object outline states
button press animation
focus outlines
disabled/locked highlight
agent selection ring
station selection ring
```

### Portrait expressions

```text
neutral
happy
focused
worried
excited
angry
confused
speaking/blink loops
warm/danger status overlays
dialogue portrait frames
```

### Sound cues

```text
UI click
UI hover
panel open
panel close
success
warning
error
mission update
agent assigned
approval required
Discord command received
memory saved
budget warning
```

### Ambient overlays

```text
scanline overlay
vignette
dust/particles
subtle noise/grain
screen glow flicker
server rack blinking lights
city parallax lights
neon reflection layer
```

### Cursor set

```text
default cursor
hover/click cursor
move cursor
resize cursor
text select cursor
unavailable/locked cursor
target/crosshair cursor
grab/drag cursor
```

### Minimap

```text
room icons
agent position markers
POI markers
zoom/pan states
active task pulsing marker
blocked agent marker
department color coding
```

### Loading and onboarding

```text
loading screen variants
tips rotation
progress bar variants
welcome tutorial cards
highlight callouts
contextual tips
skip/back/next states
```

### Notifications

```text
success toast
warning toast
danger toast
info toast
budget warning variant
token hard-stop variant
approval required variant
agent complete variant
Discord mirrored variant
```

### Tooltips

```text
short tooltip
rich tooltip
arrow anchored tooltip
delayed show/hide
icon + text variants
keyboard shortcut hints
```

### Map collision guides

```text
walkable overlay
wall overlay
object bounds
door bounds
stairs bounds
path blocking rules
debug grid toggle
```

### Interaction markers

```text
quest/objective marker
talk/dialogue marker
access/terminal marker
budget/shop marker
memory marker
approval marker
blocked marker
external integration marker
```

### Background variants

```text
day
night
rain
neon fog
emergency red mode
low-power mode
celebration mode
offline mode
```

### Mobile UI variants

```text
responsive panel layout
bottom nav
large touch targets
condensed task cards
mobile approval drawer
mobile agent chat panel
mobile token warning card
```

### Discord assets

```text
mission embed card
status embed card
success/fail embed card
compact embed card
agent avatar small icons
approval button graphics
bot presence image
server banner
```

### Localization-safe UI frames

```text
flexible-width panels
auto-scaling text containers
RTL support
font fallback layout
long-label button variants
```

### Achievements and rewards

```text
achievement badges
tiered rarity frames
unlock animation
reward popup
agent XP badge
mission completion badge
```

### Save/load and error states

```text
saving indicator
saved confirmation
load success
load failure
empty state art
error state art
retry CTA
friendly messaging
```

## Recommended asset priority

1. Office background.
2. Interactable object zones.
3. UI overlays and panels.
4. Icon sheet.
5. Agent idle/walk/type animations.
6. Status bubbles.
7. Approval and token warning states.
8. Discord mobile embed assets.
9. Ambient VFX.
10. Polished loading/onboarding screens.
