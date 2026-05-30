# AgentOS Phaser Office Dashboard Implementation Plan

## Product direction

AgentOS should be a Phaser-based interactive office dashboard.

The user opens AgentOS and sees a pixel-art operations office. Agents, desks, boards, rooms, terminals, server racks, and system objects are clickable. Each click opens an AgentOS control interface.

Discord provides mobile control from a phone.

## Best architecture

Use **hybrid Phaser + React**.

Phaser handles:

```text
office map
agent sprites
animations
clickable objects
camera movement
ambient effects
status bubbles
department rooms
```

React/HTML handles:

```text
modals
forms
chat panels
task lists
logs
settings
token dashboard
memory browser
approval buttons
```

## Main app stack

```text
Frontend:
Next.js + React + Phaser + Zustand

Game:
Phaser + TypeScript + pixel-art assets + optional Tiled map JSON

Backend:
Fastify or NestJS

Realtime:
WebSocket or Socket.IO

Database:
Postgres

Queue:
Redis + BullMQ

Memory:
Postgres structured tables + vector-ready schema

Discord:
discord.js or HTTP interaction endpoint

Styling:
Tailwind + shadcn/ui for React panels

Deployment:
Docker Compose first
```

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

```text
BootScene
PreloadScene
OfficeScene
HudScene
InteractionScene
```

## Required clickable areas

```text
AgentOS Operator sprite
Builder Agent sprite
QA Agent sprite
Security Agent sprite
Product Agent sprite
Mission board
Task pipeline board
Finance/token station
Knowledge/memory station
Security station
QA station
DevOps station
Server rack
Settings terminal
Discord/comms station
System status panel
```

## Required panels

```text
AgentPanel
TaskPanel
MissionBoardPanel
MemoryPanel
TokenManagerPanel
SystemHealthPanel
ApprovalPanel
LogsPanel
DiscordPanel
SettingsPanel
```

## Interaction registry

Do not hardcode every clickable item inside the scene. Use a data-driven registry.

```ts
export type OfficeInteractable = {
  id: string;
  label: string;
  kind: "agent" | "station" | "board" | "system" | "room" | "prop";
  x: number;
  y: number;
  width: number;
  height: number;
  action: string;
  panel: string;
};
```

Example:

```ts
{
  id: "finance-token-desk",
  label: "Token & Usage Manager",
  kind: "station",
  x: 820,
  y: 340,
  width: 180,
  height: 120,
  action: "open-token-manager",
  panel: "TokenManagerPanel"
}
```

Phaser implementation pattern:

```ts
const zone = this.add.zone(x, y, width, height)
  .setInteractive({ useHandCursor: true });

zone.on("pointerdown", () => {
  eventBus.emit("agentos:interaction", {
    action: "open-token-manager",
    targetId: "finance-token-desk"
  });
});
```

## Agent states

```text
idle
thinking
working
blocked
reviewing
deploying
done
error
offline
```

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

```text
/status
/agents
/tasks
/task-create
/assign
/approve
/deny
/logs
/tokens
/memory-search
```

Approval messages should have buttons:

```text
Approve
Deny
View Logs
Open Dashboard
Pause Agent
Escalate
```

Modals/forms:

```text
Create task
Add memory
Set budget
Send instruction to agent
```

## Build order

```text
1. Static Phaser office.
2. Clickable zones.
3. React overlay panels.
4. Backend API.
5. WebSocket live updates.
6. Mock agents.
7. Memory system.
8. Token manager.
9. Approval system.
10. Discord bot.
11. Real LLM provider support.
12. GitHub/repo automation.
```

## Phase acceptance criteria

### Phase 1: office shell

```text
[ ] Office loads in browser.
[ ] No agents required yet.
[ ] Department zones are visible.
[ ] At least 12 interactable zones exist.
[ ] Mouse and touch both work.
[ ] Camera/scale works on desktop and mobile.
```

### Phase 2: overlays

```text
[ ] Clicking an agent opens AgentPanel.
[ ] Clicking mission board opens TaskPanel.
[ ] Clicking finance/token desk opens TokenManagerPanel.
[ ] Clicking knowledge desk opens MemoryPanel.
[ ] Clicking server rack opens SystemHealthPanel.
[ ] Panels are usable on desktop and mobile.
```

### Phase 3: backend data

```text
[ ] Dashboard reads agents from API.
[ ] Dashboard reads tasks from API.
[ ] WebSocket updates office status bubbles live.
[ ] Agent status changes appear above sprites.
[ ] Task queue updates without page refresh.
```

### Phase 4: Discord

```text
[ ] Discord bot connects.
[ ] /status works.
[ ] /tasks returns current tasks.
[ ] /task-create creates task.
[ ] /approve approves waiting action.
[ ] /tokens returns usage summary.
[ ] Discord events update dashboard.
```
