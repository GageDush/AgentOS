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

export type OfficeVisualAnchor = {
  anchorX?: number;
  anchorY?: number;
  scale?: number;
  depth?: number;
  shadowScale?: number;
  labelX?: number;
  labelY?: number;
  labelOffsetY?: number;
  labelVisibleInNormalMode?: boolean;
  statusX?: number;
  statusY?: number;
  propKey?: string;
  propX?: number;
  propY?: number;
  propScale?: number;
  screenKey?: string;
  screenX?: number;
  screenY?: number;
  screenScale?: number;
  screenAlpha?: number;
  pulse?: boolean;
  statusMood?: "idle" | "thinking" | "working" | "blocked";
  actionHint?: string;
  shortDescription?: string;
  portraitKey?: string;
};

export type WorkstationSlot = {
  stationId: string;
  stationName: string;
  role: string;
  seatX: number;
  seatY: number;
  standX: number;
  standY: number;
  workFacing: "left" | "right" | "up" | "down";
  workSurfaceX: number;
  workSurfaceY: number;
  statusDotX: number;
  statusDotY: number;
  occlusionDepth: number;
  preferredAgentIds: string[];
  actionLabel: string;
  labelX?: number;
  labelY?: number;
  hitboxId?: string;
};

export type OfficeAgentVisual = {
  agentId: string;
  name: string;
  role: string;
  homeStationId: string;
  portraitKey: string;
  tint: number;
  mode: "idle" | "walking" | "working" | "thinking" | "reviewing" | "blocked";
  statusText: string;
  patrolStationIds: string[];
};

export type DemoMissionVisualStep = {
  agentId: string;
  stationId: string;
  mode: OfficeAgentVisual["mode"];
  statusText: string;
  delayMs: number;
};

// Keep hitboxes and visual anchors separate so scene polish can be tuned here
// without burying more magic numbers inside OfficeGame.tsx.
export const officeInteractables: OfficeInteractable[] = [
  {
    id: "agentos-operator",
    label: "AgentOS Operator",
    kind: "agent",
    x: 600,
    y: 260,
    width: 100,
    height: 120,
    action: "open-agent",
    panel: "AgentPanel"
  },
  {
    id: "builder-agent",
    label: "Builder Agent",
    kind: "agent",
    x: 360,
    y: 410,
    width: 100,
    height: 120,
    action: "open-agent",
    panel: "AgentPanel"
  },
  {
    id: "qa-agent",
    label: "QA Agent",
    kind: "agent",
    x: 785,
    y: 410,
    width: 100,
    height: 120,
    action: "open-agent",
    panel: "AgentPanel"
  },
  {
    id: "security-agent",
    label: "Security Agent",
    kind: "agent",
    x: 970,
    y: 285,
    width: 110,
    height: 130,
    action: "open-agent",
    panel: "AgentPanel"
  },
  {
    id: "product-agent",
    label: "Product Agent",
    kind: "agent",
    x: 205,
    y: 290,
    width: 110,
    height: 130,
    action: "open-agent",
    panel: "AgentPanel"
  },
  {
    id: "mission-board",
    label: "Mission Board",
    kind: "board",
    x: 520,
    y: 80,
    width: 240,
    height: 105,
    action: "open-missions",
    panel: "MissionBoardPanel"
  },
  {
    id: "task-pipeline-board",
    label: "Task Pipeline",
    kind: "board",
    x: 55,
    y: 130,
    width: 220,
    height: 120,
    action: "open-tasks",
    panel: "TaskPanel"
  },
  {
    id: "finance-token-station",
    label: "Token & Credit Manager",
    kind: "station",
    x: 1015,
    y: 470,
    width: 190,
    height: 120,
    action: "open-token-manager",
    panel: "TokenManagerPanel"
  },
  {
    id: "knowledge-memory-station",
    label: "Memory Browser",
    kind: "station",
    x: 70,
    y: 470,
    width: 205,
    height: 120,
    action: "open-memory",
    panel: "MemoryPanel"
  },
  {
    id: "security-station",
    label: "Approval Gates",
    kind: "station",
    x: 955,
    y: 95,
    width: 210,
    height: 125,
    action: "open-approvals",
    panel: "ApprovalPanel"
  },
  {
    id: "qa-station",
    label: "QA Station",
    kind: "station",
    x: 755,
    y: 560,
    width: 175,
    height: 95,
    action: "open-logs",
    panel: "LogsPanel"
  },
  {
    id: "devops-station",
    label: "DevOps Station",
    kind: "station",
    x: 320,
    y: 560,
    width: 185,
    height: 95,
    action: "open-system-health",
    panel: "SystemHealthPanel"
  },
  {
    id: "server-rack",
    label: "Server Rack",
    kind: "system",
    x: 1105,
    y: 225,
    width: 105,
    height: 185,
    action: "open-system-health",
    panel: "SystemHealthPanel"
  },
  {
    id: "settings-terminal",
    label: "Settings Terminal",
    kind: "system",
    x: 545,
    y: 555,
    width: 185,
    height: 105,
    action: "open-settings",
    panel: "SettingsPanel"
  },
  {
    id: "discord-comms-station",
    label: "Discord Comms",
    kind: "station",
    x: 55,
    y: 270,
    width: 165,
    height: 125,
    action: "open-discord",
    panel: "DiscordPanel"
  },
  {
    id: "local-ai-console",
    label: "Local AI Console",
    kind: "station",
    x: 535,
    y: 605,
    width: 195,
    height: 95,
    action: "open-local-ai",
    panel: "LocalAIConsolePanel"
  },
  {
    id: "system-status-panel",
    label: "System Status",
    kind: "system",
    x: 790,
    y: 90,
    width: 150,
    height: 115,
    action: "open-system-health",
    panel: "SystemHealthPanel"
  }
];

