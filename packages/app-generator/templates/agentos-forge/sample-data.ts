import type {
  ForgeActivityEvent,
  ForgeAgentPresence,
  ForgeApprovalItem,
  ForgeHealthMetric,
  ForgeIntegrationItem,
  ForgeMissionControlData,
  ForgeMissionStep,
  ForgeQuickAction
} from "@agentos/ui";

export const sampleHealth: ForgeHealthMetric[] = [
  { id: "server", label: "Local Server", value: "online", status: "ok" },
  { id: "agents", label: "Active Agents", value: "3", status: "ok" },
  { id: "queue", label: "Queue", value: "1", status: "warn" },
  { id: "api", label: "API", value: "online", status: "ok" },
  { id: "memory", label: "Memory Sync", value: "local", status: "ok" },
  { id: "approvals", label: "Pending Approvals", value: "1", status: "warn" }
];

export const sampleMissionControl: ForgeMissionControlData = {
  missionTitle: "Validate local quality gate",
  missionObjective: "Run typecheck and surface approval if sandbox elevation is required.",
  runId: "mission-run-seed",
  runStatus: "awaiting_approval",
  phase: "frontend-ui-agent",
  progress: 45,
  activeTools: ["Read", "Bash", "Grep"],
  commandOutput: "> pnpm typecheck\nChecking project references...",
  artifacts: [{ label: "Typecheck Log" }]
};

export const sampleActivity: ForgeActivityEvent[] = [
  { id: "1", timestamp: new Date().toISOString(), kind: "agent", agentName: "planner", message: "Partitioned frontend subtask." },
  { id: "2", timestamp: new Date().toISOString(), kind: "command", message: "pnpm typecheck requested" },
  { id: "3", timestamp: new Date().toISOString(), kind: "approval", message: "Sandbox elevation required for safe_execute." }
];

export const sampleAgents: ForgeAgentPresence[] = [
  { id: "a1", name: "Implementer", role: "Code changes", state: "working", currentTask: "Wire Forge dashboard", progress: 72 },
  { id: "a2", name: "Reviewer", role: "Diff review", state: "waiting", lastAction: "Awaiting diff" },
  { id: "a3", name: "QA", role: "Verification", state: "idle" }
];

export const sampleTimeline: ForgeMissionStep[] = [
  { id: "1", kind: "queued", label: "Queued", status: "complete", timestamp: new Date().toISOString() },
  { id: "2", kind: "planning", label: "Planning", status: "complete" },
  { id: "3", kind: "running_commands", label: "Running Commands", status: "active" },
  { id: "4", kind: "awaiting_approval", label: "Awaiting Approval", status: "active" },
  { id: "5", kind: "complete", label: "Complete", status: "pending" }
];

export const sampleApprovals: ForgeApprovalItem[] = [
  {
    id: "approval-1",
    requestingAgent: "code-implementer",
    requestedAction: "pnpm typecheck",
    reason: "Validate repository before mission completion.",
    riskLevel: "safe_execute",
    affectedScope: "workspace"
  }
];

export const sampleQuickActions: ForgeQuickAction[] = [
  { id: "start", label: "Start Mission", description: "Compose a new local mission" },
  { id: "tests", label: "Run Tests", description: "Execute quality gate" },
  { id: "approvals", label: "Open Approvals", description: "Review sandbox requests" }
];

export const sampleIntegrations: ForgeIntegrationItem[] = [
  { id: "discord", name: "Discord", description: "Operator notifications and control", status: "mock" },
  { id: "github", name: "GitHub", description: "Issues and PR linkage", status: "mock" },
  { id: "ollama", name: "Ollama", description: "Local model runtime", status: "connected" }
];
