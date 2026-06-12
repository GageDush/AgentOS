import type {
  AgentProfile,
  AgentRoutingDecisionRecord,
  ApprovalRecord,
  AuditEvent,
  MissionRecord,
  MissionRun,
  MissionRunLog,
  QuickActionRecord
} from "@agentos/shared";
import {
  listExecutedAgentIdsFromAudits,
  listExecutedAgentIdsFromMetadata,
  resolveAgentDisplayName,
  resolveCanonicalAgentId
} from "@agentos/shared";
import type {
  ForgeActivityEvent,
  ForgeAgentPresence,
  ForgeAgentPresenceState,
  ForgeApprovalItem,
  ForgeCommandItem,
  ForgeHealthMetric,
  ForgeMissionControlData,
  ForgeMissionStep,
  ForgeMissionStepStatus,
  ForgeQuickAction,
  ForgeStatCardData
} from "@agentos/ui";
import { agentAccentColor, agentAvatarUrl } from "../../lib/agent-avatars";

type DashboardSystem = {
  api: string;
  worker: string;
  gateway: string;
  discordMode: string;
  providerMode: string;
};

export function mapAgentPresenceState(
  status: AgentProfile["status"],
  runStatus?: MissionRun["status"]
): ForgeAgentPresenceState {
  if (runStatus === "awaiting_approval") return "waiting";
  if (status === "idle" || status === "offline") return "idle";
  if (status === "thinking" || status === "working" || status === "deploying") return "working";
  if (status === "reviewing") return "reviewing";
  if (status === "blocked") return "blocked";
  if (status === "error") return "error";
  if (status === "done") return "complete";
  return "idle";
}

export function toHealthMetrics(input: {
  system: DashboardSystem;
  agents: AgentProfile[];
  runs: MissionRun[];
  pendingApprovals: number;
}): ForgeHealthMetric[] {
  const queued = input.runs.filter((r) => r.status === "queued").length;
  const activeAgents = input.agents.filter((a) => a.status !== "offline" && a.status !== "idle").length;

  return [
    { id: "server", label: "Local Server", value: input.system.api, status: input.system.api === "online" ? "ok" : "error" },
    { id: "agents", label: "Active Agents", value: String(activeAgents), status: activeAgents > 0 ? "ok" : "idle" },
    { id: "queue", label: "Queue", value: String(queued), status: queued > 0 ? "warn" : "ok" },
    { id: "api", label: "API", value: input.system.api, status: input.system.api === "online" ? "ok" : "error" },
    { id: "memory", label: "Memory Sync", value: "local", status: "ok" },
    { id: "approvals", label: "Pending Approvals", value: String(input.pendingApprovals), status: input.pendingApprovals > 0 ? "warn" : "ok" }
  ];
}

function resolveAgentName(agents: AgentProfile[] | undefined, id?: string) {
  if (!id) return undefined;
  const canonical = resolveCanonicalAgentId(id);
  const fromList =
    agents?.find((agent) => agent.id === id)?.name ??
    agents?.find((agent) => agent.id === canonical)?.name;
  return fromList ?? resolveAgentDisplayName(id);
}

export function resolveExecutedAgentIds(input: {
  route?: AgentRoutingDecisionRecord;
  audits?: AuditEvent[];
  runId?: string;
}): string[] {
  const fromRoute = input.route?.executedAgentIds ?? listExecutedAgentIdsFromMetadata(input.route?.metadata);
  if (fromRoute.length > 0) return fromRoute;
  if (input.audits?.length && input.runId) {
    return listExecutedAgentIdsFromAudits(input.audits, input.runId);
  }
  return [];
}

