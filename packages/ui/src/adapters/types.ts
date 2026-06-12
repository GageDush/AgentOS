export type ForgeAgentPresenceState =
  | "idle"
  | "working"
  | "waiting"
  | "reviewing"
  | "blocked"
  | "error"
  | "complete";

export type ForgeMissionStepStatus = "pending" | "active" | "complete" | "error";

export type ForgeMissionStepKind =
  | "queued"
  | "planning"
  | "reading_files"
  | "editing"
  | "running_commands"
  | "testing"
  | "awaiting_approval"
  | "complete"
  | "error";

export type ForgeGateChip = {
  gateId: string;
  status: "pass" | "warn" | "fail" | "pending" | "skipped";
  label?: string;
};

export type ForgeMissionStep = {
  id: string;
  kind: ForgeMissionStepKind;
  label: string;
  status: ForgeMissionStepStatus;
  timestamp?: string;
  agentName?: string;
  details?: string;
  artifactLinks?: Array<{ label: string; href: string }>;
  gateChips?: ForgeGateChip[];
};

export type ForgeActivityEvent = {
  id: string;
  timestamp: string;
  kind: "agent" | "file" | "command" | "tool" | "test" | "error" | "approval" | "artifact";
  agentName?: string;
  message: string;
  level?: "info" | "warn" | "error";
};

export type ForgeAgentPresence = {
  id: string;
  name: string;
  role: string;
  state: ForgeAgentPresenceState;
  avatarUrl?: string;
  accentColor?: string;
  currentTask?: string;
  activeTool?: string;
  lastAction?: string;
  permissionLevel?: string;
  progress?: number;
  confidence?: number;
};

export type ForgeApprovalItem = {
  id: string;
  requestingAgent: string;
  requestedAction: string;
  reason?: string;
  riskLevel: string;
  affectedScope?: string;
  runId?: string;
};

export type ForgeHealthMetric = {
  id: string;
  label: string;
  value: string;
  status: "ok" | "warn" | "error" | "idle";
};

export type ForgeQuickAction = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  importance?: "primary" | "secondary" | "default";
};

export type ForgeNavItem = {
  id: string;
  label: string;
  href: string;
  active?: boolean;
};

export type ForgeStatusChip = {
  id: string;
  label: string;
  value: string;
  status?: "ok" | "warn" | "error" | "idle";
};

export type InspectSelection = {
  componentLabel?: string;
  domPath?: string;
  screenshotCrop?: string;
  surroundingCode?: string;
  userInstruction?: string;
};

export type ForgeCommandItem = {
  id: string;
  label: string;
  description?: string;
  category: "recent" | "suggested" | "slash" | "agent" | "integration";
  keywords?: string[];
};

export type ForgeIntegrationItem = {
  id: string;
  name: string;
  description: string;
  status: "connected" | "mock" | "offline";
  icon?: string;
};

export type ForgeMissionControlData = {
  missionTitle?: string;
  missionObjective?: string;
  command?: string;
  runId?: string;
  runStatus?: string;
  phase?: string;
  progress?: number;
  primaryAgentName?: string;
  supportingAgentNames?: string[];
  provider?: string;
  model?: string;
  sandboxLevel?: string;
  startedAt?: string;
  elapsedMs?: number;
  requiredGates?: string[];
  activeTools?: string[];
  commandOutput?: string;
  artifacts?: Array<{ label: string; href?: string }>;
};

export type GeneratedAppViewport = "desktop" | "tablet" | "mobile";

export type ForgeStatCardData = {
  id: string;
  label: string;
  value: string;
  caption: string;
  accent?: boolean;
  featured?: boolean;
};