// Tweak these values when a sprite feels like it is floating or colliding:
// - x/y/width/height adjust the invisible click target
// - anchorX/anchorY/scale/depth control in-room placement
// - labelX/labelY keep labels off the character art
// - shadowScale helps ground each agent to the floor plane
export const officeVisualAnchors: Record<string, OfficeVisualAnchor> = {
  "agentos-operator": {
    anchorX: 640,
    anchorY: 496,
    scale: 0.18,
    depth: 488,
    shadowScale: 0.22,
    labelX: 610,
    labelY: 565,
    labelVisibleInNormalMode: false,
    statusX: 678,
    statusY: 450,
    propKey: "standing-podium-prop",
    propX: 632,
    propY: 548,
    propScale: 0.56,
    screenKey: "ui-current-mission-panel",
    screenX: 638,
    screenY: 530,
    screenScale: 0.2,
    screenAlpha: 0.36,
    statusMood: "thinking",
    actionHint: "Open the active command surface.",
    shortDescription: "Routes tasks, watches the room, and stages the next mission.",
    portraitKey: "portrait-briefing"
  },
  "product-agent": {
    anchorX: 228,
    anchorY: 392,
    scale: 0.15,
    depth: 382,
    shadowScale: 0.18,
    labelX: 188,
    labelY: 445,
    labelVisibleInNormalMode: false,
    statusX: 267,
    statusY: 350,
    propKey: "desk-prop",
    propX: 246,
    propY: 420,
    propScale: 0.3,
    statusMood: "idle",
    actionHint: "Review the current strategy brief.",
    shortDescription: "Keeps the mission brief tight and the story legible.",
    portraitKey: "portrait-online"
  },
  "builder-agent": {
    anchorX: 404,
    anchorY: 528,
    scale: 0.16,
    depth: 518,
    shadowScale: 0.18,
    labelX: 364,
    labelY: 582,
    labelVisibleInNormalMode: false,
    statusX: 446,
    statusY: 486,
    propKey: "desk-prop",
    propX: 406,
    propY: 548,
    propScale: 0.31,
    statusMood: "working",
    actionHint: "Inspect the active build task.",
    shortDescription: "Runs the supervised implementation loop and local AI drafting.",
    portraitKey: "portrait-thinking"
  },
  "qa-agent": {
    anchorX: 822,
    anchorY: 530,
    scale: 0.16,
    depth: 520,
    shadowScale: 0.18,
    labelX: 782,
    labelY: 583,
    labelVisibleInNormalMode: false,
    statusX: 857,
    statusY: 487,
    propKey: "desk-prop",
    propX: 822,
    propY: 550,
    propScale: 0.31,
    statusMood: "blocked",
    actionHint: "Review recent checks and regressions.",
    shortDescription: "Flags broken flows and keeps the demo from wobbling.",
    portraitKey: "portrait-blocked"
  },
  "security-agent": {
    anchorX: 1008,
    anchorY: 364,
    scale: 0.15,
    depth: 360,
    shadowScale: 0.18,
    labelX: 958,
    labelY: 427,
    labelVisibleInNormalMode: false,
    statusX: 1046,
    statusY: 330,
    propKey: "approval-console-prop",
    propX: 1038,
    propY: 385,
    propScale: 0.44,
    statusMood: "idle",
    actionHint: "Check safety gates and pending approvals.",
    shortDescription: "Keeps the flashy stuff safe and the risky stuff gated.",
    portraitKey: "portrait-online"
  },
  "mission-board": {
    labelX: 566,
    labelY: 135,
    labelVisibleInNormalMode: true,
    propKey: "mission-board-prop",
    propX: 640,
    propY: 172,
    propScale: 0.53,
    screenKey: "ui-current-mission-panel",
    screenX: 642,
    screenY: 170,
    screenScale: 0.22,
    screenAlpha: 0.48,
    pulse: true,
    actionHint: "Open the current mission and the demo playback sequence.",
    shortDescription: "The headline board for mission flow and family-demo narration."
  },
  "task-pipeline-board": {
    labelX: 78,
    labelY: 198,
    labelVisibleInNormalMode: true,
    screenKey: "ui-operations-log-panel",
    screenX: 168,
    screenY: 208,
    screenScale: 0.18,
    screenAlpha: 0.22,
    actionHint: "Create, queue, and run a simple local AI task.",
    shortDescription: "Shows the practical queue that keeps the room moving."
  },
  "finance-token-station": {
    labelX: 1018,
    labelY: 553,
    labelVisibleInNormalMode: true,
    screenKey: "ui-strategy-brief-panel",
    screenX: 1102,
    screenY: 540,
    screenScale: 0.16,
    screenAlpha: 0.2,
    actionHint: "Inspect usage limits and spend posture.",
    shortDescription: "Tracks cost guardrails while local AI is still effectively free."
  },
  "knowledge-memory-station": {
    labelX: 78,
    labelY: 553,
    labelVisibleInNormalMode: true,
    actionHint: "Open recent memory and decision notes.",
    shortDescription: "The room’s memory shelf for what AgentOS learned recently."
  },
  "security-station": {
    labelX: 972,
    labelY: 170,
    labelVisibleInNormalMode: true,
    propKey: "approval-console-prop",
    propX: 1040,
    propY: 196,
    propScale: 0.46,
    screenKey: "ui-strategy-brief-panel",
    screenX: 1038,
    screenY: 189,
    screenScale: 0.16,
    screenAlpha: 0.24,
    pulse: true,
    actionHint: "Review approvals and safe-mode constraints.",
    shortDescription: "Shows what would require a human sign-off."
  },
  "qa-station": {
    labelX: 760,
    labelY: 626,
    labelVisibleInNormalMode: true,
    screenKey: "ui-operations-log-panel",
    screenX: 842,
    screenY: 604,
    screenScale: 0.15,
    screenAlpha: 0.2,
    actionHint: "Read the latest operational log and checks.",
    shortDescription: "Recent evidence, smoke checks, and audit trails."
  },
  "devops-station": {
    labelX: 332,
    labelY: 626,
    labelVisibleInNormalMode: true,
    actionHint: "Inspect runtime health and command-center wiring.",
    shortDescription: "The operations desk for the systems that keep the demo alive."
  },
  "server-rack": {
    labelX: 1088,
    labelY: 274,
    labelVisibleInNormalMode: true,
    propKey: "server-pedestal-prop",
    propX: 1122,
    propY: 310,
    propScale: 0.72,
    pulse: true,
    actionHint: "Open system health and provider status.",
    shortDescription: "Visual anchor for compute, provider routing, and runtime state."
  },
  "settings-terminal": {
    labelX: 545,
    labelY: 653,
    labelVisibleInNormalMode: true,
    actionHint: "Inspect feature flags and safe-mode switches.",
    shortDescription: "Feature flags, provider mode, and demo posture live here."
  },
  "discord-comms-station": {
    labelX: 65,
    labelY: 337,
    labelVisibleInNormalMode: true,
    actionHint: "Show the safe read-only Discord status surface.",
    shortDescription: "Mobile-friendly status cards without command execution."
  },
  "local-ai-console": {
    labelX: 538,
    labelY: 640,
    labelVisibleInNormalMode: true,
    screenKey: "ui-strategy-brief-panel",
    screenX: 632,
    screenY: 639,
    screenScale: 0.14,
    screenAlpha: 0.26,
    pulse: true,
    actionHint: "Run a prompt against local Ollama from inside the room.",
    shortDescription: "The hands-on prompt surface for local-only AI chat."
  },
  "system-status-panel": {
    labelX: 792,
    labelY: 140,
    labelVisibleInNormalMode: true,
    propKey: "status-display-prop",
    propX: 864,
    propY: 166,
    propScale: 0.5,
    screenKey: "ui-current-mission-panel",
    screenX: 866,
    screenY: 162,
    screenScale: 0.14,
    screenAlpha: 0.18,
    pulse: true,
    actionHint: "Read live health and feature state.",
    shortDescription: "A quick at-a-glance readout for room status."
  }
};

