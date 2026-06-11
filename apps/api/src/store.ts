import { getPersistenceAdapter } from "@agentos/persistence";
import {
  calculateUsageSummary,
  nowIso,
  type AgentTask,
  type ApprovalRecord,
  type AuditEvent,
  type ChatMessageRecord,
  type ChatThreadRecord,
  type MemoryRecord,
  type MissionRecord,
  type MissionRun,
  type MissionRunLog,
  type QuickActionRecord,
  type RoutineRecord,
  type SessionRecord,
  type UsageBudget,
  type UsageEvent
} from "@agentos/shared";
import type { AgentOSDatabase } from "@agentos/persistence";

const persistence = getPersistenceAdapter();

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

// Compatibility note:
// - Task CRUD, demo-mission helpers, generic partial mission/run edits, and budgets remain on mutate()
//   for now because they are low-churn local/dev surfaces or still rely on broad patch-style updates.
// - Operator-facing mission/run/chat/approval/session/quick-action persistence below prefers repository
//   methods or transaction bundles so the hosting path is exercised by default.
function mutate<T>(mutator: (database: AgentOSDatabase) => T) {
  return persistence.mutate(mutator);
}

function snapshot() {
  return persistence.snapshot();
}

function addAuditInternal(database: AgentOSDatabase, event: string, actor: string, summary: string, missionId?: string, runId?: string) {
  const audit: AuditEvent = {
    id: makeId("audit"),
    workspaceId: database.workspaces[0].id,
    event,
    actor,
    summary,
    missionId,
    runId,
    createdAt: nowIso()
  };
  database.auditEvents.unshift(audit);
  return audit;
}

export const store = {
  get workspaces() {
    return snapshot().workspaces;
  },
  get operators() {
    return snapshot().operators;
  },
  get agents() {
    return snapshot().agents;
  },
  get tasks() {
    return snapshot().tasks;
  },
  get memories() {
    return snapshot().memories;
  },
  get usageEvents() {
    return snapshot().usageEvents;
  },
  get budgets() {
    return snapshot().budgets;
  },
  get approvals() {
    return snapshot().approvals;
  },
  get auditEvents() {
    return snapshot().auditEvents;
  },
  get demoMission() {
    return snapshot().demoMission;
  },
  get missions() {
    return snapshot().missions;
  },
  get missionRuns() {
    return snapshot().missionRuns;
  },
  get missionLogs() {
    return snapshot().missionLogs;
  },
  get routines() {
    return snapshot().routines;
  },
  get loadout() {
    return snapshot().loadout;
  },
  get sessions() {
    return snapshot().sessions;
  },
  get routingDecisions() {
    return snapshot().routingDecisions;
  },
  get chatThreads() {
    return snapshot().chatThreads;
  },
  get chatMessages() {
    return snapshot().chatMessages;
  },
  get quickActions() {
    return snapshot().quickActions;
  }
};

export const getDatabaseSnapshot = snapshot;

