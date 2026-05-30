import {
  calculateUsageSummary,
  defaultAgents,
  defaultApprovals,
  defaultAuditEvents,
  defaultBudgets,
  defaultDemoMission,
  defaultMemories,
  defaultTasks,
  defaultUsageEvents,
  nowIso,
  type DemoMissionRun,
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
  demoMission: structuredClone(defaultDemoMission),
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
    prompt: input.prompt ?? input.description ?? input.title ?? "Create a new AgentOS task.",
    status: input.status ?? "queued",
    assignedAgentId: input.assignedAgentId,
    result: input.result,
    error: input.error,
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

export const getTask = (id: string) => store.tasks.find((item) => item.id === id);

export const updateTask = (id: string, updates: Partial<AgentTask>) => {
  const task = getTask(id);
  if (!task) return undefined;
  Object.assign(task, updates, { updatedAt: nowIso() });
  return task;
};

export const startTask = (id: string) => updateTask(id, { status: "running", error: undefined });

export const completeTask = (id: string, result: string) =>
  updateTask(id, {
    status: "complete",
    result,
    error: undefined
  });

export const failTask = (id: string, error: string) =>
  updateTask(id, {
    status: "failed",
    error
  });

export const runDemoMission = (): DemoMissionRun => {
  const mission = store.demoMission;
  mission.status = "running";
  mission.updatedAt = nowIso();
  mission.steps = mission.steps.map((step, index) => {
    if (index < mission.steps.length - 1) {
      return { ...step, status: "complete" };
    }
    return { ...step, status: "running" };
  });

  addAudit("mission.demo.started", "agentos-operator", `Started demo mission: ${mission.title}`);

  const task = createTask({
    title: "Demo mission briefing",
    description: "Walk through a safe multi-agent mission for the local demo.",
    prompt: "Summarize a safe, exciting AgentOS demo mission for friends and family.",
    assignedAgentId: "agentos-operator",
    status: "queued"
  });

  return {
    ...mission,
    updatedAt: task.updatedAt
  };
};

export const completeDemoMission = (summary: string) => {
  store.demoMission.status = "complete";
  store.demoMission.updatedAt = nowIso();
  store.demoMission.steps = store.demoMission.steps.map((step) => ({ ...step, status: "complete" }));
  addAudit("mission.demo.completed", "reviewer-agent", summary);
  return store.demoMission;
};

export type AppStore = typeof store;
