import type { DemoMissionVisualStep, OfficeAgentVisual } from "@agentos/game-schema";

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