export const createTask = (input: Partial<AgentTask>) =>
  mutate((database) => {
    const task: AgentTask = {
      id: makeId("task"),
      workspaceId: database.workspaces[0].id,
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
    database.tasks.unshift(task);
    addAuditInternal(database, "task.created", "dashboard", `Created task: ${task.title}`);
    return task;
  });

export const addUsageEvent = (event: Omit<UsageEvent, "id" | "createdAt">) =>
  persistence.appendUsageEvent({
    ...event,
    workspaceId: event.workspaceId ?? persistence.getOrCreateDefaultWorkspace().id
  });

export const addBudget = (budget: Omit<UsageBudget, "id">) =>
  mutate((database) => {
    const created: UsageBudget = {
      ...budget,
      workspaceId: budget.workspaceId ?? database.workspaces[0].id,
      id: makeId("budget")
    };
    database.budgets.unshift(created);
    addAuditInternal(database, "budget.created", "token-manager", `Created ${created.scope} budget.`);
    return created;
  });

export const resolveApproval = (id: string, status: ApprovalRecord["status"], scope?: ApprovalRecord["scope"]) =>
  persistence.resolveApprovalRequest(id, status, scope);

export const createApproval = (input: Omit<ApprovalRecord, "id" | "createdAt" | "status">) =>
  persistence.createApprovalRequest(input);

export const addAudit = (event: string, actor: string, summary: string, missionId?: string, runId?: string) =>
  mutate((database) => addAuditInternal(database, event, actor, summary, missionId, runId));

export const usageSummary = () => {
  const database = snapshot();
  return calculateUsageSummary(database.usageEvents, database.budgets);
};

export const getTask = (id: string) => snapshot().tasks.find((item) => item.id === id);

export const updateTask = (id: string, updates: Partial<AgentTask>) =>
  mutate((database) => {
    const task = database.tasks.find((item) => item.id === id);
    if (!task) return undefined;
    Object.assign(task, updates, { updatedAt: nowIso() });
    return task;
  });

export const startTask = (id: string) => updateTask(id, { status: "running", error: undefined });
export const completeTask = (id: string, result: string) => updateTask(id, { status: "complete", result, error: undefined });
export const failTask = (id: string, error: string) => updateTask(id, { status: "failed", error });

export const createMission = (input: Partial<MissionRecord>) =>
  persistence.createMission(input);

export const getMission = (id: string) => snapshot().missions.find((item) => item.id === id);

export const updateMission = (id: string, updates: Partial<MissionRecord>) =>
  mutate((database) => {
    const mission = database.missions.find((item) => item.id === id);
    if (!mission) return undefined;
    Object.assign(mission, updates, { updatedAt: nowIso() });
    return mission;
  });

export const createMissionRun = (input: Omit<MissionRun, "id" | "createdAt" | "updatedAt">) =>
  persistence.createMissionRun(input);

export const getMissionRun = (id: string) => snapshot().missionRuns.find((item) => item.id === id);

export const updateMissionRun = (id: string, updates: Partial<MissionRun>) =>
  mutate((database) => {
    const run = database.missionRuns.find((item) => item.id === id);
    if (!run) return undefined;
    Object.assign(run, updates, { updatedAt: nowIso() });
    return run;
  });

export const appendMissionLog = (runId: string, level: MissionRunLog["level"], message: string) =>
  persistence.appendMissionLog(runId, level, message);

export const getMissionLogs = (runId: string) => snapshot().missionLogs.filter((item) => item.runId === runId);

export const getRoutine = (id: string) => persistence.getRoutineById(id);

export const createRoutine = (input: Partial<RoutineRecord>) =>
  persistence.createRoutine(input);

export const updateRoutine = (id: string, updates: Partial<RoutineRecord>) => persistence.updateRoutine(id, updates);

export const getSession = (id: string) => persistence.getSessionById(id);

export const createSession = (input: Partial<SessionRecord>) =>
  persistence.createSession(input);

export const updateSession = (id: string, updates: Partial<SessionRecord>) => persistence.updateSession(id, updates);

export const ensureSessionForMission = (mission: MissionRecord) => {
  const database = snapshot();
  if (mission.sessionId) {
    return database.sessions.find((session) => session.id === mission.sessionId) ?? createSession({
      workspaceId: mission.workspaceId,
      requestedByOperatorId: mission.requestedByOperatorId,
      title: `${mission.title} session`,
      missionId: mission.id,
      operatorId: mission.operatorId,
      summary: `Tracking ${mission.title}.`
    });
  }
  const existing = database.sessions.find((session) => session.missionId === mission.id);
  if (existing) {
    updateMission(mission.id, { sessionId: existing.id });
    return existing;
  }
  const created = createSession({
    workspaceId: mission.workspaceId,
    requestedByOperatorId: mission.requestedByOperatorId,
    title: `${mission.title} session`,
    missionId: mission.id,
    operatorId: mission.operatorId,
    summary: `Tracking ${mission.title}.`
  });
  updateMission(mission.id, { sessionId: created.id });
  return created;
};

export const createMissionResultMemory = (input: {
  missionId: string;
  runId: string;
  agentId: string;
  title: string;
  content: string;
  tags?: string[];
}) =>
  persistence.createArchiveEntry({
    type: "task_memory",
    title: input.title,
    content: input.content,
    source: "mission-run",
    missionId: input.missionId,
    runId: input.runId,
    agentId: input.agentId,
    tags: input.tags ?? ["mission", "run"],
    importance: 7,
    archived: false
  });

export const runDemoMission = () =>
  mutate((database) => {
    database.demoMission.status = "running";
    database.demoMission.updatedAt = nowIso();
    database.demoMission.steps = database.demoMission.steps.map((step, index) => {
      if (index < database.demoMission.steps.length - 1) {
        return { ...step, status: "complete" };
      }
      return { ...step, status: "running" };
    });
    addAuditInternal(database, "mission.demo.started", "agentos-operator", `Started demo mission: ${database.demoMission.title}`);
    return database.demoMission;
  });

export const completeDemoMission = (summary: string) =>
  mutate((database) => {
    database.demoMission.status = "complete";
    database.demoMission.updatedAt = nowIso();
    database.demoMission.steps = database.demoMission.steps.map((step) => ({ ...step, status: "complete" }));
    addAuditInternal(database, "mission.demo.completed", "reviewer-agent", summary);
    return database.demoMission;
  });

export const listPendingApprovals = () => snapshot().approvals.filter((item) => item.status === "pending");

export const getChatThread = (id: string) => snapshot().chatThreads.find((thread) => thread.id === id);
export const listChatThreads = () => persistence.listChatThreads();
export const listChatMessages = (threadId: string) => persistence.listChatMessages(threadId);

export const createChatThread = (input: Partial<ChatThreadRecord>) =>
  persistence.createChatThread(input);

export const createChatMessage = (input: Omit<ChatMessageRecord, "id" | "workspaceId" | "createdAt">) =>
  (() => {
    const exchange = persistence.appendChatExchangeBundle({
      threadId: input.threadId,
      userMessage: input.role === "user" ? input : undefined,
      assistantMessage: input.role === "assistant" || input.role === "system" ? input : undefined,
      audit: {
        event: "chat.message_received",
        actor: input.operatorId ?? "system",
        summary: input.content,
        missionId: input.missionId,
        runId: input.runId,
        correlationId: input.correlationId,
        metadata: input.metadata
      }
    });
    return exchange.userMessage ?? exchange.assistantMessage ?? persistence.appendChatMessage(input);
  })();

export const listQuickActions = () => snapshot().quickActions;
export const getQuickAction = (id: string) => snapshot().quickActions.find((action) => action.id === id);

export const persistMemory = (input: Omit<MemoryRecord, "id" | "workspaceId" | "createdAt" | "updatedAt">) =>
  persistence.createArchiveEntry(input);

export const archiveMemoryEntry = (id: string) => persistence.archiveMemoryEntry(id);

export const createQuickAction = (input: Omit<QuickActionRecord, "id" | "workspaceId" | "createdAt">) =>
  persistence.createQuickAction(input);

export const consumeQuickAction = (id: string, operatorId: string) => persistence.consumeQuickAction(id, operatorId);