export const officeWorkstations: WorkstationSlot[] = [
  {
    stationId: "product-agent-desk",
    stationName: "Product Desk",
    role: "planning",
    seatX: 246,
    seatY: 365,
    standX: 226,
    standY: 394,
    workFacing: "right",
    workSurfaceX: 235,
    workSurfaceY: 350,
    statusDotX: 292,
    statusDotY: 358,
    occlusionDepth: 386,
    preferredAgentIds: ["product-agent"],
    actionLabel: "shaping brief",
    labelX: 178,
    labelY: 424,
    hitboxId: "task-pipeline-board"
  },
  {
    stationId: "builder-agent-desk",
    stationName: "Builder Desk",
    role: "implementation",
    seatX: 400,
    seatY: 500,
    standX: 382,
    standY: 530,
    workFacing: "right",
    workSurfaceX: 398,
    workSurfaceY: 488,
    statusDotX: 455,
    statusDotY: 490,
    occlusionDepth: 526,
    preferredAgentIds: ["builder-agent"],
    actionLabel: "building task",
    labelX: 338,
    labelY: 560,
    hitboxId: "devops-station"
  },
  {
    stationId: "qa-agent-desk",
    stationName: "QA Station Desk",
    role: "verification",
    seatX: 846,
    seatY: 526,
    standX: 822,
    standY: 548,
    workFacing: "left",
    workSurfaceX: 842,
    workSurfaceY: 506,
    statusDotX: 878,
    statusDotY: 510,
    occlusionDepth: 544,
    preferredAgentIds: ["qa-agent"],
    actionLabel: "checking evidence",
    labelX: 782,
    labelY: 578,
    hitboxId: "qa-station"
  },
  {
    stationId: "security-agent-desk",
    stationName: "Security Desk",
    role: "approval review",
    seatX: 1078,
    seatY: 350,
    standX: 1058,
    standY: 382,
    workFacing: "left",
    workSurfaceX: 1085,
    workSurfaceY: 338,
    statusDotX: 1126,
    statusDotY: 328,
    occlusionDepth: 378,
    preferredAgentIds: ["security-agent"],
    actionLabel: "reviewing gates",
    labelX: 1018,
    labelY: 410,
    hitboxId: "security-station"
  },
  {
    stationId: "operator-command-ring",
    stationName: "Command Ring",
    role: "routing",
    seatX: 642,
    seatY: 548,
    standX: 650,
    standY: 624,
    workFacing: "up",
    workSurfaceX: 640,
    workSurfaceY: 545,
    statusDotX: 704,
    statusDotY: 542,
    occlusionDepth: 626,
    preferredAgentIds: ["agentos-operator"],
    actionLabel: "routing mission",
    labelX: 585,
    labelY: 650,
    hitboxId: "agentos-operator"
  },
  {
    stationId: "mission-board-stand",
    stationName: "Mission Board",
    role: "briefing",
    seatX: 642,
    seatY: 300,
    standX: 642,
    standY: 388,
    workFacing: "up",
    workSurfaceX: 640,
    workSurfaceY: 294,
    statusDotX: 720,
    statusDotY: 318,
    occlusionDepth: 392,
    preferredAgentIds: ["product-agent", "agentos-operator"],
    actionLabel: "briefing plan",
    labelX: 590,
    labelY: 414,
    hitboxId: "mission-board"
  },
  {
    stationId: "approval-gates",
    stationName: "Approval Gates",
    role: "risk gate",
    seatX: 1012,
    seatY: 306,
    standX: 1022,
    standY: 388,
    workFacing: "up",
    workSurfaceX: 1025,
    workSurfaceY: 310,
    statusDotX: 1080,
    statusDotY: 314,
    occlusionDepth: 392,
    preferredAgentIds: ["security-agent"],
    actionLabel: "checking approval",
    labelX: 970,
    labelY: 415,
    hitboxId: "security-station"
  },
  {
    stationId: "local-ai-console",
    stationName: "Local AI Console",
    role: "prompt run",
    seatX: 640,
    seatY: 718,
    standX: 632,
    standY: 768,
    workFacing: "up",
    workSurfaceX: 640,
    workSurfaceY: 716,
    statusDotX: 704,
    statusDotY: 718,
    occlusionDepth: 772,
    preferredAgentIds: ["builder-agent", "agentos-operator"],
    actionLabel: "running local prompt",
    labelX: 560,
    labelY: 790,
    hitboxId: "local-ai-console"
  },
  {
    stationId: "memory-browser",
    stationName: "Memory Browser",
    role: "recall",
    seatX: 170,
    seatY: 690,
    standX: 145,
    standY: 740,
    workFacing: "right",
    workSurfaceX: 170,
    workSurfaceY: 690,
    statusDotX: 220,
    statusDotY: 690,
    occlusionDepth: 744,
    preferredAgentIds: ["product-agent"],
    actionLabel: "saving memory",
    labelX: 90,
    labelY: 766,
    hitboxId: "knowledge-memory-station"
  },
  {
    stationId: "discord-comms",
    stationName: "Discord Comms",
    role: "mobile status",
    seatX: 135,
    seatY: 500,
    standX: 118,
    standY: 548,
    workFacing: "right",
    workSurfaceX: 140,
    workSurfaceY: 508,
    statusDotX: 190,
    statusDotY: 506,
    occlusionDepth: 552,
    preferredAgentIds: ["agentos-operator"],
    actionLabel: "posting status",
    labelX: 75,
    labelY: 578,
    hitboxId: "discord-comms-station"
  },
  {
    stationId: "token-credit-manager",
    stationName: "Token Credit Manager",
    role: "budget watch",
    seatX: 1142,
    seatY: 716,
    standX: 1125,
    standY: 760,
    workFacing: "left",
    workSurfaceX: 1148,
    workSurfaceY: 710,
    statusDotX: 1198,
    statusDotY: 706,
    occlusionDepth: 764,
    preferredAgentIds: ["security-agent"],
    actionLabel: "watching budget",
    labelX: 1068,
    labelY: 790,
    hitboxId: "finance-token-station"
  }
];

