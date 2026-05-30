import {
  calculateUsageSummary,
  defaultAgents,
  defaultApprovals,
  defaultAuditEvents,
  defaultBudgets,
  defaultMemories,
  defaultTasks,
  defaultUsageEvents,
  nowIso,
  type AgentTask,
  type ApprovalRecord,
  type AuditEvent,
  type MemoryRecord,
  type UsageBudget,
  type UsageEvent
} from "@agentos/shared";

export const store = {
  agents: structuredClone(defaultAgents),
  tasks: structuredClone(defaultTasks),
  memories: structuredClone(defaultMemories),
  usageEvents: structuredClone(defaultUsageEvents),
  budgets: structuredClone(defaultBudgets),
  approvals: structuredClone(defaultApprovals),
  auditEvents: structuredClone(defaultAuditEvents),
  runs: [
    {
      id: "run-seed",
      taskId: "task-command-center",
      agentId: "builder-agent",
      status: "running",
      steps: ["plan accepted", "scaffold started", "mock checks queued"],
      createdAt: nowIso()
    }
  ]
};

export const createTask = (input: Partial<AgentTask>) => {
  const task: AgentTask = {
    id: `task-${Date.now()}`,
    title: input.title ?? "Untitled AgentOS task",
    description: input.description ?? "Created from the AgentOS dashboard.",
    status: input.status ?? "inbox",
    assignedAgentId: input.assignedAgentId,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  store.tasks.unshift(task);
  addAudit("task.created", "dashboard", `Created task: ${task.title}`);
  return task;
};

export const addUsageEvent = (event: Omit<UsageEvent, "id" | "createdAt">) => {
  const usage: UsageEvent = {
    ...event,
    id: `usage-${Date.now()}`,
    createdAt: nowIso()
  };
  store.usageEvents.unshift(usage);
  addAudit("usage.recorded", "token-manager", `Recorded ${usage.totalTokens} mock tokens.`);
  return usage;
};

export const addBudget = (budget: Omit<UsageBudget, "id">) => {
  const created: UsageBudget = {
    ...budget,
    id: `budget-${Date.now()}`
  };
  store.budgets.unshift(created);
  addAudit("budget.created", "token-manager", `Created ${created.scope} budget.`);
  return created;
};

export const resolveApproval = (id: string, status: ApprovalRecord["status"]) => {
  const approval = store.approvals.find((item) => item.id === id);
  if (!approval) return undefined;
  approval.status = status;
  approval.resolvedAt = nowIso();
  addAudit(`approval.${status}`, "operator", `${status} ${approval.tool}.`);
  return approval;
};

export const addAudit = (event: string, actor: string, summary: string) => {
  const audit: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    event,
    actor,
    summary,
    createdAt: nowIso()
  };
  store.auditEvents.unshift(audit);
  return audit;
};

export const usageSummary = () => calculateUsageSummary(store.usageEvents, store.budgets);

export type AppStore = typeof store;