export function toMissionControlData(input: {
  mission?: MissionRecord;
  run?: MissionRun;
  route?: AgentRoutingDecisionRecord;
  logs: MissionRunLog[];
  tools?: string[];
  agents?: AgentProfile[];
  audits?: AuditEvent[];
}): ForgeMissionControlData {
  const executedAgentIds = resolveExecutedAgentIds({
    route: input.route,
    audits: input.audits,
    runId: input.run?.id
  });
  const executedAgentNames = executedAgentIds.map((id) => resolveAgentName(input.agents, id) ?? id);
  const lastOutput = input.logs
    .filter((l) => l.level === "stdout" || l.level === "stderr" || l.level === "result")
    .slice(-6)
    .map((l) => l.message)
    .join("\n");

  const progress =
    input.run?.status === "completed"
      ? 100
      : input.run?.status === "running"
        ? 65
        : input.run?.status === "awaiting_approval"
          ? 45
          : input.run?.status === "planning"
            ? 20
            : 10;

  const startedAt = input.run?.startedAt;
  const elapsedMs =
    startedAt && input.run?.completedAt
      ? new Date(input.run.completedAt).getTime() - new Date(startedAt).getTime()
      : startedAt
        ? Date.now() - new Date(startedAt).getTime()
        : undefined;

  return {
    missionTitle: input.mission?.title,
    missionObjective: input.mission?.objective,
    command: input.mission?.command ?? input.run?.requestedCommand,
    runId: input.run?.id,
    runStatus: input.run?.status,
    phase: executedAgentIds[0] ?? input.route?.selectedPrimaryAgentId ?? input.run?.status,
    progress,
    primaryAgentName: executedAgentNames[0] ?? resolveAgentName(input.agents, input.route?.selectedPrimaryAgentId),
    supportingAgentNames: executedAgentNames.slice(1),
    provider: input.run?.provider ?? input.mission?.provider,
    model: input.run?.model ?? input.mission?.model,
    sandboxLevel: input.mission?.sandboxLevel,
    startedAt,
    elapsedMs,
    requiredGates: input.route?.requiredGates,
    activeTools: input.tools ?? executedAgentIds,
    commandOutput: lastOutput || input.run?.resultSummary || input.run?.error,
    artifacts: input.run?.resultSummary
      ? [{ label: "Run Summary", href: `#run-${input.run.id}` }]
      : []
  };
}

export function toActivityFeed(audit: AuditEvent[], logs: MissionRunLog[]): ForgeActivityEvent[] {
  const auditEvents: ForgeActivityEvent[] = audit.map((event) => ({
    id: event.id,
    timestamp: event.createdAt,
    kind: event.event.includes("approval") ? "approval" : "agent",
    agentName: event.actor,
    message: event.summary,
    level: event.event.includes("denied") ? "error" : "info"
  }));

  const logEvents: ForgeActivityEvent[] = logs.map((log) => ({
    id: log.id,
    timestamp: log.createdAt,
    kind:
      log.level === "approval"
        ? "approval"
        : log.level === "exec"
          ? "command"
          : log.level === "stdout" || log.level === "stderr"
            ? "command"
            : log.level === "result"
              ? "artifact"
              : log.level === "plan"
                ? "agent"
                : "tool",
    message: log.message,
    level: log.level === "stderr" ? "error" : "info"
  }));

  return [...auditEvents, ...logEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 40);
}

export function toAgentPresences(
  agents: AgentProfile[],
  activeRun?: MissionRun,
  route?: AgentRoutingDecisionRecord,
  audits?: AuditEvent[]
): ForgeAgentPresence[] {
  const executedIds = new Set(
    resolveExecutedAgentIds({ route, audits, runId: activeRun?.id }).map((id) => resolveCanonicalAgentId(id))
  );
  const showExecutedOnly = executedIds.size > 0;

  return agents
    .filter((agent) => !showExecutedOnly || executedIds.has(resolveCanonicalAgentId(agent.id)))
    .map((agent) => {
      const canonical = resolveCanonicalAgentId(agent.id);
      const executedIndex = [...executedIds].indexOf(canonical);
      const isPrimary = executedIndex === 0;
      const isSupporting = executedIndex > 0;

      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        state: mapAgentPresenceState(agent.status, isPrimary || isSupporting ? activeRun?.status : undefined),
        avatarUrl: agentAvatarUrl(agent.id),
        accentColor: agentAccentColor(agent.id),
        currentTask: isPrimary || isSupporting ? activeRun?.requestedCommand : agent.currentTaskId,
        activeTool: isPrimary ? canonical : undefined,
        lastAction: agent.skills[0],
        permissionLevel: isPrimary ? "mission-scoped" : isSupporting ? "mission-scoped" : "observe",
        progress: agent.workload,
        confidence: isPrimary ? 82 : isSupporting ? 70 : 60
      };
    });
}

