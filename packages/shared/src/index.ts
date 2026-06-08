export type AgentStatus =
  | "idle"
  | "thinking"
  | "working"
  | "blocked"
  | "reviewing"
  | "deploying"
  | "done"
  | "error"
  | "offline";

export type AgentProfile = {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  workload: number;
  currentTaskId?: string;
  skills: string[];
};

export type TaskStatus =
  | "inbox"
  | "planning"
  | "building"
  | "testing"
  | "review"
  | "waiting_approval"
  | "done";

export type AgentTask = {
  id: string;
  title: string;
  description: string;
  prompt?: string;
  status: TaskStatus | "queued" | "running" | "complete" | "failed";
  assignedAgentId?: string;
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type MemoryType =
  | "project_memory"
  | "agent_memory"
  | "task_memory"
  | "user_preference"
  | "tool_result"
  | "document_chunk"
  | "decision_log"
  | "error_pattern";

export type MemoryRecord = {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  source: string;
  projectId?: string;
  agentId?: string;
  taskId?: string;
  missionId?: string;
  runId?: string;
  tags: string[];
  importance: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UsageEvent = {
  id: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  agentId?: string;
  taskId?: string;
  runId?: string;
  createdAt: string;
};

export type UsageBudget = {
  id: string;
  scope: "global" | "provider" | "model" | "agent" | "task";
  scopeId?: string;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  warningThresholdPercent: number;
  hardStopEnabled: boolean;
};

export type SandboxPermissionLevel =
  | "observe"
  | "workspace_write"
  | "safe_execute"
  | "network_limited"
  | "dependency_install"
  | "external_action"
  | "repo_mutation"
  | "system_elevated";

export type ApprovalScope = "once" | "mission";

export type ApprovalRecord = {
  id: string;
  agentId: string;
  missionId?: string;
  sessionId?: string;
  runId?: string;
  tool: string;
  permissionLevel: SandboxPermissionLevel;
  inputSummary: string;
  status: "pending" | "approved" | "denied";
  scope?: ApprovalScope;
  command?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type AuditEvent = {
  id: string;
  event: string;
  actor: string;
  summary: string;
  missionId?: string;
  runId?: string;
  createdAt: string;
};

export type SystemHealth = {
  api: "online" | "offline";
  worker: "online" | "offline";
  gateway: "online" | "offline";
  discordMode: "mock" | "real";
  providerMode: "mock" | "real";
};

export type LlmProviderId = "mock" | "ollama" | "cloud-stub";

export type LlmChatRequest = {
  prompt: string;
  model?: string;
  agentId?: string;
  saveMemory?: boolean;
};

export type LlmChatResponse = {
  ok: true;
  provider: LlmProviderId;
  model: string;
  response: string;
  durationMs: number;
  savedMemoryId?: string;
};

export type DemoMissionStep = {
  id: string;
  agentId: string;
  status: "queued" | "running" | "complete";
  summary: string;
};

export type DemoMissionRun = {
  id: string;
  title: string;
  status: "idle" | "running" | "complete";
  steps: DemoMissionStep[];
  createdAt: string;
  updatedAt: string;
};

export type MissionCommandPolicy = "auto_allowed" | "approval_required" | "denied";

export type MissionRunLogLevel = "system" | "plan" | "approval" | "exec" | "stdout" | "stderr" | "result";

export type MissionRunLog = {
  id: string;
  runId: string;
  level: MissionRunLogLevel;
  message: string;
  createdAt: string;
};

export type MissionRunStatus =
  | "queued"
  | "planning"
  | "awaiting_approval"
  | "running"
  | "completed"
  | "failed"
  | "denied";

export type MissionRun = {
  id: string;
  missionId: string;
  sessionId?: string;
  operatorId: string;
  provider: LlmProviderId;
  model: string;
  status: MissionRunStatus;
  commandPolicy: MissionCommandPolicy;
  requestedCommand?: string;
  approvalRequestId?: string;
  resultSummary?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MissionStatus = "draft" | "queued" | "running" | "awaiting_approval" | "completed" | "failed" | "denied";

export type MissionRecord = {
  id: string;
  title: string;
  objective: string;
  prompt: string;
  operatorId: string;
  sessionId?: string;
  status: MissionStatus;
  sandboxLevel: SandboxPermissionLevel;
  command: string;
  commandPolicy: MissionCommandPolicy;
  provider: LlmProviderId;
  model: string;
  latestRunId?: string;
  createdAt: string;
  updatedAt: string;
};

export type RoutineFrequency = "manual" | "hourly" | "daily" | "weekly";

export type RoutineRecord = {
  id: string;
  title: string;
  objective: string;
  prompt: string;
  command: string;
  sandboxLevel: SandboxPermissionLevel;
  provider: LlmProviderId;
  model: string;
  frequency: RoutineFrequency;
  enabled: boolean;
  status: "idle" | "scheduled" | "running" | "paused";
  latestRunId?: string;
  lastRunAt?: string;
  nextRunAt?: string;
};

export type LoadoutItem = {
  id: string;
  name: string;
  kind: "local_model" | "command_policy" | "integration" | "tooling";
  status: "ready" | "mock" | "disabled";
  summary: string;
};

export type SessionRecord = {
  id: string;
  title: string;
  missionId?: string;
  operatorId: string;
  status: "active" | "paused" | "complete" | "failed";
  summary: string;
  latestRunId?: string;
  resumedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type GatewayExecutionRequest = {
  command: string;
  missionId?: string;
  runId?: string;
};

export type GatewayExecutionResult = {
  ok: boolean;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export const nowIso = () => new Date().toISOString();

export const defaultAgents: AgentProfile[] = [
  {
    id: "agentos-operator",
    name: "AgentOS Operator",
    role: "Routes tasks, coordinates the team, and manages approvals.",
    status: "thinking",
    workload: 48,
    currentTaskId: "task-command-center",
    skills: ["routing", "planning", "risk triage"]
  },
  {
    id: "product-agent",
    name: "Product Agent",
    role: "Turns ideas into specs and acceptance criteria.",
    status: "idle",
    workload: 24,
    skills: ["prd", "requirements", "user stories"]
  },
  {
    id: "architect-agent",
    name: "Architect Agent",
    role: "Designs system architecture, APIs, and data flow.",
    status: "reviewing",
    workload: 36,
    skills: ["architecture", "schema", "interfaces"]
  },
  {
    id: "builder-agent",
    name: "Builder Agent",
    role: "Implements code in supervised local runs.",
    status: "working",
    workload: 72,
    currentTaskId: "task-command-center",
    skills: ["implementation", "refactor", "debugging"]
  },
  {
    id: "qa-agent",
    name: "QA Agent",
    role: "Runs tests and verification sweeps.",
    status: "blocked",
    workload: 58,
    skills: ["test plans", "regression", "checks"]
  },
  {
    id: "security-agent",
    name: "Security Agent",
    role: "Reviews approvals, secrets, and risky tools.",
    status: "idle",
    workload: 33,
    skills: ["approval gates", "audit", "permissions"]
  },
  {
    id: "reviewer-agent",
    name: "Reviewer Agent",
    role: "Reviews diffs and implementation quality.",
    status: "idle",
    workload: 18,
    skills: ["review", "risk notes", "maintainability"]
  },
  {
    id: "docs-agent",
    name: "Docs Agent",
    role: "Maintains docs, runbooks, and release notes.",
    status: "done",
    workload: 12,
    skills: ["readme", "runbooks", "changelog"]
  }
];

export const defaultTasks: AgentTask[] = [
  {
    id: "task-command-center",
    title: "Pivot AgentOS into a local-first AI dev hub",
    description: "Replace the office-first demo surface with a mission-first command center.",
    prompt: "Refactor AgentOS into a serious local-first developer operations hub.",
    status: "building",
    assignedAgentId: "builder-agent",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const defaultMemories: MemoryRecord[] = [
  {
    id: "mem-local-first",
    type: "project_memory",
    title: "Local-first MVP rule",
    content: "AgentOS must run in mock mode without external API keys before real providers are added.",
    source: "project blueprint",
    tags: ["mvp", "local", "mock"],
    importance: 9,
    archived: false,
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "mem-safety",
    type: "decision_log",
    title: "Approval gates before power tools",
    content: "Risky actions require explicit approval and audit records before any real execution.",
    source: "project blueprint",
    tags: ["approval", "audit", "safety"],
    importance: 10,
    archived: false,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const defaultBudgets: UsageBudget[] = [
  {
    id: "budget-global",
    scope: "global",
    dailyLimitUsd: 2,
    monthlyLimitUsd: 20,
    warningThresholdPercent: 80,
    hardStopEnabled: true
  }
];

export const defaultUsageEvents: UsageEvent[] = [
  {
    id: "usage-seed-1",
    provider: "mock",
    model: "mock-agentos-local",
    promptTokens: 1200,
    completionTokens: 360,
    totalTokens: 1560,
    estimatedCostUsd: 0,
    agentId: "agentos-operator",
    taskId: "task-command-center",
    runId: "run-seed",
    createdAt: nowIso()
  }
];

export const defaultApprovals: ApprovalRecord[] = [
  {
    id: "approval-terminal-run",
    agentId: "builder-agent",
    missionId: "mission-seed-local-checks",
    sessionId: "session-seed",
    runId: "mission-run-seed",
    tool: "command.execute",
    permissionLevel: "safe_execute",
    inputSummary: "Run local checks after scaffold creation.",
    status: "pending",
    scope: "once",
    command: "pnpm typecheck",
    createdAt: nowIso()
  }
];

export const defaultAuditEvents: AuditEvent[] = [
  {
    id: "audit-seed",
    event: "system.seeded",
    actor: "AgentOS",
    summary: "Local-first seed data loaded.",
    createdAt: nowIso()
  }
];

export const defaultDemoMission: DemoMissionRun = {
  id: "demo-mission-seed",
  title: "Show friends the AgentOS command center",
  status: "idle",
  steps: [
    { id: "step-planner", agentId: "product-agent", status: "queued", summary: "Planner prepares the mission brief." },
    { id: "step-coder", agentId: "builder-agent", status: "queued", summary: "Coder drafts the response." },
    { id: "step-reviewer", agentId: "reviewer-agent", status: "queued", summary: "Reviewer checks the result." },
    { id: "step-memory", agentId: "agentos-operator", status: "queued", summary: "Operator records memory and audit notes." }
  ],
  createdAt: nowIso(),
  updatedAt: nowIso()
};

export const defaultMissions: MissionRecord[] = [
  {
    id: "mission-seed-local-checks",
    title: "Run local quality checks",
    objective: "Validate the repository using safe local commands before a refactor lands.",
    prompt: "Review the repo state, summarize the check plan, then run pnpm typecheck.",
    operatorId: "builder-agent",
    sessionId: "session-seed",
    status: "awaiting_approval",
    sandboxLevel: "workspace_write",
    command: "pnpm typecheck",
    commandPolicy: "auto_allowed",
    provider: "mock",
    model: "mock-agentos-local",
    latestRunId: "mission-run-seed",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const defaultMissionRuns: MissionRun[] = [
  {
    id: "mission-run-seed",
    missionId: "mission-seed-local-checks",
    sessionId: "session-seed",
    operatorId: "builder-agent",
    provider: "mock",
    model: "mock-agentos-local",
    status: "awaiting_approval",
    commandPolicy: "approval_required",
    requestedCommand: "pnpm typecheck",
    approvalRequestId: "approval-terminal-run",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const defaultMissionLogs: MissionRunLog[] = [
  {
    id: "mission-log-seed-1",
    runId: "mission-run-seed",
    level: "plan",
    message: "Prepared a safe local validation mission and paused at Control Gate.",
    createdAt: nowIso()
  }
];

export const defaultRoutines: RoutineRecord[] = [
  {
    id: "routine-nightly-scan",
    title: "Nightly Repository Scan",
    objective: "Run lint and type checks every evening in mock-first mode.",
    prompt: "Plan a nightly safe repository scan and summarize any local developer risk before execution.",
    command: "pnpm typecheck",
    sandboxLevel: "workspace_write",
    provider: "mock",
    model: "mock-agentos-local",
    frequency: "daily",
    enabled: false,
    status: "idle",
    nextRunAt: undefined
  },
  {
    id: "routine-ollama-health",
    title: "Ollama Readiness Check",
    objective: "Check whether Ollama is reachable and document the local model posture.",
    prompt: "Assess the Ollama endpoint and summarize whether the local provider is ready for a mission.",
    command: "git status",
    sandboxLevel: "observe",
    provider: "ollama",
    model: "qwen2.5-coder:7b",
    frequency: "manual",
    enabled: true,
    status: "scheduled"
  }
];

export const defaultLoadout: LoadoutItem[] = [
  {
    id: "loadout-local-provider",
    name: "Local Provider",
    kind: "local_model",
    status: "ready",
    summary: "Mock by default, Ollama when configured."
  },
  {
    id: "loadout-control-gate",
    name: "Control Gate Policy",
    kind: "command_policy",
    status: "ready",
    summary: "Approvals, audit trail, and safe command enforcement."
  },
  {
    id: "loadout-gateway",
    name: "Local Gateway",
    kind: "tooling",
    status: "ready",
    summary: "Safe command execution for allow-listed commands."
  }
];

export const defaultSessions: SessionRecord[] = [
  {
    id: "session-seed",
    title: "Command Center Pivot Session",
    missionId: "mission-seed-local-checks",
    operatorId: "builder-agent",
    status: "active",
    summary: "Pivoting AgentOS from demo office toward a mission-first local ops hub.",
    latestRunId: "mission-run-seed",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const calculateUsageSummary = (events: UsageEvent[], budgets: UsageBudget[]) => {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const dailySpend = events
    .filter((event) => event.createdAt.startsWith(today))
    .reduce((sum, event) => sum + event.estimatedCostUsd, 0);
  const monthlySpend = events
    .filter((event) => event.createdAt.startsWith(month))
    .reduce((sum, event) => sum + event.estimatedCostUsd, 0);
  const globalBudget = budgets.find((budget) => budget.scope === "global") ?? budgets[0];

  return {
    dailySpend,
    monthlySpend,
    dailyLimit: globalBudget?.dailyLimitUsd ?? 0,
    monthlyLimit: globalBudget?.monthlyLimitUsd ?? 0,
    hardStopEnabled: Boolean(globalBudget?.hardStopEnabled),
    warningThresholdPercent: globalBudget?.warningThresholdPercent ?? 80,
    totalTokens: events.reduce((sum, event) => sum + event.totalTokens, 0)
  };
};