export const officeAgentRoster: OfficeAgentVisual[] = [
  {
    agentId: "agentos-operator",
    name: "AgentOS Operator",
    role: "Operator",
    homeStationId: "operator-command-ring",
    portraitKey: "portrait-briefing",
    tint: 0xd6efff,
    mode: "thinking",
    statusText: "routing room",
    patrolStationIds: ["operator-command-ring", "mission-board-stand", "discord-comms"]
  },
  {
    agentId: "product-agent",
    name: "Product Agent",
    role: "Product",
    homeStationId: "product-agent-desk",
    portraitKey: "portrait-online",
    tint: 0xf2d18a,
    mode: "thinking",
    statusText: "shaping brief",
    patrolStationIds: ["product-agent-desk", "mission-board-stand", "memory-browser"]
  },
  {
    agentId: "builder-agent",
    name: "Builder Agent",
    role: "Builder",
    homeStationId: "builder-agent-desk",
    portraitKey: "portrait-thinking",
    tint: 0x8ed8ff,
    mode: "working",
    statusText: "building task",
    patrolStationIds: ["builder-agent-desk", "local-ai-console"]
  },
  {
    agentId: "qa-agent",
    name: "QA Agent",
    role: "QA",
    homeStationId: "qa-agent-desk",
    portraitKey: "portrait-blocked",
    tint: 0xaaffc8,
    mode: "reviewing",
    statusText: "checking logs",
    patrolStationIds: ["qa-agent-desk", "mission-board-stand"]
  },
  {
    agentId: "security-agent",
    name: "Security Agent",
    role: "Security",
    homeStationId: "security-agent-desk",
    portraitKey: "portrait-online",
    tint: 0xffd0a4,
    mode: "idle",
    statusText: "watching gates",
    patrolStationIds: ["security-agent-desk", "approval-gates", "token-credit-manager"]
  }
];

