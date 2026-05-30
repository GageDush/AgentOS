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
  SettingsPanel: "Settings"
};
