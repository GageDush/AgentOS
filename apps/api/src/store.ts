import {
  calculateUsageSummary,
  defaultAgents,
  defaultApprovals,
  defaultAuditEvents,
  defaultBudgets,
  defaultDemoMission,
  defaultLoadout,
  defaultMemories,
  defaultMissionLogs,
  defaultMissionRuns,
  defaultMissions,
  defaultRoutines,
  defaultSessions,
  defaultTasks,
  defaultUsageEvents,
  nowIso,
  type AgentTask,
  type ApprovalRecord,
  type AuditEvent,
  type DemoMissionRun,
  type LoadoutItem,
  type MemoryRecord,
  type MissionRecord,
  type MissionRun,
  type MissionRunLog,
  type MissionRunLogLevel,
  type RoutineRecord,
  type SessionRecord,
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
  missions: structuredClone(defaultMissions),
  missionRuns: structuredClone(defaultMissionRuns),
  missionLogs: structuredClone(defaultMissionLogs),
  routines: structuredClone(defaultRoutines),
  loadout: structuredClone(defaultLoadout),
  sessions: structuredClone(defaultSessions),
  runs: []
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
  addAudit("usage.recorded", "token-manager", `Recorded ${usage.totalTokens} tokens.`, undefined, usage.runId);
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

export const resolveApproval = (id: string, status: ApprovalRecord["status"], scope?: ApprovalRecord["scope"]) => {
  const approval = store.approvals.find((item) => item.id === id);
  if (!approval) return undefined;
  approval.status = status;
  approval.scope = scope ?? approval.scope;
  approval.resolvedAt = nowIso();
  addAudit(`approval.${status}`, "operator", `${status} ${approval.tool}.`, approval.missionId, approval.runId);
  return approval;
};

export const createApproval = (input: Omit<ApprovalRecord, "id" | "createdAt" | "status">) => {
  const approval: ApprovalRecord = {
    ...input,
    id: `approval-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    status: "pending",
    createdAt: nowIso()
  };
  store.approvals.unshift(approval);
  addAudit(
    "approval.requested",
    input.agentId,
    `Requested ${input.permissionLevel} approval for ${input.tool}.`,
    input.missionId,
    input.runId
  );
  return approval;
};

export const addAudit = (event: string, actor: string, summary: string, missionId?: string, runId?: string) => {
  const audit: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    event,
    actor,
    summary,
    missionId,
    runId,
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

export const createMission = (input: Partial<MissionRecord>) => {
  const mission: MissionRecord = {
    id: `mission-${Date.now()}`,
    title: input.title ?? "Untitled mission",
    objective: input.objective ?? "Run a local-first agent mission.",
    prompt: input.prompt ?? input.objective ?? input.title ?? "Describe the next mission.",
    operatorId: input.operatorId ?? "agentos-operator",
    status: input.status ?? "draft",
    sandboxLevel: input.sandboxLevel ?? "safe_execute",
    command: input.command ?? "git status",
    commandPolicy: input.commandPolicy ?? "approval_required",
    provider: input.provider ?? "mock",
    model: input.model ?? "mock-agentos-local",
    latestRunId: input.latestRunId,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  store.missions.unshift(mission);
  addAudit("mission.created", mission.operatorId, `Created mission: ${mission.title}`, mission.id);
  return mission;
};

export const getMission = (id: string) => store.missions.find((item) => item.id === id);

export const updateMission = (id: string, updates: Partial<MissionRecord>) => {
  const mission = getMission(id);
  if (!mission) return undefined;
  Object.assign(mission, updates, { updatedAt: nowIso() });
  return mission;
};

export const createMissionRun = (input: Omit<MissionRun, "id" | "createdAt" | "updatedAt">) => {
  const run: MissionRun = {
    ...input,
    id: `run-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  store.missionRuns.unshift(run);
  const missionStatus =
    run.status === "completed"
      ? "completed"
      : run.status === "failed"
        ? "failed"
        : run.status === "denied"
          ? "denied"
          : run.status === "awaiting_approval"
            ? "awaiting_approval"
            : "running";
  updateMission(run.missionId, { latestRunId: run.id, status: missionStatus });
  addAudit("mission.run.created", run.operatorId, `Started run for mission ${run.missionId}.`, run.missionId, run.id);
  return run;
};

export const getMissionRun = (id: string) => store.missionRuns.find((item) => item.id === id);

export const updateMissionRun = (id: string, updates: Partial<MissionRun>) => {
  const run = getMissionRun(id);
  if (!run) return undefined;
  Object.assign(run, updates, { updatedAt: nowIso() });
  if (updates.status) {
    const missionStatus =
      updates.status === "completed"
        ? "completed"
        : updates.status === "failed"
          ? "failed"
          : updates.status === "denied"
            ? "denied"
            : updates.status === "awaiting_approval"
              ? "awaiting_approval"
              : "running";
    updateMission(run.missionId, { status: missionStatus });
  }
  return run;
};

export const appendMissionLog = (runId: string, level: MissionRunLogLevel, message: string) => {
  const log: MissionRunLog = {
    id: `run-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    runId,
    level,
    message,
    createdAt: nowIso()
  };
  store.missionLogs.push(log);
  return log;
};

export const getMissionLogs = (runId: string) => store.missionLogs.filter((item) => item.runId === runId);

export const createMissionResultMemory = (input: {
  missionId: string;
  runId: string;
  agentId: string;
  title: string;
  content: string;
  tags?: string[];
}) => {
  const memory: MemoryRecord = {
    id: `mem-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: "task_memory",
    title: input.title,
    content: input.content,
    source: "mission-run",
    missionId: input.missionId,
    runId: input.runId,
    agentId: input.agentId,
    tags: input.tags ?? ["mission", "run"],
    importance: 7,
    archived: false,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  store.memories.unshift(memory);
  return memory;
};

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

  createTask({
    title: "Demo mission briefing",
    description: "Walk through a safe multi-agent mission for the local demo.",
    prompt: "Summarize a safe, exciting AgentOS demo mission for friends and family.",
    assignedAgentId: "agentos-operator",
    status: "queued"
  });

  return mission;
};

export const completeDemoMission = (summary: string) => {
  store.demoMission.status = "complete";
  store.demoMission.updatedAt = nowIso();
  store.demoMission.steps = store.demoMission.steps.map((step) => ({ ...step, status: "complete" }));
  addAudit("mission.demo.completed", "reviewer-agent", summary);
  return store.demoMission;
};

export const listPendingApprovals = () => store.approvals.filter((item) => item.status === "pending");

export type AppStore = typeof store;
export type AppCollections = {
  missions: MissionRecord[];
  missionRuns: MissionRun[];
  missionLogs: MissionRunLog[];
  routines: RoutineRecord[];
  loadout: LoadoutItem[];
  sessions: SessionRecord[];
};