export const demoMissionVisualSteps: DemoMissionVisualStep[] = [
  {
    agentId: "product-agent",
    stationId: "mission-board-stand",
    mode: "thinking",
    statusText: "briefing plan",
    delayMs: 0
  },
  {
    agentId: "builder-agent",
    stationId: "local-ai-console",
    mode: "working",
    statusText: "drafting demo",
    delayMs: 1200
  },
  {
    agentId: "qa-agent",
    stationId: "qa-agent-desk",
    mode: "reviewing",
    statusText: "checking flow",
    delayMs: 2500
  },
  {
    agentId: "security-agent",
    stationId: "approval-gates",
    mode: "reviewing",
    statusText: "safe to show",
    delayMs: 3700
  },
  {
    agentId: "agentos-operator",
    stationId: "operator-command-ring",
    mode: "working",
    statusText: "running mission",
    delayMs: 4800
  },
  {
    agentId: "product-agent",
    stationId: "memory-browser",
    mode: "working",
    statusText: "saving notes",
    delayMs: 6100
  }
];

export const panelLabels: Record<string, string> = {
  AgentPanel: "Agent",
  TaskPanel: "Tasks",
  MissionBoardPanel: "Missions",
  MemoryPanel: "Memory",
  TokenManagerPanel: "Token Manager",
  SystemHealthPanel: "System Health",
  ApprovalPanel: "Approvals",
  LogsPanel: "Logs",
  DiscordPanel: "Discord",
  SettingsPanel: "Settings",
  LocalAIConsolePanel: "Local AI"
};
