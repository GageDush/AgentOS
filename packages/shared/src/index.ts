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
  status: TaskStatus;
  assignedAgentId?: string;
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

export type ApprovalRecord = {
  id: string;
  agentId: string;
  tool: string;
  inputSummary: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
  resolvedAt?: string;
};

export type AuditEvent = {
  id: string;
  event: string;
  actor: string;
  summary: string;
  createdAt: string;
};

export type SystemHealth = {
  api: "online" | "offline";
  worker: "online" | "offline";
  gateway: "online" | "offline";
  discordMode: "mock" | "real";
  providerMode: "mock" | "real";
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
    role: "Implements code in supervised mock-mode runs.",
    status: "working",
    workload: 72,
    currentTaskId: "task-command-center",
    skills: ["implementation", "refactor", "debugging"]
  },
  {
    id: "qa-agent",
    name: "QA Agent",
    role: "Runs tests and browser checks.",
    status: "blocked",
    workload: 58,
    skills: ["test plans", "regression", "screenshots"]
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
  },
  {
    id: "release-agent",
    name: "Release Agent",
    role: "Prepares deploy notes and rollout checklists.",
    status: "offline",
    workload: 0,
    skills: ["release", "versioning", "rollout"]
  }
];

export const defaultTasks: AgentTask[] = [
  {
    id: "task-command-center",
    title: "Build the AgentOS Command Center MVP",
    description: "Create mock-mode dashboard, API, memory, token usage, approvals, and Discord controls.",
    status: "building",
    assignedAgentId: "builder-agent",
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "task-asset-pass",
    title: "Prepare Phaser-ready game assets",
    description: "Slice concept sheets into clean transparent sprites, atlases, and interaction metadata.",
    status: "planning",
    assignedAgentId: "product-agent",
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
    tool: "terminal.run",
    inputSummary: "Run local checks after scaffold creation.",
    status: "pending",
    createdAt: nowIso()
  }
];

export const defaultAuditEvents: AuditEvent[] = [
  {
    id: "audit-seed",
    event: "system.seeded",
    actor: "AgentOS",
    summary: "Mock-mode seed data loaded.",
    createdAt: nowIso()
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