type GateResultChip = {
  gateId: string;
  status: "pass" | "fail";
  summary?: string;
};

export function toMissionTimeline(
  run?: MissionRun,
  logs: MissionRunLog[] = [],
  gateResults: GateResultChip[] = []
): ForgeMissionStep[] {
  const steps: ForgeMissionStep[] = [
    { id: "queued", kind: "queued", label: "Queued", status: "pending" },
    { id: "planning", kind: "planning", label: "Planning", status: "pending" },
    { id: "reading", kind: "reading_files", label: "Reading Files", status: "pending" },
    { id: "editing", kind: "editing", label: "Editing", status: "pending" },
    { id: "commands", kind: "running_commands", label: "Running Commands", status: "pending" },
    { id: "testing", kind: "testing", label: "Testing", status: "pending" },
    { id: "approval", kind: "awaiting_approval", label: "Awaiting Approval", status: "pending" },
    { id: "complete", kind: "complete", label: "Complete", status: "pending" }
  ];

  if (!run) return steps;

  const statusOrder: MissionRun["status"][] = [
    "queued",
    "planning",
    "running",
    "awaiting_approval",
    "paused",
    "completed",
    "failed",
    "denied"
  ];
  const runIndex = statusOrder.indexOf(run.status);

  const setStatus = (id: string, status: ForgeMissionStepStatus, timestamp?: string, details?: string) => {
    const step = steps.find((s) => s.id === id);
    if (step) {
      step.status = status;
      step.timestamp = timestamp;
      step.details = details;
    }
  };

  if (runIndex >= 0) setStatus("queued", "complete", run.startedAt);
  if (runIndex >= 1) setStatus("planning", run.status === "planning" ? "active" : "complete");
  if (logs.some((l) => l.message.toLowerCase().includes("read"))) setStatus("reading", "complete");
  if (run.status === "running") {
    setStatus("commands", "active");
    setStatus("planning", "complete");
  }
  if (run.status === "awaiting_approval" || run.status === "paused") {
    setStatus("approval", "active", undefined, "Operator decision required at Control Gate.");
    setStatus("planning", "complete");
    setStatus("commands", "complete");
  }
  if (run.status === "completed") {
    steps.forEach((s) => {
      if (s.id !== "complete") s.status = "complete";
    });
    setStatus("complete", "complete", run.completedAt, run.resultSummary);
  }
  if (run.status === "failed" || run.status === "denied") {
    setStatus("complete", "error", run.completedAt, run.error ?? run.lastError);
  }

  if (gateResults.length) {
    const testing = steps.find((s) => s.id === "testing");
    if (testing) {
      testing.gateChips = gateResults.map((gate) => ({
        gateId: gate.gateId,
        status: gate.status === "pass" ? "pass" : "fail",
        label: gate.gateId
      }));
      if (gateResults.some((gate) => gate.status === "fail")) {
        testing.status = "error";
        testing.details = gateResults.find((gate) => gate.status === "fail")?.summary ?? "A completion gate failed.";
      } else if (gateResults.every((gate) => gate.status === "pass")) {
        testing.status = testing.status === "pending" ? "complete" : testing.status;
      }
    }
  }

  return steps;
}

