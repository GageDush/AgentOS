---
slug: docs/phaser_office_implementation_plan
title: PHASER OFFICE IMPLEMENTATION PLAN
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# PHASER OFFICE IMPLEMENTATION PLAN

Source: `docs/PHASER_OFFICE_IMPLEMENTATION_PLAN.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Phaser Office Dashboard Implementation Plan

## Product direction

AgentOS should be a Phaser-based interactive office dashboard.

The user opens AgentOS and sees a pixel-art operations office. Agents, desks, boards, rooms, terminals, server racks, and system objects are clickable. Each click opens an AgentOS control interface.

Discord provides mobile control from a phone.

## Best architecture

Use **hybrid Phaser + React**.

Phaser handles:

[code block omitted]

React/HTML handles:

[code block omitted]

## Main app stack

[code block omitted]

## Main user experience

1. User opens `http://localhost:3000`.
2. Pixel-art AgentOS Command Center loads.
3. User clicks an agent, room, desk, board, terminal, or system object.
4. Phaser emits an interaction event.
5. React opens the correct overlay panel.
6. Panel calls AgentOS API.
7. Backend returns live agent/task/system data.
8. WebSocket pushes status updates.
9. Discord bot mirrors key controls on mobile.

## Phaser scenes

[code block omitted]

## Required clickable areas

[code block omitted]

## Required panels

[code block omitted]

## Interaction registry

Do not hardcode every clickable item inside the scene. Use a data-driven registry.

[code block omitted]

Example:

[code block omitted]

Phaser implementation pattern:

[code block omitted]

## Agent states

[code block omitted]

## Visual state behavior

| State | Visual |
|---|---|
| idle | standing or slow idle animation |
| thinking | thought bubble |
| working | typing at desk |
| blocked | red alert icon |
| reviewing | clipboard/checklist icon |
| deploying | rocket/upload icon |
| done | green check |
| error | red warning |
| offline | dimmed sprite |

## Discord mobile controls

Commands:

[code block omitted]

Approval messages should have buttons:

[code block omitted]

Modals/forms:

[code block omitted]

## Build order

[code block omitted]

## Phase acceptance criteria

### Phase 1: office shell

[code block omitted]

### Phase 2: overlays

[code block omitted]

### Phase 3: backend data

[code block omitted]

### Phase 4: Discord

[code block omitted]

## Related

- [[index]]
- [[areas/repo-layout]]