export function toApprovalItems(approvals: ApprovalRecord[]): ForgeApprovalItem[] {
  return approvals.map((approval) => ({
    id: approval.id,
    requestingAgent: approval.agentId,
    requestedAction: approval.command ?? approval.inputSummary,
    reason: approval.inputSummary,
    riskLevel: approval.permissionLevel,
    affectedScope: approval.scope ?? approval.missionId,
    runId: approval.runId
  }));
}

export function toQuickActions(actions: QuickActionRecord[]): ForgeQuickAction[] {
  return actions.map((action) => ({
    id: action.id,
    label: action.label,
    description: action.actionType
  }));
}

export function buildDefaultQuickActions(): ForgeQuickAction[] {
  return [
    { id: "start-mission", label: "Start Mission", description: "Open missions compose surface", importance: "primary" },
    { id: "open-approvals", label: "Open Approvals", description: "Jump to Control Gate", importance: "primary" },
    { id: "run-tests", label: "Run Tests", description: "Execute frontend quality gate", importance: "secondary" },
    { id: "generate-ui", label: "Generate UI", description: "Scaffold AgentOS Forge surface", importance: "secondary" },
    { id: "review-diff", label: "Review Latest Diff", description: "Inspect recent code changes" },
    { id: "inspect-server", label: "Inspect Server", description: "Check API health" },
    { id: "sync-memory", label: "Sync Memory", description: "Refresh archive memory index" },
    { id: "deploy-preview", label: "Deploy Preview", description: "Launch local preview server" }
  ];
}

export function buildCommandPaletteItems(input: {
  quickActions: QuickActionRecord[];
  agents: AgentProfile[];
  recentMessages?: string[];
}): ForgeCommandItem[] {
  const slash: ForgeCommandItem[] = [
    { id: "slash-build", label: "/build landing page for project dashboard", category: "slash", description: "Generate a Forge dashboard surface" },
    { id: "slash-ask", label: "/ask @Reviewer check latest diff", category: "slash" },
    { id: "slash-tests", label: "/run tests on frontend", category: "slash" },
    { id: "slash-approvals", label: "/open approvals", category: "slash", keywords: ["control-gate"] },
    { id: "slash-deploy", label: "/deploy local preview", category: "slash" },
    { id: "slash-schedule", label: "/schedule daily repo summary", category: "slash" },
    { id: "slash-inspect", label: "/inspect server", category: "slash" },
    { id: "slash-sync", label: "/sync memory", category: "slash" }
  ];

  const suggested = toQuickActions(input.quickActions).map((action) => ({
    id: `qa-${action.id}`,
    label: action.label,
    description: action.description,
    category: "suggested" as const
  }));

  const agents = input.agents.map((agent) => ({
    id: `agent-${agent.id}`,
    label: `@${agent.name}`,
    description: agent.role,
    category: "agent" as const
  }));

  const recent = (input.recentMessages ?? []).map((message, index) => ({
    id: `recent-${index}`,
    label: message,
    category: "recent" as const
  }));

  return [...recent, ...suggested, ...slash, ...agents];
}

export function toDashboardStats(input: {
  missions: number;
  pendingApprovals: number;
  archive: number;
  sessions: number;
}): ForgeStatCardData[] {
  return [
    {
      id: "missions",
      label: "Missions",
      value: String(input.missions),
      caption: "One-off agent jobs with run history."
    },
    {
      id: "approvals",
      label: "Approvals",
      value: String(input.pendingApprovals),
      caption: "Control Gate requests waiting on an operator.",
      accent: input.pendingApprovals > 0,
      featured: input.pendingApprovals > 0
    },
    {
      id: "archive",
      label: "Archive",
      value: String(input.archive),
      caption: "Saved mission outputs and decision memory."
    },
    {
      id: "sessions",
      label: "Sessions",
      value: String(input.sessions),
      caption: "Long-running local work that can be resumed."
    }
  ];
}
