import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type {
  AgentOSRepository,
  AppendAuditInput,
  AppendUsageEventInput,
  ClaimRunOptions,
  ClaimRunResult,
  CompleteRunInput,
  CompleteRunBundleInput,
  CompleteRunBundleResult,
  ConsumeQuickActionBundleInput,
  ConsumeQuickActionBundleResult,
  CreateApprovalInput,
  CreateChatMessageInput,
  CreateChatThreadInput,
  CreateMissionInput,
  CreateMissionBundleInput,
  CreateMissionBundleResult,
  CreateMissionRunInput,
  CreateQuickActionInput,
  CreateApprovalRequestBundleInput,
  CreateApprovalRequestBundleResult,
  CreateRoutingDecisionInput,
  FailRunInput,
  FailRunBundleInput,
  FailRunBundleResult,
  QuickActionBlueprint,
  RecordRouteDecisionBundleInput,
  RecordRouteDecisionBundleResult,
  ReleaseRunLeaseInput
  ,
  ResolveApprovalDecisionBundleInput,
  ResolveApprovalDecisionBundleResult
} from "./repository";
import {
  defaultAgents,
  defaultApprovals,
  defaultAuditEvents,
  defaultBudgets,
  defaultChatMessages,
  defaultChatThreads,
  defaultDemoMission,
  defaultLoadout,
  defaultMemories,
  defaultMissionLogs,
  defaultMissionRuns,
  defaultMissions,
  defaultOperator,
  defaultQuickActions,
  defaultRoutingDecisions,
  defaultRoutines,
  defaultSessions,
  defaultTasks,
  defaultUsageEvents,
  defaultWorkspace,
  nowIso,
  type AgentProfile,
  type AgentRoutingDecisionRecord,
  type AgentTask,
  type ApprovalRecord,
  type AuditEvent,
  type ChatMessageRecord,
  type ChatThreadRecord,
  type DemoMissionRun,
  type LoadoutItem,
  type MemoryRecord,
  type MissionRecord,
  type MissionRun,
  type MissionRunLog,
  type OperatorRecord,
  type QuickActionRecord,
  type QuickActionType,
  type RoutineRecord,
  type SessionRecord,
  type UsageBudget,
  type UsageEvent,
  type WorkspaceRecord
} from "@agentos/shared";

export type AgentOSDatabase = {
  schemaVersion: number;
  initializedAt: string;
  workspaces: WorkspaceRecord[];
  operators: OperatorRecord[];
  agents: AgentProfile[];
  tasks: AgentTask[];
  memories: MemoryRecord[];
  usageEvents: UsageEvent[];
  budgets: UsageBudget[];
  approvals: ApprovalRecord[];
  auditEvents: AuditEvent[];
  demoMission: DemoMissionRun;
  missions: MissionRecord[];
  missionRuns: MissionRun[];
  missionLogs: MissionRunLog[];
  routines: RoutineRecord[];
  loadout: LoadoutItem[];
  sessions: SessionRecord[];
  routingDecisions: AgentRoutingDecisionRecord[];
  chatThreads: ChatThreadRecord[];
  chatMessages: ChatMessageRecord[];
  quickActions: QuickActionRecord[];
};

export interface PersistenceAdapter extends AgentOSRepository {
  readonly filePath: string;
  ensureInitialized(): void;
  reset(database?: AgentOSDatabase): void;
  snapshot(): AgentOSDatabase;
  mutate<T>(mutator: (database: AgentOSDatabase) => T): T;
}

export const CURRENT_SCHEMA_VERSION = 2;

const metaTable = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull()
});

const workspacesTable = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  mode: text("mode").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const operatorsTable = sqliteTable("operators", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  authMode: text("auth_mode").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const agentsTable = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull(),
  workload: integer("workload").notNull(),
  currentTaskId: text("current_task_id"),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const tasksTable = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  title: text("title").notNull(),
  status: text("status").notNull(),
  assignedAgentId: text("assigned_agent_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const memoriesTable = sqliteTable("memories", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  missionId: text("mission_id"),
  runId: text("run_id"),
  archived: integer("archived").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const usageEventsTable = sqliteTable("usage_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  agentId: text("agent_id"),
  taskId: text("task_id"),
  runId: text("run_id"),
  estimatedCostUsd: real("estimated_cost_usd").notNull(),
  createdAt: text("created_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const budgetsTable = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  scope: text("scope").notNull(),
  scopeId: text("scope_id"),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const approvalsTable = sqliteTable("approval_requests", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  requestedByOperatorId: text("requested_by_operator_id").notNull(),
  agentId: text("agent_id").notNull(),
  missionId: text("mission_id"),
  sessionId: text("session_id"),
  runId: text("run_id"),
  tool: text("tool").notNull(),
  permissionLevel: text("permission_level").notNull(),
  status: text("status").notNull(),
  scope: text("scope"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
  correlationId: text("correlation_id"),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const auditEventsTable = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  event: text("event").notNull(),
  actor: text("actor").notNull(),
  missionId: text("mission_id"),
  runId: text("run_id"),
  correlationId: text("correlation_id"),
  createdAt: text("created_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const demoMissionTable = sqliteTable("demo_mission", {
  id: text("id").primaryKey(),
  updatedAt: text("updated_at").notNull(),
  payloadJson: text("payload_json").notNull()
});

const missionsTable = sqliteTable("missions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  requestedByOperatorId: text("requested_by_operator_id").notNull(),
  title: text("title").notNull(),
  operatorId: text("operator_id").notNull(),
  sessionId: text("session_id"),
  status: text("status").notNull(),
  sandboxLevel: text("sandbox_level").notNull(),
  command: text("command").notNull(),
  commandPolicy: text("command_policy").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  latestRunId: text("latest_run_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const missionRunsTable = sqliteTable("mission_runs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  missionId: text("mission_id").notNull(),
  sessionId: text("session_id"),
  requestedByOperatorId: text("requested_by_operator_id").notNull(),
  operatorId: text("operator_id").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull(),
  commandPolicy: text("command_policy").notNull(),
  requestedCommand: text("requested_command"),
  approvalRequestId: text("approval_request_id"),
  routeDecisionId: text("route_decision_id"),
  claimedByWorkerId: text("claimed_by_worker_id"),
  claimedAt: text("claimed_at"),
  leaseExpiresAt: text("lease_expires_at"),
  attemptCount: integer("attempt_count"),
  retryCount: integer("retry_count"),
  lastError: text("last_error"),
  resultSummary: text("result_summary"),
  error: text("error"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  correlationId: text("correlation_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const missionLogsTable = sqliteTable("mission_logs", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  level: text("level").notNull(),
  createdAt: text("created_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const routinesTable = sqliteTable("routines", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  requestedByOperatorId: text("requested_by_operator_id").notNull(),
  title: text("title").notNull(),
  frequency: text("frequency").notNull(),
  enabled: integer("enabled").notNull(),
  status: text("status").notNull(),
  latestRunId: text("latest_run_id"),
  lastRunAt: text("last_run_at"),
  nextRunAt: text("next_run_at"),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const loadoutTable = sqliteTable("loadout", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const sessionsTable = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  requestedByOperatorId: text("requested_by_operator_id").notNull(),
  missionId: text("mission_id"),
  operatorId: text("operator_id").notNull(),
  status: text("status").notNull(),
  latestRunId: text("latest_run_id"),
  resumedAt: text("resumed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const routingDecisionsTable = sqliteTable("agent_routing_decisions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  missionId: text("mission_id").notNull(),
  runId: text("run_id"),
  taskType: text("task_type").notNull(),
  complexity: text("complexity").notNull(),
  riskLevel: text("risk_level").notNull(),
  selectedPrimaryAgentId: text("selected_primary_agent_id").notNull(),
  providerLane: text("provider_lane").notNull(),
  routeConfidence: real("route_confidence").notNull(),
  createdAt: text("created_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const chatThreadsTable = sqliteTable("chat_threads", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  operatorId: text("operator_id").notNull(),
  title: text("title").notNull(),
  scope: text("scope").notNull(),
  missionId: text("mission_id"),
  runId: text("run_id"),
  approvalRequestId: text("approval_request_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const chatMessagesTable = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  threadId: text("thread_id").notNull(),
  role: text("role").notNull(),
  operatorId: text("operator_id"),
  missionId: text("mission_id"),
  runId: text("run_id"),
  approvalRequestId: text("approval_request_id"),
  intentType: text("intent_type"),
  askHuman: integer("ask_human"),
  correlationId: text("correlation_id"),
  createdAt: text("created_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const quickActionsTable = sqliteTable("quick_actions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  missionId: text("mission_id"),
  runId: text("run_id"),
  approvalRequestId: text("approval_request_id"),
  label: text("label").notNull(),
  emoji: text("emoji").notNull(),
  actionType: text("action_type").notNull(),
  riskLevel: text("risk_level").notNull(),
  expiresAt: text("expires_at"),
  consumedAt: text("consumed_at"),
  consumedByOperatorId: text("consumed_by_operator_id"),
  correlationId: text("correlation_id"),
  createdAt: text("created_at").notNull(),
  sortOrder: integer("sort_order").notNull(),
  payloadJson: text("payload_json").notNull()
});

const orderedTables = [
  "workspaces",
  "operators",
  "agents",
  "tasks",
  "memories",
  "usage_events",
  "budgets",
  "approval_requests",
  "audit_events",
  "missions",
  "mission_runs",
  "mission_logs",
  "routines",
  "loadout",
  "sessions",
  "agent_routing_decisions",
  "chat_threads",
  "chat_messages",
  "quick_actions",
  "demo_mission",
  "meta"
] as const;

export const buildSeedDatabase = (): AgentOSDatabase => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  initializedAt: nowIso(),
  workspaces: structuredClone([defaultWorkspace]),
  operators: structuredClone([defaultOperator]),
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
  routingDecisions: structuredClone(defaultRoutingDecisions),
  chatThreads: structuredClone(defaultChatThreads),
  chatMessages: structuredClone(defaultChatMessages),
  quickActions: structuredClone(defaultQuickActions)
});

export function findRepoRoot(startDir = process.cwd()) {
  let current = resolve(startDir);
  while (true) {
    if (existsSync(join(current, ".agentos", "agent-registry.json"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(startDir);
    current = parent;
  }
}

export function resolveAgentOSDataPath(rootDir = findRepoRoot()) {
  return process.env.AGENTOS_DATA_PATH || join(rootDir, ".agentos", "state", "agentos-local.db");
}

export function resolveLegacyAgentOSJsonPath(rootDir = findRepoRoot()) {
  return process.env.AGENTOS_JSON_FALLBACK_PATH || join(rootDir, ".agentos", "state", "agentos-local.json");
}

function ensureParentDirectory(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

function writeJsonAtomically(path: string, database: AgentOSDatabase) {
  ensureParentDirectory(path);
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, JSON.stringify(database, null, 2), "utf8");
  renameSync(tempPath, path);
}

function parseRowPayload<T>(payloadJson: string): T {
  return JSON.parse(payloadJson) as T;
}

function normalizeDatabase(database: Partial<AgentOSDatabase> | undefined): AgentOSDatabase {
  const seeded = buildSeedDatabase();
  const next = {
    ...seeded,
    ...database
  } as AgentOSDatabase;

  next.schemaVersion = CURRENT_SCHEMA_VERSION;
  next.initializedAt = next.initializedAt ?? seeded.initializedAt;
  next.workspaces = next.workspaces?.length ? next.workspaces : structuredClone([defaultWorkspace]);
  next.operators = next.operators?.length ? next.operators : structuredClone([defaultOperator]);
  next.agents = next.agents ?? structuredClone(defaultAgents);
  next.tasks = next.tasks ?? [];
  next.memories = next.memories ?? [];
  next.usageEvents = next.usageEvents ?? [];
  next.budgets = next.budgets?.length ? next.budgets : structuredClone(defaultBudgets);
  next.approvals = next.approvals ?? [];
  next.auditEvents = next.auditEvents ?? [];
  next.demoMission = next.demoMission ?? structuredClone(defaultDemoMission);
  next.missions = next.missions ?? [];
  next.missionRuns = next.missionRuns ?? [];
  next.missionLogs = next.missionLogs ?? [];
  next.routines = next.routines ?? [];
  next.loadout = next.loadout ?? structuredClone(defaultLoadout);
  next.sessions = next.sessions ?? [];
  next.routingDecisions = next.routingDecisions ?? [];
  next.chatThreads = next.chatThreads?.length ? next.chatThreads : structuredClone(defaultChatThreads);
  next.chatMessages = next.chatMessages ?? [];
  next.quickActions = next.quickActions ?? [];
  next.missionRuns = next.missionRuns.map((run) => ({
    attemptCount: run.attemptCount ?? 0,
    retryCount: run.retryCount ?? 0,
    ...run
  }));
  return next;
}

function loadJsonDatabase(path: string) {
  return normalizeDatabase(JSON.parse(readFileSync(path, "utf8")) as Partial<AgentOSDatabase>);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function missionStatusFromRunStatus(status: MissionRun["status"]): MissionRecord["status"] {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "denied") return "denied";
  if (status === "paused") return "paused";
  if (status === "awaiting_approval") return "awaiting_approval";
  return "running";
}

function isExpired(timestamp?: string) {
  return Boolean(timestamp && Date.parse(timestamp) <= Date.now());
}

function addAuditToDatabase(
  database: AgentOSDatabase,
  event: string,
  actor: string,
  summary: string,
  missionId?: string,
  runId?: string,
  correlationId?: string,
  metadata?: Record<string, unknown>
) {
  const audit: AuditEvent = {
    id: makeId("audit"),
    workspaceId: database.workspaces[0]?.id ?? defaultWorkspace.id,
    event,
    actor,
    summary,
    missionId,
    runId,
    correlationId,
    metadata,
    createdAt: nowIso()
  };
  database.auditEvents.unshift(audit);
  return audit;
}

function appendMissionLogToDatabase(
  database: AgentOSDatabase,
  runId: string,
  level: MissionRunLog["level"],
  message: string
) {
  const log: MissionRunLog = {
    id: makeId("run-log"),
    runId,
    level,
    message,
    createdAt: nowIso()
  };
  database.missionLogs.push(log);
  return log;
}

function createQuickActionInDatabase(
  database: AgentOSDatabase,
  input: QuickActionBlueprint,
  workspaceId?: string
) {
  const existing = database.quickActions.find(
    (action) =>
      action.actionType === input.actionType &&
      action.missionId === input.missionId &&
      action.runId === input.runId &&
      action.approvalRequestId === input.approvalRequestId &&
      !action.consumedAt &&
      !isExpired(action.expiresAt)
  );
  if (existing) return existing;
  const action: QuickActionRecord = {
    id: makeId("quick"),
    workspaceId: workspaceId ?? database.workspaces[0]?.id ?? defaultWorkspace.id,
    createdAt: nowIso(),
    ...input
  };
  database.quickActions.unshift(action);
  return action;
}

function consumeQuickActionInDatabase(database: AgentOSDatabase, actionId: string, operatorId: string) {
  const action = database.quickActions.find((item) => item.id === actionId);
  if (!action || action.consumedAt) return undefined;
  action.consumedAt = nowIso();
  action.consumedByOperatorId = operatorId;
  return structuredClone(action);
}

function expireRelatedQuickActionsInDatabase(
  database: AgentOSDatabase,
  predicate: (action: QuickActionRecord) => boolean
) {
  const timestamp = nowIso();
  const expiredIds: string[] = [];
  database.quickActions.forEach((action) => {
    if (!action.consumedAt && !isExpired(action.expiresAt) && predicate(action)) {
      action.expiresAt = action.expiresAt ?? timestamp;
      expiredIds.push(action.id);
    }
  });
  return expiredIds;
}

function replaceRows(
  db: ReturnType<typeof drizzle>,
  table: object,
  rows: Record<string, unknown>[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db.delete(table as any).run();
  if (rows.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.insert(table as any).values(rows as any).run();
  }
}

function serializeRows<T extends { id: string }, TInsert extends Record<string, unknown>>(
  rows: T[],
  mapper: (row: T, index: number) => TInsert
): TInsert[] {
  return rows.map((row, index) => mapper(row, index));
}

export class JsonFilePersistenceAdapter implements PersistenceAdapter {
  constructor(public readonly filePath = resolveLegacyAgentOSJsonPath()) {
    this.ensureInitialized();
  }

  ensureInitialized() {
    if (!existsSync(this.filePath)) {
      writeJsonAtomically(this.filePath, buildSeedDatabase());
      return;
    }
    const current = loadJsonDatabase(this.filePath);
    writeJsonAtomically(this.filePath, current);
  }

  reset(database = buildSeedDatabase()) {
    writeJsonAtomically(this.filePath, normalizeDatabase(database));
  }

  snapshot(): AgentOSDatabase {
    return structuredClone(loadJsonDatabase(this.filePath));
  }

  mutate<T>(mutator: (database: AgentOSDatabase) => T): T {
    const database = loadJsonDatabase(this.filePath);
    const result = mutator(database);
    writeJsonAtomically(this.filePath, normalizeDatabase(database));
    return result;
  }

  getOrCreateDefaultWorkspace() {
    return this.mutate((database) => {
      if (!database.workspaces.length) {
        database.workspaces.push(structuredClone(defaultWorkspace));
      }
      return database.workspaces[0]!;
    });
  }

  listWorkspaces() {
    return this.snapshot().workspaces;
  }

  getOrCreateDefaultOperator() {
    return this.mutate((database) => {
      if (!database.operators.length) {
        database.operators.push(structuredClone(defaultOperator));
      }
      return database.operators[0]!;
    });
  }

  listOperators(workspaceId?: string) {
    return this.snapshot().operators.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  createMission(input: CreateMissionInput) {
    return this.mutate((database) => {
      const mission: MissionRecord = {
        id: makeId("mission"),
        workspaceId: input.workspaceId ?? this.getOrCreateDefaultWorkspace().id,
        requestedByOperatorId: input.requestedByOperatorId ?? this.getOrCreateDefaultOperator().id,
        title: input.title ?? "Untitled mission",
        objective: input.objective ?? "Run a local-first agent mission.",
        prompt: input.prompt ?? input.objective ?? input.title ?? "Describe the next mission.",
        operatorId: input.operatorId ?? "agentos-operator",
        sessionId: input.sessionId,
        activeThreadId: input.activeThreadId,
        status: input.status ?? "draft",
        sandboxLevel: input.sandboxLevel ?? "safe_execute",
        command: input.command ?? "git status",
        commandPolicy: input.commandPolicy ?? "approval_required",
        provider: input.provider ?? "mock",
        model: input.model ?? "mock-agentos-local",
        latestRunId: input.latestRunId,
        metadata: input.metadata,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      database.missions.unshift(mission);
      this.appendAuditEvent({
        event: "mission.created",
        actor: mission.operatorId,
        summary: `Created mission: ${mission.title}`,
        missionId: mission.id
      });
      return mission;
    });
  }

  getMissionById(id: string) {
    return this.snapshot().missions.find((item) => item.id === id);
  }

  listMissionsForWorkspace(workspaceId: string) {
    return this.snapshot().missions.filter((item) => item.workspaceId === workspaceId);
  }

  updateMissionStatus(id: string, status: MissionRecord["status"], updates?: Partial<MissionRecord>) {
    return this.mutate((database) => {
      const mission = database.missions.find((item) => item.id === id);
      if (!mission) return undefined;
      Object.assign(mission, updates ?? {}, { status, updatedAt: nowIso() });
      return mission;
    });
  }

  createMissionRun(input: CreateMissionRunInput) {
    return this.mutate((database) => {
      const run: MissionRun = {
        ...input,
        attemptCount: input.attemptCount ?? 0,
        retryCount: input.retryCount ?? 0,
        id: makeId("run"),
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      database.missionRuns.unshift(run);
      const mission = database.missions.find((item) => item.id === run.missionId);
      if (mission) {
        mission.latestRunId = run.id;
        mission.status = missionStatusFromRunStatus(run.status);
        mission.updatedAt = nowIso();
      }
      return run;
    });
  }

  getMissionRunById(id: string) {
    return this.snapshot().missionRuns.find((item) => item.id === id);
  }

  claimNextQueuedRun(options: ClaimRunOptions): ClaimRunResult {
    return this.mutate((database) => {
      const candidates = database.missionRuns.filter((run) => {
        if (options.specificRunId && run.id !== options.specificRunId) return false;
        const claimableStatus = run.status === "queued" || ((run.status === "planning" || run.status === "running") && isExpired(run.leaseExpiresAt));
        return claimableStatus && (run.attemptCount ?? 0) < options.maxAttempts;
      });
      const run = candidates[0];
      if (!run) return { ok: false, reason: "No claimable runs available.", runId: options.specificRunId } satisfies ClaimRunResult;
      const mission = database.missions.find((item) => item.id === run.missionId);
      if (!mission) return { ok: false, reason: "Mission not found.", runId: run.id } satisfies ClaimRunResult;
      const reclaimed = Boolean(run.claimedByWorkerId && isExpired(run.leaseExpiresAt));
      run.claimedByWorkerId = options.workerId;
      run.claimedAt = nowIso();
      run.leaseExpiresAt = new Date(Date.now() + options.leaseDurationMs).toISOString();
      run.attemptCount = (run.attemptCount ?? 0) + 1;
      run.status = "planning";
      run.startedAt ??= nowIso();
      run.lastError = undefined;
      mission.status = "running";
      mission.updatedAt = nowIso();
      this.appendAuditEvent({
        event: reclaimed ? "worker.reclaimed_run" : "worker.claimed_run",
        actor: options.workerId,
        summary: reclaimed ? `Worker reclaimed expired lease for ${run.id}.` : `Worker claimed ${run.id}.`,
        missionId: mission.id,
        runId: run.id
      });
      return { ok: true, run: structuredClone(run), mission: structuredClone(mission), reclaimed } satisfies ClaimRunResult;
    });
  }

  releaseRunLease(input: ReleaseRunLeaseInput) {
    return this.mutate((database) => {
      const run = database.missionRuns.find((item) => item.id === input.runId);
      if (!run) return undefined;
      run.claimedByWorkerId = undefined;
      run.claimedAt = undefined;
      run.leaseExpiresAt = undefined;
      run.updatedAt = nowIso();
      if (input.status) run.status = input.status;
      if (input.error) {
        run.error = input.error;
        run.lastError = input.error;
      }
      const mission = database.missions.find((item) => item.id === run.missionId);
      if (mission && input.missionStatus) {
        mission.status = input.missionStatus;
        mission.updatedAt = nowIso();
      }
      return run;
    });
  }

  failRun(input: FailRunInput) {
    return this.mutate((database) => {
      const run = database.missionRuns.find((item) => item.id === input.runId);
      const mission = database.missions.find((item) => item.id === input.missionId);
      if (!run || !mission) return undefined;
      run.status = input.status ?? "failed";
      run.error = input.error;
      run.lastError = input.error;
      run.completedAt = nowIso();
      run.claimedByWorkerId = undefined;
      run.claimedAt = undefined;
      run.leaseExpiresAt = undefined;
      run.updatedAt = nowIso();
      mission.status = input.missionStatus ?? missionStatusFromRunStatus(run.status);
      mission.updatedAt = nowIso();
      return run;
    });
  }

  completeRun(input: CompleteRunInput) {
    return this.mutate((database) => {
      const run = database.missionRuns.find((item) => item.id === input.runId);
      const mission = database.missions.find((item) => item.id === input.missionId);
      if (!run || !mission) return undefined;
      run.status = "completed";
      run.resultSummary = input.summary;
      run.completedAt = nowIso();
      run.claimedByWorkerId = undefined;
      run.claimedAt = undefined;
      run.leaseExpiresAt = undefined;
      run.updatedAt = nowIso();
      mission.status = "completed";
      mission.latestRunId = run.id;
      mission.updatedAt = nowIso();
      if (input.stdout) this.appendMissionLog(run.id, "stdout", input.stdout);
      if (input.archiveEntry) {
        database.memories.unshift({
          ...input.archiveEntry,
          id: input.archiveEntry.id ?? makeId("archive"),
          workspaceId: input.archiveEntry.workspaceId ?? mission.workspaceId,
          createdAt: input.archiveEntry.createdAt ?? nowIso(),
          updatedAt: input.archiveEntry.updatedAt ?? nowIso()
        });
      }
      return run;
    });
  }

  appendMissionLog(runId: string, level: MissionRunLog["level"], message: string) {
    return this.mutate((database) => {
      const log: MissionRunLog = { id: makeId("run-log"), runId, level, message, createdAt: nowIso() };
      database.missionLogs.push(log);
      return log;
    });
  }

  listMissionLogs(runId: string) {
    return this.snapshot().missionLogs.filter((item) => item.runId === runId);
  }

  createApprovalRequest(input: CreateApprovalInput) {
    return this.mutate((database) => {
      const approval: ApprovalRecord = { ...input, id: makeId("approval"), status: "pending", createdAt: nowIso() };
      database.approvals.unshift(approval);
      return approval;
    });
  }

  resolveApprovalRequest(id: string, status: ApprovalRecord["status"], scope?: ApprovalRecord["scope"]) {
    return this.mutate((database) => {
      const approval = database.approvals.find((item) => item.id === id);
      if (!approval) return undefined;
      approval.status = status;
      approval.scope = scope ?? approval.scope;
      approval.resolvedAt = nowIso();
      return approval;
    });
  }

  listPendingApprovals() {
    return this.snapshot().approvals.filter((item) => item.status === "pending");
  }

  appendAuditEvent(input: AppendAuditInput) {
    return this.mutate((database) => {
      const audit: AuditEvent = {
        id: makeId("audit"),
        workspaceId: input.workspaceId ?? this.getOrCreateDefaultWorkspace().id,
        event: input.event,
        actor: input.actor,
        summary: input.summary,
        missionId: input.missionId,
        runId: input.runId,
        correlationId: input.correlationId,
        metadata: input.metadata,
        createdAt: nowIso()
      };
      database.auditEvents.unshift(audit);
      return audit;
    });
  }

  listAuditEvents(workspaceId?: string) {
    return this.snapshot().auditEvents.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  createArchiveEntry(input: Omit<MemoryRecord, "id" | "workspaceId" | "createdAt" | "updatedAt">) {
    return this.mutate((database) => {
      const memory: MemoryRecord = {
        id: makeId("mem"),
        workspaceId: this.getOrCreateDefaultWorkspace().id,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...input
      };
      database.memories.unshift(memory);
      return memory;
    });
  }

  archiveMemoryEntry(id: string) {
    return this.mutate((database) => {
      const memory = database.memories.find((item) => item.id === id);
      if (!memory) return undefined;
      memory.archived = true;
      memory.updatedAt = nowIso();
      return memory;
    });
  }

  createRoutine(input: Partial<RoutineRecord>) {
    return this.mutate((database) => {
      const routine: RoutineRecord = {
        id: makeId("routine"),
        workspaceId: input.workspaceId ?? this.getOrCreateDefaultWorkspace().id,
        requestedByOperatorId: input.requestedByOperatorId ?? this.getOrCreateDefaultOperator().id,
        title: input.title ?? "Untitled routine",
        objective: input.objective ?? "Run a scheduled local mission.",
        prompt: input.prompt ?? input.objective ?? "Plan a recurring local mission safely.",
        command: input.command ?? "pnpm typecheck",
        sandboxLevel: input.sandboxLevel ?? "workspace_write",
        provider: input.provider ?? "mock",
        model: input.model ?? "mock-agentos-local",
        frequency: input.frequency ?? "manual",
        enabled: input.enabled ?? true,
        status: input.status ?? "scheduled",
        latestRunId: input.latestRunId,
        lastRunAt: input.lastRunAt,
        nextRunAt: input.nextRunAt,
        metadata: input.metadata
      };
      database.routines.unshift(routine);
      return routine;
    });
  }

  getRoutineById(id: string) {
    return this.snapshot().routines.find((item) => item.id === id);
  }

  updateRoutine(id: string, updates: Partial<RoutineRecord>) {
    return this.mutate((database) => {
      const routine = database.routines.find((item) => item.id === id);
      if (!routine) return undefined;
      Object.assign(routine, updates);
      return routine;
    });
  }

  createSession(input: Partial<SessionRecord>) {
    return this.mutate((database) => {
      const session: SessionRecord = {
        id: makeId("session"),
        workspaceId: input.workspaceId ?? this.getOrCreateDefaultWorkspace().id,
        requestedByOperatorId: input.requestedByOperatorId ?? this.getOrCreateDefaultOperator().id,
        title: input.title ?? "Untitled session",
        missionId: input.missionId,
        operatorId: input.operatorId ?? "agentos-operator",
        status: input.status ?? "active",
        summary: input.summary ?? "Local mission session in progress.",
        latestRunId: input.latestRunId,
        resumedAt: input.resumedAt,
        metadata: input.metadata,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      database.sessions.unshift(session);
      return session;
    });
  }

  getSessionById(id: string) {
    return this.snapshot().sessions.find((item) => item.id === id);
  }

  updateSession(id: string, updates: Partial<SessionRecord>) {
    return this.mutate((database) => {
      const session = database.sessions.find((item) => item.id === id);
      if (!session) return undefined;
      Object.assign(session, updates, { updatedAt: nowIso() });
      return session;
    });
  }

  createRoutingDecision(input: CreateRoutingDecisionInput) {
    return this.mutate((database) => {
      database.routingDecisions.unshift(input);
      return input;
    });
  }

  listRoutingDecisionsForMission(missionId: string) {
    return this.snapshot().routingDecisions.filter((item) => item.missionId === missionId);
  }

  appendUsageEvent(input: AppendUsageEventInput) {
    return this.mutate((database) => {
      const event: UsageEvent = {
        ...input,
        workspaceId: input.workspaceId ?? this.getOrCreateDefaultWorkspace().id,
        id: makeId("usage"),
        createdAt: nowIso()
      };
      database.usageEvents.unshift(event);
      return event;
    });
  }

  listUsageEvents(workspaceId?: string) {
    return this.snapshot().usageEvents.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  listBudgets(workspaceId?: string) {
    return this.snapshot().budgets.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  createChatThread(input: CreateChatThreadInput) {
    return this.mutate((database) => {
      const thread: ChatThreadRecord = {
        id: makeId("thread"),
        workspaceId: input.workspaceId ?? this.getOrCreateDefaultWorkspace().id,
        operatorId: input.operatorId ?? this.getOrCreateDefaultOperator().id,
        title: input.title ?? "AgentOS Local Thread",
        scope: input.scope ?? "global",
        missionId: input.missionId,
        runId: input.runId,
        approvalRequestId: input.approvalRequestId,
        metadata: input.metadata,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      database.chatThreads.unshift(thread);
      return thread;
    });
  }

  appendChatMessage(input: CreateChatMessageInput) {
    return this.mutate((database) => {
      const message: ChatMessageRecord = {
        id: makeId("chat"),
        workspaceId: this.getOrCreateDefaultWorkspace().id,
        createdAt: nowIso(),
        ...input
      };
      database.chatMessages.push(message);
      return message;
    });
  }

  listChatThreads(workspaceId?: string) {
    return this.snapshot().chatThreads.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  listChatMessages(threadId: string) {
    return this.snapshot().chatMessages.filter((item) => item.threadId === threadId);
  }

  createQuickAction(input: CreateQuickActionInput) {
    return this.mutate((database) => {
      const existing = database.quickActions.find(
        (action) =>
          action.actionType === input.actionType &&
          action.missionId === input.missionId &&
          action.runId === input.runId &&
          action.approvalRequestId === input.approvalRequestId &&
          !action.consumedAt &&
          !isExpired(action.expiresAt)
      );
      if (existing) return existing;
      const action: QuickActionRecord = {
        id: makeId("quick"),
        workspaceId: this.getOrCreateDefaultWorkspace().id,
        createdAt: nowIso(),
        ...input
      };
      database.quickActions.unshift(action);
      return action;
    });
  }

  consumeQuickAction(id: string, operatorId: string) {
    return this.mutate((database) => {
      const action = database.quickActions.find((item) => item.id === id);
      if (!action || action.consumedAt) return undefined;
      action.consumedAt = nowIso();
      action.consumedByOperatorId = operatorId;
      this.appendAuditEvent({
        event: "quick_action.consumed",
        actor: operatorId,
        summary: `Consumed quick action ${action.label}.`,
        missionId: action.missionId,
        runId: action.runId
      });
      return action;
    });
  }

  findActiveQuickAction(scope: { missionId?: string; runId?: string; approvalRequestId?: string; actionType: QuickActionRecord["actionType"] }) {
    return this.snapshot().quickActions.find(
      (action) =>
        action.actionType === scope.actionType &&
        action.missionId === scope.missionId &&
        action.runId === scope.runId &&
        action.approvalRequestId === scope.approvalRequestId &&
        !action.consumedAt &&
        !isExpired(action.expiresAt)
    );
  }

  listQuickActions(workspaceId?: string) {
    return this.snapshot().quickActions.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  createMissionBundle(input: CreateMissionBundleInput) {
    return this.mutate((database) => {
      const workspace = database.workspaces[0] ?? structuredClone(defaultWorkspace);
      const operator = database.operators[0] ?? structuredClone(defaultOperator);
      if (!database.workspaces.length) database.workspaces.push(workspace);
      if (!database.operators.length) database.operators.push(operator);
      const timestamp = nowIso();
      const mission: MissionRecord = {
        id: input.mission.id ?? makeId("mission"),
        workspaceId: input.mission.workspaceId ?? workspace.id,
        requestedByOperatorId: input.mission.requestedByOperatorId ?? operator.id,
        title: input.mission.title ?? "Untitled mission",
        objective: input.mission.objective ?? "Run a local-first agent mission.",
        prompt: input.mission.prompt ?? input.mission.objective ?? input.mission.title ?? "Describe the next mission.",
        operatorId: input.mission.operatorId ?? "agentos-operator",
        sessionId: input.mission.sessionId,
        activeThreadId: input.mission.activeThreadId,
        status: input.mission.status ?? "queued",
        sandboxLevel: input.mission.sandboxLevel ?? "safe_execute",
        command: input.mission.command ?? "git status",
        commandPolicy: input.mission.commandPolicy ?? "approval_required",
        provider: input.mission.provider ?? "mock",
        model: input.mission.model ?? "mock-agentos-local",
        latestRunId: undefined,
        metadata: input.mission.metadata,
        createdAt: input.mission.createdAt ?? timestamp,
        updatedAt: input.mission.updatedAt ?? timestamp
      };
      const run: MissionRun = {
        id: input.initialRun?.id ?? makeId("run"),
        workspaceId: mission.workspaceId,
        missionId: mission.id,
        sessionId: input.initialRun?.sessionId ?? mission.sessionId,
        requestedByOperatorId: mission.requestedByOperatorId,
        operatorId: input.initialRun?.operatorId ?? mission.operatorId,
        provider: input.initialRun?.provider ?? mission.provider,
        model: input.initialRun?.model ?? mission.model,
        status: input.initialRun?.status ?? "queued",
        commandPolicy: input.initialRun?.commandPolicy ?? mission.commandPolicy,
        requestedCommand: input.initialRun?.requestedCommand ?? mission.command,
        approvalRequestId: input.initialRun?.approvalRequestId,
        routeDecisionId: input.initialRun?.routeDecisionId,
        claimedByWorkerId: input.initialRun?.claimedByWorkerId,
        claimedAt: input.initialRun?.claimedAt,
        leaseExpiresAt: input.initialRun?.leaseExpiresAt,
        attemptCount: input.initialRun?.attemptCount ?? 0,
        retryCount: input.initialRun?.retryCount ?? 0,
        lastError: input.initialRun?.lastError,
        resultSummary: input.initialRun?.resultSummary,
        error: input.initialRun?.error,
        startedAt: input.initialRun?.startedAt,
        completedAt: input.initialRun?.completedAt,
        correlationId: input.initialRun?.correlationId,
        metadata: input.initialRun?.metadata,
        createdAt: input.initialRun?.createdAt ?? timestamp,
        updatedAt: input.initialRun?.updatedAt ?? timestamp
      };
      mission.latestRunId = run.id;
      mission.status = missionStatusFromRunStatus(run.status);
      database.missions.unshift(mission);
      database.missionRuns.unshift(run);

      let routingDecision: AgentRoutingDecisionRecord | undefined;
      if (input.routingDecision) {
        routingDecision = {
          ...input.routingDecision,
          missionId: mission.id,
          runId: input.routingDecision.runId ?? run.id
        };
        database.routingDecisions.unshift(routingDecision);
        run.routeDecisionId = routingDecision.id;
        run.operatorId = routingDecision.selectedPrimaryAgentId;
        mission.operatorId = routingDecision.selectedPrimaryAgentId;
      }

      let chatThread: ChatThreadRecord | undefined;
      if (input.chatThread) {
        chatThread = {
          id: input.chatThread.id ?? makeId("thread"),
          workspaceId: input.chatThread.workspaceId ?? mission.workspaceId,
          operatorId: input.chatThread.operatorId ?? mission.requestedByOperatorId,
          title: input.chatThread.title ?? `${mission.title} control thread`,
          scope: input.chatThread.scope ?? "mission",
          missionId: input.chatThread.missionId ?? mission.id,
          runId: input.chatThread.runId ?? run.id,
          approvalRequestId: input.chatThread.approvalRequestId,
          metadata: input.chatThread.metadata,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        database.chatThreads.unshift(chatThread);
        mission.activeThreadId = chatThread.id;
      }

      let chatMessage: ChatMessageRecord | undefined;
      if (input.initialChatMessage && chatThread) {
        chatMessage = {
          id: makeId("chat"),
          workspaceId: mission.workspaceId,
          threadId: chatThread.id,
          createdAt: timestamp,
          ...input.initialChatMessage
        };
        database.chatMessages.push(chatMessage);
      }

      const auditEvent: AuditEvent = {
        id: makeId("audit"),
        workspaceId: mission.workspaceId,
        event: input.audit?.event ?? "mission.created",
        actor: input.audit?.actor ?? mission.operatorId,
        summary: input.audit?.summary ?? `Created mission: ${mission.title}`,
        missionId: mission.id,
        runId: run.id,
        metadata: input.audit?.metadata,
        createdAt: timestamp
      };
      database.auditEvents.unshift(auditEvent);

      return {
        mission: structuredClone(mission),
        run: structuredClone(run),
        routingDecision: routingDecision ? structuredClone(routingDecision) : undefined,
        chatThread: chatThread ? structuredClone(chatThread) : undefined,
        chatMessage: chatMessage ? structuredClone(chatMessage) : undefined,
        auditEvent
      } satisfies CreateMissionBundleResult;
    });
  }

  recordRouteDecisionBundle(input: RecordRouteDecisionBundleInput) {
    return this.mutate((database) => {
      const mission = database.missions.find((item) => item.id === input.missionId);
      if (!mission) return undefined;
      const run = input.runId ? database.missionRuns.find((item) => item.id === input.runId) : undefined;
      const routeDecision = {
        ...input.routeDecision,
        missionId: mission.id,
        runId: input.routeDecision.runId ?? input.runId
      };
      database.routingDecisions.unshift(routeDecision);
      mission.operatorId = input.primaryAgentId ?? routeDecision.selectedPrimaryAgentId;
      mission.updatedAt = nowIso();
      if (run) {
        run.routeDecisionId = routeDecision.id;
        run.operatorId = input.primaryAgentId ?? routeDecision.selectedPrimaryAgentId;
        run.updatedAt = nowIso();
      }
      const auditEvent: AuditEvent = {
        id: makeId("audit"),
        workspaceId: mission.workspaceId,
        event: "route.decision_made",
        actor: input.auditActor ?? routeDecision.selectedPrimaryAgentId,
        summary: routeDecision.reason,
        missionId: mission.id,
        runId: run?.id,
        correlationId: input.correlationId ?? run?.correlationId ?? routeDecision.id,
        metadata: input.metadata,
        createdAt: nowIso()
      };
      database.auditEvents.unshift(auditEvent);
      const missionLog =
        run && input.logMessage ?
          appendMissionLogToDatabase(database, run.id, "plan", input.logMessage) :
          undefined;
      return {
        mission: structuredClone(mission),
        run: run ? structuredClone(run) : undefined,
        routingDecision: structuredClone(routeDecision),
        auditEvent,
        missionLog
      } satisfies RecordRouteDecisionBundleResult;
    });
  }

  createApprovalRequestBundle(input: CreateApprovalRequestBundleInput) {
    return this.mutate((database) => {
      const approval: ApprovalRecord = {
        ...input.approval,
        id: makeId("approval"),
        status: "pending",
        createdAt: nowIso()
      };
      database.approvals.unshift(approval);
      const run = approval.runId ? database.missionRuns.find((item) => item.id === approval.runId) : undefined;
      const mission = approval.missionId ? database.missions.find((item) => item.id === approval.missionId) : undefined;
      if (run) {
        run.approvalRequestId = approval.id;
        run.status = input.runStatus ?? "awaiting_approval";
        if (input.releaseRunLease) {
          run.claimedByWorkerId = undefined;
          run.claimedAt = undefined;
          run.leaseExpiresAt = undefined;
        }
        run.updatedAt = nowIso();
      }
      if (mission && input.missionStatus) {
        mission.status = input.missionStatus;
        mission.updatedAt = nowIso();
      } else if (mission) {
        mission.status = "awaiting_approval";
        mission.updatedAt = nowIso();
      }
      const quickActions = (input.quickActions ?? []).map((blueprint) =>
        createQuickActionInDatabase(database, {
          ...blueprint,
          missionId: blueprint.missionId ?? approval.missionId,
          runId: blueprint.runId ?? approval.runId,
          approvalRequestId: blueprint.approvalRequestId ?? approval.id
        })
      );
      const auditEvent = addAuditToDatabase(
        database,
        "approval.requested",
        input.auditActor ?? approval.agentId,
        `Approval requested for ${approval.command ?? approval.tool}.`,
        approval.missionId,
        approval.runId,
        input.correlationId,
        input.metadata
      );
      const missionLog =
        run && input.logMessage ?
          appendMissionLogToDatabase(database, run.id, "approval", input.logMessage) :
          undefined;
      return {
        approval: structuredClone(approval),
        run: run ? structuredClone(run) : undefined,
        mission: mission ? structuredClone(mission) : undefined,
        quickActions: quickActions.map((item) => structuredClone(item)),
        auditEvent: structuredClone(auditEvent),
        missionLog
      } satisfies CreateApprovalRequestBundleResult;
    });
  }

  resolveApprovalDecisionBundle(input: ResolveApprovalDecisionBundleInput) {
    return this.mutate((database) => {
      const approval = database.approvals.find((item) => item.id === input.approvalId);
      if (!approval) return undefined;
      approval.status = input.status;
      approval.scope = input.scope ?? approval.scope;
      approval.resolvedAt = nowIso();
      const run = approval.runId ? database.missionRuns.find((item) => item.id === approval.runId) : undefined;
      const mission = approval.missionId ? database.missions.find((item) => item.id === approval.missionId) : undefined;
      const expiredQuickActionIds: string[] = [];
      if (input.expireApprovalQuickActions ?? true) {
        const timestamp = nowIso();
        database.quickActions.forEach((action) => {
          if (action.approvalRequestId === approval.id && !action.consumedAt && !isExpired(action.expiresAt)) {
            action.expiresAt = action.expiresAt ?? timestamp;
            expiredQuickActionIds.push(action.id);
          }
        });
      }
      if (run) {
        run.status = input.runStatus ?? (input.status === "approved" ? "queued" : "denied");
        run.error = input.error ?? (input.status === "denied" ? "Control Gate denied the request." : undefined);
        run.lastError = run.error;
        if (run.status === "queued") {
          run.claimedByWorkerId = undefined;
          run.claimedAt = undefined;
          run.leaseExpiresAt = undefined;
          run.completedAt = undefined;
        } else if (run.status === "denied") {
          run.claimedByWorkerId = undefined;
          run.claimedAt = undefined;
          run.leaseExpiresAt = undefined;
          run.completedAt = nowIso();
        }
        run.updatedAt = nowIso();
      }
      if (mission) {
        mission.status = input.missionStatus ?? (input.status === "approved" ? "queued" : "denied");
        mission.updatedAt = nowIso();
      }
      const auditEvent = addAuditToDatabase(
        database,
        `approval.${input.status}`,
        input.operatorId,
        `${input.status} ${approval.tool}.`,
        approval.missionId,
        approval.runId,
        input.correlationId ?? approval.correlationId,
        input.metadata
      );
      const missionLog =
        run && input.logMessage ?
          appendMissionLogToDatabase(database, run.id, "approval", input.logMessage) :
          undefined;
      return {
        approval: structuredClone(approval),
        run: run ? structuredClone(run) : undefined,
        mission: mission ? structuredClone(mission) : undefined,
        expiredQuickActionIds,
        auditEvent: structuredClone(auditEvent),
        missionLog
      } satisfies ResolveApprovalDecisionBundleResult;
    });
  }

  consumeQuickActionBundle(input: ConsumeQuickActionBundleInput) {
    return this.mutate((database) => {
      const action = consumeQuickActionInDatabase(database, input.actionId, input.operatorId);
      if (!action) return undefined;
      const expiredQuickActionIds: string[] = [];
      if (input.expireSiblingActionTypes?.length) {
        const timestamp = nowIso();
        database.quickActions.forEach((candidate) => {
          if (
            candidate.id !== action.id &&
            !candidate.consumedAt &&
            !isExpired(candidate.expiresAt) &&
            candidate.missionId === action.missionId &&
            candidate.runId === action.runId &&
            candidate.approvalRequestId === action.approvalRequestId &&
            input.expireSiblingActionTypes?.includes(candidate.actionType)
          ) {
            candidate.expiresAt = candidate.expiresAt ?? timestamp;
            expiredQuickActionIds.push(candidate.id);
          }
        });
      }
      const auditEvent = addAuditToDatabase(
        database,
        "quick_action.bundle_consumed",
        input.operatorId,
        `Consumed quick action ${action.label}.`,
        action.missionId,
        action.runId,
        input.correlationId ?? action.correlationId,
        input.metadata
      );
      return {
        action,
        expiredQuickActionIds,
        auditEvent
      } satisfies ConsumeQuickActionBundleResult;
    });
  }

  completeRunBundle(input: CompleteRunBundleInput) {
    return this.mutate((database) => {
      const mission = database.missions.find((item) => item.id === input.missionId);
      const run = database.missionRuns.find((item) => item.id === input.runId);
      if (!mission || !run) return undefined;
      run.status = "completed";
      run.resultSummary = input.summary;
      run.completedAt = nowIso();
      run.claimedByWorkerId = undefined;
      run.claimedAt = undefined;
      run.leaseExpiresAt = undefined;
      run.updatedAt = nowIso();
      mission.status = "completed";
      mission.latestRunId = run.id;
      mission.updatedAt = nowIso();
      const missionLogs: MissionRunLog[] = [];
      if (input.stdout) missionLogs.push(appendMissionLogToDatabase(database, run.id, "stdout", input.stdout));
      if (input.stderr) missionLogs.push(appendMissionLogToDatabase(database, run.id, "stderr", input.stderr));
      if (input.resultLogMessage) missionLogs.push(appendMissionLogToDatabase(database, run.id, "result", input.resultLogMessage));
      let archiveEntry: MemoryRecord | undefined;
      if (input.archiveEntry) {
        archiveEntry = {
          ...input.archiveEntry,
          id: input.archiveEntry.id ?? makeId("archive"),
          workspaceId: input.archiveEntry.workspaceId ?? mission.workspaceId,
          createdAt: input.archiveEntry.createdAt ?? nowIso(),
          updatedAt: input.archiveEntry.updatedAt ?? nowIso()
        };
        database.memories.unshift(archiveEntry);
      }
      let usageEvent: UsageEvent | undefined;
      if (input.usageEvent) {
        usageEvent = {
          ...input.usageEvent,
          id: makeId("usage"),
          workspaceId: input.usageEvent.workspaceId ?? mission.workspaceId,
          createdAt: nowIso()
        };
        database.usageEvents.unshift(usageEvent);
      }
      const session =
        mission.sessionId ?
          database.sessions.find((item) => item.id === mission.sessionId) :
          undefined;
      if (session) {
        session.latestRunId = run.id;
        session.status = input.sessionStatus ?? "complete";
        session.summary = input.sessionSummary ?? `Mission ${mission.title} is completed.`;
        session.updatedAt = nowIso();
      }
      expireRelatedQuickActionsInDatabase(database, (action) => action.runId === run.id || action.missionId === mission.id);
      const auditEvents: AuditEvent[] = [];
      if (archiveEntry) {
        auditEvents.push(
          addAuditToDatabase(database, "archive.entry_written", input.auditActor ?? run.operatorId, `Archived result for ${mission.title}.`, mission.id, run.id, input.correlationId, input.metadata)
        );
      }
      auditEvents.push(
        addAuditToDatabase(database, "run.completed", input.auditActor ?? run.operatorId, `Completed ${mission.title}.`, mission.id, run.id, input.correlationId, input.metadata)
      );
      return {
        run: structuredClone(run),
        mission: structuredClone(mission),
        missionLogs: missionLogs.map((item) => structuredClone(item)),
        archiveEntry: archiveEntry ? structuredClone(archiveEntry) : undefined,
        usageEvent: usageEvent ? structuredClone(usageEvent) : undefined,
        auditEvents: auditEvents.map((item) => structuredClone(item))
      } satisfies CompleteRunBundleResult;
    });
  }

  failRunBundle(input: FailRunBundleInput) {
    return this.mutate((database) => {
      const mission = database.missions.find((item) => item.id === input.missionId);
      const run = database.missionRuns.find((item) => item.id === input.runId);
      if (!mission || !run) return undefined;
      run.status = input.status ?? "failed";
      run.error = input.error;
      run.lastError = input.error;
      run.completedAt = nowIso();
      run.claimedByWorkerId = undefined;
      run.claimedAt = undefined;
      run.leaseExpiresAt = undefined;
      run.updatedAt = nowIso();
      mission.status = input.missionStatus ?? missionStatusFromRunStatus(run.status);
      mission.latestRunId = run.id;
      mission.updatedAt = nowIso();
      const expiredQuickActionIds: string[] = [];
      if (input.expireActionTypes?.length) {
        const timestamp = nowIso();
        database.quickActions.forEach((action) => {
          if (
            !action.consumedAt &&
            !isExpired(action.expiresAt) &&
            action.runId === run.id &&
            input.expireActionTypes?.includes(action.actionType)
          ) {
            action.expiresAt = action.expiresAt ?? timestamp;
            expiredQuickActionIds.push(action.id);
          }
        });
      }
      const missionLog =
        input.logMessage ? appendMissionLogToDatabase(database, run.id, "stderr", input.logMessage) : undefined;
      let retryQuickAction: QuickActionRecord | undefined;
      if (input.retryQuickAction) {
        retryQuickAction = createQuickActionInDatabase(database, {
          ...input.retryQuickAction,
          missionId: input.retryQuickAction.missionId ?? mission.id,
          runId: input.retryQuickAction.runId ?? run.id
        });
      }
      const session =
        mission.sessionId ?
          database.sessions.find((item) => item.id === mission.sessionId) :
          undefined;
      if (session) {
        session.latestRunId = run.id;
        session.status = input.sessionStatus ?? "failed";
        session.summary = input.sessionSummary ?? `Mission ${mission.title} failed.`;
        session.updatedAt = nowIso();
      }
      const auditEvent = addAuditToDatabase(
        database,
        "run.failed",
        input.auditActor ?? run.operatorId,
        input.error,
        mission.id,
        run.id,
        input.correlationId ?? run.correlationId,
        input.metadata
      );
      return {
        run: structuredClone(run),
        mission: structuredClone(mission),
        missionLog: missionLog ? structuredClone(missionLog) : undefined,
        retryQuickAction: retryQuickAction ? structuredClone(retryQuickAction) : undefined,
        expiredQuickActionIds,
        auditEvent: structuredClone(auditEvent)
      } satisfies FailRunBundleResult;
    });
  }

  pauseRunBundle(input: import("./repository").PauseRunBundleInput) {
    return this.mutate((database) => {
      const run = database.missionRuns.find((item) => item.id === input.runId);
      if (!run) return undefined;
      const mission = database.missions.find((item) => item.id === run.missionId);
      if (!mission) return undefined;
      run.status = "paused";
      run.claimedByWorkerId = undefined;
      run.claimedAt = undefined;
      run.leaseExpiresAt = undefined;
      run.updatedAt = nowIso();
      mission.status = "paused";
      mission.updatedAt = nowIso();
      const expiredQuickActionIds = expireRelatedQuickActionsInDatabase(database, (action) => action.runId === run.id);
      const resumeQuickAction = createQuickActionInDatabase(database, {
        missionId: mission.id,
        runId: run.id,
        label: "Resume",
        emoji: "▶️",
        actionType: "resume",
        riskLevel: "low"
      });
      const missionLog = appendMissionLogToDatabase(database, run.id, "system", "Run paused by operator.");
      const auditEvent = addAuditToDatabase(
        database,
        "run.paused",
        input.actor,
        input.summary ?? `Paused ${mission.title}.`,
        mission.id,
        run.id,
        input.correlationId,
        input.metadata
      );
      return {
        run: structuredClone(run),
        mission: structuredClone(mission),
        resumeQuickAction: structuredClone(resumeQuickAction),
        expiredQuickActionIds,
        missionLog: structuredClone(missionLog),
        auditEvent: structuredClone(auditEvent)
      };
    });
  }

  resumeRunBundle(input: import("./repository").ResumeRunBundleInput) {
    return this.mutate((database) => {
      const run = database.missionRuns.find((item) => item.id === input.runId);
      if (!run) return undefined;
      const mission = database.missions.find((item) => item.id === run.missionId);
      if (!mission) return undefined;
      run.status = "queued";
      run.error = undefined;
      run.lastError = undefined;
      run.claimedByWorkerId = undefined;
      run.claimedAt = undefined;
      run.leaseExpiresAt = undefined;
      run.updatedAt = nowIso();
      mission.status = "queued";
      mission.updatedAt = nowIso();
      const expiredQuickActionIds = expireRelatedQuickActionsInDatabase(database, (action) => action.runId === run.id && action.actionType === "resume");
      const missionLog = appendMissionLogToDatabase(database, run.id, "system", "Run resumed and queued.");
      const auditEvent = addAuditToDatabase(
        database,
        "run.resumed",
        input.actor,
        input.summary ?? `Resumed ${mission.title}.`,
        mission.id,
        run.id,
        input.correlationId,
        input.metadata
      );
      return {
        run: structuredClone(run),
        mission: structuredClone(mission),
        expiredQuickActionIds,
        missionLog: structuredClone(missionLog),
        auditEvent: structuredClone(auditEvent)
      };
    });
  }

  retryRunBundle(input: import("./repository").RetryRunBundleInput) {
    return this.mutate((database) => {
      const previousRun = database.missionRuns.find((item) => item.id === input.runId);
      if (!previousRun) return undefined;
      const mission = database.missions.find((item) => item.id === previousRun.missionId);
      if (!mission) return undefined;
      const expiredQuickActionIds = expireRelatedQuickActionsInDatabase(database, (action) => action.runId === previousRun.id);
      const retried: MissionRun = {
        ...previousRun,
        id: makeId("run"),
        status: "queued",
        approvalRequestId: undefined,
        routeDecisionId: undefined,
        claimedByWorkerId: undefined,
        claimedAt: undefined,
        leaseExpiresAt: undefined,
        resultSummary: undefined,
        error: undefined,
        lastError: undefined,
        startedAt: undefined,
        completedAt: undefined,
        attemptCount: 0,
        retryCount: (previousRun.retryCount ?? 0) + 1,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      database.missionRuns.unshift(retried);
      mission.latestRunId = retried.id;
      mission.status = "queued";
      mission.updatedAt = nowIso();
      const auditEvent = addAuditToDatabase(
        database,
        "run.retry_requested",
        input.actor,
        input.summary ?? `Retry requested for ${mission.title}.`,
        mission.id,
        retried.id,
        input.correlationId,
        input.metadata
      );
      return {
        previousRun: structuredClone(previousRun),
        mission: structuredClone(mission),
        run: structuredClone(retried),
        expiredQuickActionIds,
        auditEvent: structuredClone(auditEvent)
      };
    });
  }

  appendChatExchangeBundle(input: import("./repository").AppendChatExchangeBundleInput) {
    return this.mutate((database) => {
      const userMessage =
        input.userMessage ?
          ({
            id: makeId("chat"),
            workspaceId: database.workspaces[0]?.id ?? defaultWorkspace.id,
            createdAt: nowIso(),
            ...input.userMessage
          } satisfies ChatMessageRecord) :
          undefined;
      if (userMessage) database.chatMessages.push(userMessage);
      const assistantMessage =
        input.assistantMessage ?
          ({
            id: makeId("chat"),
            workspaceId: database.workspaces[0]?.id ?? defaultWorkspace.id,
            createdAt: nowIso(),
            ...input.assistantMessage
          } satisfies ChatMessageRecord) :
          undefined;
      if (assistantMessage) database.chatMessages.push(assistantMessage);
      const auditEvent =
        input.audit ?
          addAuditToDatabase(
            database,
            input.audit.event,
            input.audit.actor,
            input.audit.summary,
            input.audit.missionId,
            input.audit.runId,
            input.audit.correlationId,
            input.audit.metadata
          ) :
          undefined;
      return {
        userMessage: userMessage ? structuredClone(userMessage) : undefined,
        assistantMessage: assistantMessage ? structuredClone(assistantMessage) : undefined,
        auditEvent: auditEvent ? structuredClone(auditEvent) : undefined
      };
    });
  }

  startRunExecutionBundle(input: import("./repository").StartRunExecutionBundleInput) {
    return this.mutate((database) => {
      const run = database.missionRuns.find((item) => item.id === input.runId);
      if (!run) return undefined;
      const mission = database.missions.find((item) => item.id === run.missionId);
      if (!mission) return undefined;
      run.status = "running";
      run.updatedAt = nowIso();
      mission.status = "running";
      mission.updatedAt = nowIso();
      const missionLog = appendMissionLogToDatabase(database, run.id, "exec", `Executing ${mission.command}.`);
      const auditEvent = addAuditToDatabase(
        database,
        "command.execution_started",
        input.actor,
        input.summary ?? `Executing ${mission.command}.`,
        mission.id,
        run.id,
        input.correlationId,
        input.metadata
      );
      return {
        run: structuredClone(run),
        mission: structuredClone(mission),
        missionLog: structuredClone(missionLog),
        auditEvent: structuredClone(auditEvent)
      };
    });
  }
}

export class SqlitePersistenceAdapter implements PersistenceAdapter {
  private readonly sqlite: Database.Database;
  private readonly db: ReturnType<typeof drizzle>;

  constructor(public readonly filePath = resolveAgentOSDataPath()) {
    ensureParentDirectory(this.filePath);
    this.sqlite = new Database(this.filePath);
    this.sqlite.pragma("journal_mode = WAL");
    this.sqlite.pragma("foreign_keys = OFF");
    this.db = drizzle(this.sqlite);
    this.ensureInitialized();
  }

  ensureInitialized() {
    this.createSchema();
    const hasSchema = this.sqlite.prepare("SELECT value FROM meta WHERE key = ?").get("schemaVersion") as
      | { value: string }
      | undefined;

    if (!hasSchema) {
      const imported = this.tryImportLegacyJson();
      if (!imported) this.saveDatabase(buildSeedDatabase());
      return;
    }

    const current = this.loadDatabase();
    const normalized = normalizeDatabase(current);
    if (JSON.stringify(current) !== JSON.stringify(normalized)) {
      this.saveDatabase(normalized);
    }
  }

  reset(database = buildSeedDatabase()) {
    this.saveDatabase(normalizeDatabase(database));
  }

  snapshot(): AgentOSDatabase {
    return structuredClone(this.loadDatabase());
  }

  mutate<T>(mutator: (database: AgentOSDatabase) => T): T {
    const database = this.loadDatabase();
    const result = mutator(database);
    this.saveDatabase(normalizeDatabase(database));
    return result;
  }

  getOrCreateDefaultWorkspace() {
    return this.transaction(() => {
      const existing = this.getDefaultWorkspace();
      if (existing) return existing;
      this.insertPayloadRow(
        "workspaces",
        {
          id: defaultWorkspace.id,
          slug: defaultWorkspace.slug,
          name: defaultWorkspace.name,
          mode: defaultWorkspace.mode,
          created_at: defaultWorkspace.createdAt,
          updated_at: defaultWorkspace.updatedAt
        },
        defaultWorkspace
      );
      return structuredClone(defaultWorkspace);
    });
  }

  listWorkspaces() {
    return this.readPayloadList<WorkspaceRecord>("workspaces");
  }

  getOrCreateDefaultOperator() {
    return this.transaction(() => {
      const existing = this.getDefaultOperator();
      if (existing) return existing;
      this.getOrCreateDefaultWorkspace();
      this.insertPayloadRow(
        "operators",
        {
          id: defaultOperator.id,
          workspace_id: defaultOperator.workspaceId,
          display_name: defaultOperator.displayName,
          role: defaultOperator.role,
          auth_mode: defaultOperator.authMode,
          status: defaultOperator.status,
          created_at: defaultOperator.createdAt,
          updated_at: defaultOperator.updatedAt
        },
        defaultOperator
      );
      return structuredClone(defaultOperator);
    });
  }

  listOperators(workspaceId?: string) {
    return this.readPayloadList<OperatorRecord>("operators", workspaceId ? { where: "workspace_id = ?", params: [workspaceId] } : undefined);
  }

  createMission(input: CreateMissionInput) {
    return this.transaction(() => {
      const workspace = this.getOrCreateDefaultWorkspace();
      const operator = this.getOrCreateDefaultOperator();
      const mission: MissionRecord = {
        id: input.id ?? makeId("mission"),
        workspaceId: input.workspaceId ?? workspace.id,
        requestedByOperatorId: input.requestedByOperatorId ?? operator.id,
        title: input.title ?? "Untitled mission",
        objective: input.objective ?? "Run a local-first agent mission.",
        prompt: input.prompt ?? input.objective ?? input.title ?? "Describe the next mission.",
        operatorId: input.operatorId ?? "agentos-operator",
        sessionId: input.sessionId,
        activeThreadId: input.activeThreadId,
        status: input.status ?? "draft",
        sandboxLevel: input.sandboxLevel ?? "safe_execute",
        command: input.command ?? "git status",
        commandPolicy: input.commandPolicy ?? "approval_required",
        provider: input.provider ?? "mock",
        model: input.model ?? "mock-agentos-local",
        latestRunId: input.latestRunId,
        metadata: input.metadata,
        createdAt: input.createdAt ?? nowIso(),
        updatedAt: input.updatedAt ?? nowIso()
      };
      this.insertPayloadRow(
        "missions",
        {
          id: mission.id,
          workspace_id: mission.workspaceId,
          requested_by_operator_id: mission.requestedByOperatorId,
          title: mission.title,
          operator_id: mission.operatorId,
          session_id: mission.sessionId,
          status: mission.status,
          sandbox_level: mission.sandboxLevel,
          command: mission.command,
          command_policy: mission.commandPolicy,
          provider: mission.provider,
          model: mission.model,
          latest_run_id: mission.latestRunId,
          created_at: mission.createdAt,
          updated_at: mission.updatedAt
        },
        mission
      );
      return mission;
    });
  }

  getMissionById(id: string) {
    return this.readPayloadById<MissionRecord>("missions", id);
  }

  listMissionsForWorkspace(workspaceId: string) {
    return this.readPayloadList<MissionRecord>("missions", { where: "workspace_id = ?", params: [workspaceId] });
  }

  updateMissionStatus(id: string, status: MissionRecord["status"], updates?: Partial<MissionRecord>) {
    return this.transaction(() => {
      const mission = this.getMissionById(id);
      if (!mission) return undefined;
      const next: MissionRecord = { ...mission, ...(updates ?? {}), status, updatedAt: nowIso() };
      this.updatePayloadRow(
        "missions",
        id,
        {
          workspace_id: next.workspaceId,
          requested_by_operator_id: next.requestedByOperatorId,
          title: next.title,
          operator_id: next.operatorId,
          session_id: next.sessionId,
          status: next.status,
          sandbox_level: next.sandboxLevel,
          command: next.command,
          command_policy: next.commandPolicy,
          provider: next.provider,
          model: next.model,
          latest_run_id: next.latestRunId,
          created_at: next.createdAt,
          updated_at: next.updatedAt
        },
        next
      );
      return next;
    });
  }

  createMissionRun(input: CreateMissionRunInput) {
    return this.transaction(() => {
      const run: MissionRun = {
        ...input,
        id: makeId("run"),
        attemptCount: input.attemptCount ?? 0,
        retryCount: input.retryCount ?? 0,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      this.insertPayloadRow(
        "mission_runs",
        {
          id: run.id,
          workspace_id: run.workspaceId,
          mission_id: run.missionId,
          session_id: run.sessionId,
          requested_by_operator_id: run.requestedByOperatorId,
          operator_id: run.operatorId,
          provider: run.provider,
          model: run.model,
          status: run.status,
          command_policy: run.commandPolicy,
          requested_command: run.requestedCommand,
          approval_request_id: run.approvalRequestId,
          route_decision_id: run.routeDecisionId,
          claimed_by_worker_id: run.claimedByWorkerId,
          claimed_at: run.claimedAt,
          lease_expires_at: run.leaseExpiresAt,
          attempt_count: run.attemptCount,
          retry_count: run.retryCount,
          last_error: run.lastError,
          result_summary: run.resultSummary,
          error: run.error,
          started_at: run.startedAt,
          completed_at: run.completedAt,
          correlation_id: run.correlationId,
          created_at: run.createdAt,
          updated_at: run.updatedAt
        },
        run
      );
      const mission = this.getMissionById(run.missionId);
      if (mission) {
        this.updateMissionStatus(mission.id, missionStatusFromRunStatus(run.status), { latestRunId: run.id });
      }
      return run;
    });
  }

  getMissionRunById(id: string) {
    return this.readPayloadById<MissionRun>("mission_runs", id);
  }

  claimNextQueuedRun(options: ClaimRunOptions): ClaimRunResult {
    return this.transaction(() => {
      // Local SQLite claims runs by taking a short transaction and updating the chosen row.
      // A hosted Postgres adapter should map this to a SKIP LOCKED-style claim path.
      const runs = this.readPayloadList<MissionRun>("mission_runs");
      const candidate = runs.find((run) => {
        if (options.specificRunId && run.id !== options.specificRunId) return false;
        const claimable =
          run.status === "queued" ||
          ((run.status === "planning" || run.status === "running") && isExpired(run.leaseExpiresAt));
        return claimable && (run.attemptCount ?? 0) < options.maxAttempts;
      });
      if (!candidate) {
        return { ok: false, reason: "No claimable runs available.", runId: options.specificRunId } satisfies ClaimRunResult;
      }
      const mission = this.getMissionById(candidate.missionId);
      if (!mission) return { ok: false, reason: "Mission not found.", runId: candidate.id } satisfies ClaimRunResult;
      const reclaimed = Boolean(candidate.claimedByWorkerId && isExpired(candidate.leaseExpiresAt));
      const nextRun: MissionRun = {
        ...candidate,
        status: "planning",
        claimedByWorkerId: options.workerId,
        claimedAt: nowIso(),
        leaseExpiresAt: new Date(Date.now() + options.leaseDurationMs).toISOString(),
        attemptCount: (candidate.attemptCount ?? 0) + 1,
        startedAt: candidate.startedAt ?? nowIso(),
        lastError: undefined,
        updatedAt: nowIso()
      };
      if ((nextRun.attemptCount ?? 0) > options.maxAttempts) {
        const failed = this.failRun({
          runId: candidate.id,
          missionId: mission.id,
          error: `Run exceeded max attempts (${options.maxAttempts}).`
        });
        return failed
          ? { ok: false, reason: failed.lastError ?? "Run exceeded max attempts.", runId: failed.id }
          : { ok: false, reason: "Run exceeded max attempts.", runId: candidate.id };
      }
      this.updatePayloadRow(
        "mission_runs",
        nextRun.id,
        {
          workspace_id: nextRun.workspaceId,
          mission_id: nextRun.missionId,
          session_id: nextRun.sessionId,
          requested_by_operator_id: nextRun.requestedByOperatorId,
          operator_id: nextRun.operatorId,
          provider: nextRun.provider,
          model: nextRun.model,
          status: nextRun.status,
          command_policy: nextRun.commandPolicy,
          requested_command: nextRun.requestedCommand,
          approval_request_id: nextRun.approvalRequestId,
          route_decision_id: nextRun.routeDecisionId,
          claimed_by_worker_id: nextRun.claimedByWorkerId,
          claimed_at: nextRun.claimedAt,
          lease_expires_at: nextRun.leaseExpiresAt,
          attempt_count: nextRun.attemptCount,
          retry_count: nextRun.retryCount ?? 0,
          last_error: nextRun.lastError,
          result_summary: nextRun.resultSummary,
          error: nextRun.error,
          started_at: nextRun.startedAt,
          completed_at: nextRun.completedAt,
          correlation_id: nextRun.correlationId,
          created_at: nextRun.createdAt,
          updated_at: nextRun.updatedAt
        },
        nextRun
      );
      const nextMission = { ...mission, status: "running" as const, updatedAt: nowIso(), latestRunId: nextRun.id };
      this.updatePayloadRow(
        "missions",
        nextMission.id,
        {
          workspace_id: nextMission.workspaceId,
          requested_by_operator_id: nextMission.requestedByOperatorId,
          title: nextMission.title,
          operator_id: nextMission.operatorId,
          session_id: nextMission.sessionId,
          status: nextMission.status,
          sandbox_level: nextMission.sandboxLevel,
          command: nextMission.command,
          command_policy: nextMission.commandPolicy,
          provider: nextMission.provider,
          model: nextMission.model,
          latest_run_id: nextMission.latestRunId,
          created_at: nextMission.createdAt,
          updated_at: nextMission.updatedAt
        },
        nextMission
      );
      const audit = this.appendAuditEvent({
        event: reclaimed ? "worker.reclaimed_run" : "worker.claimed_run",
        actor: options.workerId,
        summary: reclaimed ? `Worker reclaimed expired lease for ${nextRun.id}.` : `Worker claimed ${nextRun.id}.`,
        missionId: nextMission.id,
        runId: nextRun.id
      });
      return { ok: true, run: { ...nextRun, correlationId: nextRun.correlationId ?? audit.id }, mission: nextMission, reclaimed } satisfies ClaimRunResult;
    });
  }

  releaseRunLease(input: ReleaseRunLeaseInput) {
    return this.transaction(() => {
      const run = this.getMissionRunById(input.runId);
      if (!run) return undefined;
      const nextRun: MissionRun = {
        ...run,
        claimedByWorkerId: undefined,
        claimedAt: undefined,
        leaseExpiresAt: undefined,
        status: input.status ?? run.status,
        error: input.error ?? run.error,
        lastError: input.error ?? run.lastError,
        updatedAt: nowIso()
      };
      this.updatePayloadRow(
        "mission_runs",
        nextRun.id,
        {
          workspace_id: nextRun.workspaceId,
          mission_id: nextRun.missionId,
          session_id: nextRun.sessionId,
          requested_by_operator_id: nextRun.requestedByOperatorId,
          operator_id: nextRun.operatorId,
          provider: nextRun.provider,
          model: nextRun.model,
          status: nextRun.status,
          command_policy: nextRun.commandPolicy,
          requested_command: nextRun.requestedCommand,
          approval_request_id: nextRun.approvalRequestId,
          route_decision_id: nextRun.routeDecisionId,
          claimed_by_worker_id: nextRun.claimedByWorkerId,
          claimed_at: nextRun.claimedAt,
          lease_expires_at: nextRun.leaseExpiresAt,
          attempt_count: nextRun.attemptCount ?? 0,
          retry_count: nextRun.retryCount ?? 0,
          last_error: nextRun.lastError,
          result_summary: nextRun.resultSummary,
          error: nextRun.error,
          started_at: nextRun.startedAt,
          completed_at: nextRun.completedAt,
          correlation_id: nextRun.correlationId,
          created_at: nextRun.createdAt,
          updated_at: nextRun.updatedAt
        },
        nextRun
      );
      if (input.missionStatus) {
        const mission = this.getMissionById(nextRun.missionId);
        if (mission) this.updateMissionStatus(mission.id, input.missionStatus, { latestRunId: nextRun.id });
      }
      return nextRun;
    });
  }

  failRun(input: FailRunInput) {
    return this.transaction(() => {
      const run = this.getMissionRunById(input.runId);
      const mission = this.getMissionById(input.missionId);
      if (!run || !mission) return undefined;
      const nextRun: MissionRun = {
        ...run,
        status: input.status ?? "failed",
        error: input.error,
        lastError: input.error,
        completedAt: nowIso(),
        claimedByWorkerId: undefined,
        claimedAt: undefined,
        leaseExpiresAt: undefined,
        updatedAt: nowIso()
      };
      this.updatePayloadRow(
        "mission_runs",
        nextRun.id,
        {
          workspace_id: nextRun.workspaceId,
          mission_id: nextRun.missionId,
          session_id: nextRun.sessionId,
          requested_by_operator_id: nextRun.requestedByOperatorId,
          operator_id: nextRun.operatorId,
          provider: nextRun.provider,
          model: nextRun.model,
          status: nextRun.status,
          command_policy: nextRun.commandPolicy,
          requested_command: nextRun.requestedCommand,
          approval_request_id: nextRun.approvalRequestId,
          route_decision_id: nextRun.routeDecisionId,
          claimed_by_worker_id: nextRun.claimedByWorkerId,
          claimed_at: nextRun.claimedAt,
          lease_expires_at: nextRun.leaseExpiresAt,
          attempt_count: nextRun.attemptCount ?? 0,
          retry_count: nextRun.retryCount ?? 0,
          last_error: nextRun.lastError,
          result_summary: nextRun.resultSummary,
          error: nextRun.error,
          started_at: nextRun.startedAt,
          completed_at: nextRun.completedAt,
          correlation_id: nextRun.correlationId,
          created_at: nextRun.createdAt,
          updated_at: nextRun.updatedAt
        },
        nextRun
      );
      this.updateMissionStatus(mission.id, input.missionStatus ?? missionStatusFromRunStatus(nextRun.status), { latestRunId: nextRun.id });
      return nextRun;
    });
  }

  completeRun(input: CompleteRunInput) {
    return this.transaction(() => {
      const run = this.getMissionRunById(input.runId);
      const mission = this.getMissionById(input.missionId);
      if (!run || !mission) return undefined;
      const nextRun: MissionRun = {
        ...run,
        status: "completed",
        resultSummary: input.summary,
        completedAt: nowIso(),
        claimedByWorkerId: undefined,
        claimedAt: undefined,
        leaseExpiresAt: undefined,
        updatedAt: nowIso()
      };
      this.updatePayloadRow(
        "mission_runs",
        nextRun.id,
        {
          workspace_id: nextRun.workspaceId,
          mission_id: nextRun.missionId,
          session_id: nextRun.sessionId,
          requested_by_operator_id: nextRun.requestedByOperatorId,
          operator_id: nextRun.operatorId,
          provider: nextRun.provider,
          model: nextRun.model,
          status: nextRun.status,
          command_policy: nextRun.commandPolicy,
          requested_command: nextRun.requestedCommand,
          approval_request_id: nextRun.approvalRequestId,
          route_decision_id: nextRun.routeDecisionId,
          claimed_by_worker_id: nextRun.claimedByWorkerId,
          claimed_at: nextRun.claimedAt,
          lease_expires_at: nextRun.leaseExpiresAt,
          attempt_count: nextRun.attemptCount ?? 0,
          retry_count: nextRun.retryCount ?? 0,
          last_error: nextRun.lastError,
          result_summary: nextRun.resultSummary,
          error: nextRun.error,
          started_at: nextRun.startedAt,
          completed_at: nextRun.completedAt,
          correlation_id: nextRun.correlationId,
          created_at: nextRun.createdAt,
          updated_at: nextRun.updatedAt
        },
        nextRun
      );
      this.updateMissionStatus(mission.id, "completed", { latestRunId: nextRun.id });
      if (input.stdout) this.appendMissionLog(nextRun.id, "stdout", input.stdout);
      if (input.archiveEntry) {
        const archive = {
          ...input.archiveEntry,
          id: input.archiveEntry.id ?? makeId("archive"),
          workspaceId: input.archiveEntry.workspaceId ?? mission.workspaceId,
          createdAt: input.archiveEntry.createdAt ?? nowIso(),
          updatedAt: input.archiveEntry.updatedAt ?? nowIso()
        };
        this.insertPayloadRow(
          "memories",
          {
            id: archive.id,
            workspace_id: archive.workspaceId,
            type: archive.type,
            title: archive.title,
            source: archive.source,
            mission_id: archive.missionId,
            run_id: archive.runId,
            archived: archive.archived ? 1 : 0,
            created_at: archive.createdAt,
            updated_at: archive.updatedAt
          },
          archive
        );
      }
      return nextRun;
    });
  }

  appendMissionLog(runId: string, level: MissionRunLog["level"], message: string) {
    const log: MissionRunLog = { id: makeId("run-log"), runId, level, message, createdAt: nowIso() };
    this.insertPayloadRow("mission_logs", { id: log.id, run_id: log.runId, level: log.level, created_at: log.createdAt }, log, "append");
    return log;
  }

  listMissionLogs(runId: string) {
    return this.readPayloadList<MissionRunLog>("mission_logs", { where: "run_id = ?", params: [runId], order: "ASC" });
  }

  createApprovalRequest(input: CreateApprovalInput) {
    return this.transaction(() => {
      const approval: ApprovalRecord = { ...input, id: makeId("approval"), status: "pending", createdAt: nowIso() };
      this.insertPayloadRow(
        "approval_requests",
        {
          id: approval.id,
          workspace_id: approval.workspaceId,
          requested_by_operator_id: approval.requestedByOperatorId,
          agent_id: approval.agentId,
          mission_id: approval.missionId,
          session_id: approval.sessionId,
          run_id: approval.runId,
          tool: approval.tool,
          permission_level: approval.permissionLevel,
          status: approval.status,
          scope: approval.scope,
          created_at: approval.createdAt,
          resolved_at: approval.resolvedAt,
          correlation_id: approval.correlationId
        },
        approval
      );
      return approval;
    });
  }

  resolveApprovalRequest(id: string, status: ApprovalRecord["status"], scope?: ApprovalRecord["scope"]) {
    return this.transaction(() => {
      const approval = this.readPayloadById<ApprovalRecord>("approval_requests", id);
      if (!approval) return undefined;
      const next: ApprovalRecord = { ...approval, status, scope: scope ?? approval.scope, resolvedAt: nowIso() };
      this.updatePayloadRow(
        "approval_requests",
        next.id,
        {
          workspace_id: next.workspaceId,
          requested_by_operator_id: next.requestedByOperatorId,
          agent_id: next.agentId,
          mission_id: next.missionId,
          session_id: next.sessionId,
          run_id: next.runId,
          tool: next.tool,
          permission_level: next.permissionLevel,
          status: next.status,
          scope: next.scope,
          created_at: next.createdAt,
          resolved_at: next.resolvedAt,
          correlation_id: next.correlationId
        },
        next
      );
      return next;
    });
  }

  listPendingApprovals() {
    return this.readPayloadList<ApprovalRecord>("approval_requests").filter((item) => item.status === "pending");
  }

  appendAuditEvent(input: AppendAuditInput) {
    const workspaceId = input.workspaceId ?? this.getOrCreateDefaultWorkspace().id;
    const audit: AuditEvent = {
      id: makeId("audit"),
      workspaceId,
      event: input.event,
      actor: input.actor,
      summary: input.summary,
      missionId: input.missionId,
      runId: input.runId,
      correlationId: input.correlationId,
      metadata: input.metadata,
      createdAt: nowIso()
    };
    this.insertPayloadRow(
      "audit_events",
      {
        id: audit.id,
        workspace_id: audit.workspaceId,
        event: audit.event,
        actor: audit.actor,
        mission_id: audit.missionId,
        run_id: audit.runId,
        correlation_id: audit.correlationId,
        created_at: audit.createdAt
      },
      audit
    );
    return audit;
  }

  listAuditEvents(workspaceId?: string) {
    return this.readPayloadList<AuditEvent>("audit_events", workspaceId ? { where: "workspace_id = ?", params: [workspaceId] } : undefined);
  }

  createArchiveEntry(input: Omit<MemoryRecord, "id" | "workspaceId" | "createdAt" | "updatedAt">) {
    const workspace = this.getOrCreateDefaultWorkspace();
    const memory: MemoryRecord = {
      id: makeId("mem"),
      workspaceId: workspace.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...input
    };
    this.insertPayloadRow(
      "memories",
      {
        id: memory.id,
        workspace_id: memory.workspaceId,
        type: memory.type,
        title: memory.title,
        source: memory.source,
        mission_id: memory.missionId,
        run_id: memory.runId,
        archived: memory.archived ? 1 : 0,
        created_at: memory.createdAt,
        updated_at: memory.updatedAt
      },
      memory
    );
    return memory;
  }

  archiveMemoryEntry(id: string) {
    const memory = this.readPayloadById<MemoryRecord>("memories", id);
    if (!memory) return undefined;
    const next: MemoryRecord = { ...memory, archived: true, updatedAt: nowIso() };
    this.updatePayloadRow(
      "memories",
      next.id,
      {
        workspace_id: next.workspaceId,
        type: next.type,
        title: next.title,
        source: next.source,
        mission_id: next.missionId,
        run_id: next.runId,
        archived: 1,
        created_at: next.createdAt,
        updated_at: next.updatedAt
      },
      next
    );
    return next;
  }

  createRoutine(input: Partial<RoutineRecord>) {
    return this.mutate((database) => {
      const routine: RoutineRecord = {
        id: makeId("routine"),
        workspaceId: input.workspaceId ?? database.workspaces[0].id,
        requestedByOperatorId: input.requestedByOperatorId ?? database.operators[0].id,
        title: input.title ?? "Untitled routine",
        objective: input.objective ?? "Run a scheduled local mission.",
        prompt: input.prompt ?? input.objective ?? "Plan a recurring local mission safely.",
        command: input.command ?? "pnpm typecheck",
        sandboxLevel: input.sandboxLevel ?? "workspace_write",
        provider: input.provider ?? "mock",
        model: input.model ?? "mock-agentos-local",
        frequency: input.frequency ?? "manual",
        enabled: input.enabled ?? true,
        status: input.status ?? "scheduled",
        latestRunId: input.latestRunId,
        lastRunAt: input.lastRunAt,
        nextRunAt: input.nextRunAt,
        metadata: input.metadata
      };
      database.routines.unshift(routine);
      return routine;
    });
  }

  getRoutineById(id: string) {
    return this.readPayloadById<RoutineRecord>("routines", id);
  }

  updateRoutine(id: string, updates: Partial<RoutineRecord>) {
    return this.mutate((database) => {
      const routine = database.routines.find((item) => item.id === id);
      if (!routine) return undefined;
      Object.assign(routine, updates);
      return routine;
    });
  }

  createSession(input: Partial<SessionRecord>) {
    return this.mutate((database) => {
      const session: SessionRecord = {
        id: makeId("session"),
        workspaceId: input.workspaceId ?? database.workspaces[0].id,
        requestedByOperatorId: input.requestedByOperatorId ?? database.operators[0].id,
        title: input.title ?? "Untitled session",
        missionId: input.missionId,
        operatorId: input.operatorId ?? "agentos-operator",
        status: input.status ?? "active",
        summary: input.summary ?? "Local mission session in progress.",
        latestRunId: input.latestRunId,
        resumedAt: input.resumedAt,
        metadata: input.metadata,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      database.sessions.unshift(session);
      return session;
    });
  }

  getSessionById(id: string) {
    return this.readPayloadById<SessionRecord>("sessions", id);
  }

  updateSession(id: string, updates: Partial<SessionRecord>) {
    return this.mutate((database) => {
      const session = database.sessions.find((item) => item.id === id);
      if (!session) return undefined;
      Object.assign(session, updates, { updatedAt: nowIso() });
      return session;
    });
  }

  createRoutingDecision(input: CreateRoutingDecisionInput) {
    this.insertPayloadRow(
      "agent_routing_decisions",
      {
        id: input.id,
        workspace_id: input.workspaceId,
        mission_id: input.missionId,
        run_id: input.runId,
        task_type: input.taskType,
        complexity: input.complexity,
        risk_level: input.riskLevel,
        selected_primary_agent_id: input.selectedPrimaryAgentId,
        provider_lane: input.providerLane,
        route_confidence: input.routeConfidence,
        created_at: input.createdAt
      },
      input
    );
    return input;
  }

  listRoutingDecisionsForMission(missionId: string) {
    return this.readPayloadList<AgentRoutingDecisionRecord>("agent_routing_decisions", {
      where: "mission_id = ?",
      params: [missionId]
    });
  }

  appendUsageEvent(input: AppendUsageEventInput) {
    const event: UsageEvent = {
      ...input,
      workspaceId: input.workspaceId ?? this.getOrCreateDefaultWorkspace().id,
      id: makeId("usage"),
      createdAt: nowIso()
    };
    this.insertPayloadRow(
      "usage_events",
      {
        id: event.id,
        workspace_id: event.workspaceId,
        provider: event.provider,
        model: event.model,
        agent_id: event.agentId,
        task_id: event.taskId,
        run_id: event.runId,
        estimated_cost_usd: event.estimatedCostUsd,
        created_at: event.createdAt
      },
      event
    );
    return event;
  }

  listUsageEvents(workspaceId?: string) {
    return this.readPayloadList<UsageEvent>("usage_events", workspaceId ? { where: "workspace_id = ?", params: [workspaceId] } : undefined);
  }

  listBudgets(workspaceId?: string) {
    return this.readPayloadList<UsageBudget>("budgets", workspaceId ? { where: "workspace_id = ?", params: [workspaceId] } : undefined);
  }

  createChatThread(input: CreateChatThreadInput) {
    const workspace = this.getOrCreateDefaultWorkspace();
    const operator = this.getOrCreateDefaultOperator();
    const thread: ChatThreadRecord = {
      id: makeId("thread"),
      workspaceId: input.workspaceId ?? workspace.id,
      operatorId: input.operatorId ?? operator.id,
      title: input.title ?? "AgentOS Local Thread",
      scope: input.scope ?? "global",
      missionId: input.missionId,
      runId: input.runId,
      approvalRequestId: input.approvalRequestId,
      metadata: input.metadata,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.insertPayloadRow(
      "chat_threads",
      {
        id: thread.id,
        workspace_id: thread.workspaceId,
        operator_id: thread.operatorId,
        title: thread.title,
        scope: thread.scope,
        mission_id: thread.missionId,
        run_id: thread.runId,
        approval_request_id: thread.approvalRequestId,
        created_at: thread.createdAt,
        updated_at: thread.updatedAt
      },
      thread
    );
    return thread;
  }

  appendChatMessage(input: CreateChatMessageInput) {
    const workspace = this.getOrCreateDefaultWorkspace();
    const message: ChatMessageRecord = {
      id: makeId("chat"),
      workspaceId: workspace.id,
      createdAt: nowIso(),
      ...input
    };
    this.insertPayloadRow(
      "chat_messages",
      {
        id: message.id,
        workspace_id: message.workspaceId,
        thread_id: message.threadId,
        role: message.role,
        operator_id: message.operatorId,
        mission_id: message.missionId,
        run_id: message.runId,
        approval_request_id: message.approvalRequestId,
        intent_type: message.intentType,
        ask_human: message.askHuman === undefined ? null : message.askHuman ? 1 : 0,
        correlation_id: message.correlationId,
        created_at: message.createdAt
      },
      message,
      "append"
    );
    return message;
  }

  listChatThreads(workspaceId?: string) {
    return this.readPayloadList<ChatThreadRecord>("chat_threads", workspaceId ? { where: "workspace_id = ?", params: [workspaceId] } : undefined);
  }

  listChatMessages(threadId: string) {
    return this.readPayloadList<ChatMessageRecord>("chat_messages", { where: "thread_id = ?", params: [threadId], order: "ASC" });
  }

  createQuickAction(input: CreateQuickActionInput) {
    const existing = this.findActiveQuickAction({
      missionId: input.missionId,
      runId: input.runId,
      approvalRequestId: input.approvalRequestId,
      actionType: input.actionType
    });
    if (existing) return existing;
    const workspace = this.getOrCreateDefaultWorkspace();
    const action: QuickActionRecord = {
      id: makeId("quick"),
      workspaceId: workspace.id,
      createdAt: nowIso(),
      ...input
    };
    this.insertPayloadRow(
      "quick_actions",
      {
        id: action.id,
        workspace_id: action.workspaceId,
        mission_id: action.missionId,
        run_id: action.runId,
        approval_request_id: action.approvalRequestId,
        label: action.label,
        emoji: action.emoji,
        action_type: action.actionType,
        risk_level: action.riskLevel,
        expires_at: action.expiresAt,
        consumed_at: action.consumedAt,
        consumed_by_operator_id: action.consumedByOperatorId,
        correlation_id: action.correlationId,
        created_at: action.createdAt
      },
      action
    );
    return action;
  }

  consumeQuickAction(id: string, operatorId: string) {
    return this.transaction(() => {
      const action = this.readPayloadById<QuickActionRecord>("quick_actions", id);
      if (!action || action.consumedAt) return undefined;
      const next: QuickActionRecord = { ...action, consumedAt: nowIso(), consumedByOperatorId: operatorId };
      this.updatePayloadRow(
        "quick_actions",
        next.id,
        {
          workspace_id: next.workspaceId,
          mission_id: next.missionId,
          run_id: next.runId,
          approval_request_id: next.approvalRequestId,
          label: next.label,
          emoji: next.emoji,
          action_type: next.actionType,
          risk_level: next.riskLevel,
          expires_at: next.expiresAt,
          consumed_at: next.consumedAt,
          consumed_by_operator_id: next.consumedByOperatorId,
          correlation_id: next.correlationId,
          created_at: next.createdAt
        },
        next
      );
      this.appendAuditEvent({
        event: "quick_action.consumed",
        actor: operatorId,
        summary: `Consumed quick action ${next.label}.`,
        missionId: next.missionId,
        runId: next.runId,
        correlationId: next.correlationId
      });
      return next;
    });
  }

  findActiveQuickAction(scope: { missionId?: string; runId?: string; approvalRequestId?: string; actionType: QuickActionRecord["actionType"] }) {
    return this.readPayloadList<QuickActionRecord>("quick_actions").find(
      (action) =>
        action.actionType === scope.actionType &&
        action.missionId === scope.missionId &&
        action.runId === scope.runId &&
        action.approvalRequestId === scope.approvalRequestId &&
        !action.consumedAt &&
        !isExpired(action.expiresAt)
    );
  }

  listQuickActions(workspaceId?: string) {
    return this.readPayloadList<QuickActionRecord>("quick_actions", workspaceId ? { where: "workspace_id = ?", params: [workspaceId] } : undefined);
  }

  createMissionBundle(input: CreateMissionBundleInput) {
    return this.transaction(() => {
      const mission = this.createMission({
        ...input.mission,
        status:
          input.mission.status ??
          missionStatusFromRunStatus((input.initialRun?.status as MissionRun["status"] | undefined) ?? "queued")
      });
      const run = this.createMissionRun({
        workspaceId: mission.workspaceId,
        missionId: mission.id,
        sessionId: input.initialRun?.sessionId ?? mission.sessionId,
        requestedByOperatorId: mission.requestedByOperatorId,
        operatorId: input.initialRun?.operatorId ?? mission.operatorId,
        provider: input.initialRun?.provider ?? mission.provider,
        model: input.initialRun?.model ?? mission.model,
        status: input.initialRun?.status ?? "queued",
        commandPolicy: input.initialRun?.commandPolicy ?? mission.commandPolicy,
        requestedCommand: input.initialRun?.requestedCommand ?? mission.command,
        approvalRequestId: input.initialRun?.approvalRequestId,
        routeDecisionId: input.initialRun?.routeDecisionId,
        claimedByWorkerId: input.initialRun?.claimedByWorkerId,
        claimedAt: input.initialRun?.claimedAt,
        leaseExpiresAt: input.initialRun?.leaseExpiresAt,
        attemptCount: input.initialRun?.attemptCount ?? 0,
        retryCount: input.initialRun?.retryCount ?? 0,
        lastError: input.initialRun?.lastError,
        resultSummary: input.initialRun?.resultSummary,
        error: input.initialRun?.error,
        startedAt: input.initialRun?.startedAt,
        completedAt: input.initialRun?.completedAt,
        correlationId: input.initialRun?.correlationId,
        metadata: input.initialRun?.metadata
      });

      let routingDecision: AgentRoutingDecisionRecord | undefined;
      if (input.routingDecision) {
        routingDecision = this.recordRouteDecisionBundle({
          routeDecision: {
            ...input.routingDecision,
            missionId: mission.id,
            runId: input.routingDecision.runId ?? run.id
          },
          missionId: mission.id,
          runId: run.id,
          primaryAgentId: input.routingDecision.selectedPrimaryAgentId,
          auditActor: input.audit?.actor ?? input.routingDecision.selectedPrimaryAgentId
        })?.routingDecision;
      }

      let chatThread: ChatThreadRecord | undefined;
      if (input.chatThread) {
        chatThread = this.createChatThread({
          ...input.chatThread,
          missionId: input.chatThread.missionId ?? mission.id,
          runId: input.chatThread.runId ?? run.id
        });
        this.updateMissionStatus(mission.id, mission.status, { activeThreadId: chatThread.id });
      }

      const chatMessage =
        input.initialChatMessage && chatThread ?
          this.appendChatMessage({
            ...input.initialChatMessage,
            threadId: chatThread.id
          }) :
          undefined;

      const auditEvent = this.appendAuditEvent({
        workspaceId: mission.workspaceId,
        event: input.audit?.event ?? "mission.created",
        actor: input.audit?.actor ?? mission.operatorId,
        summary: input.audit?.summary ?? `Created mission: ${mission.title}`,
        missionId: mission.id,
        runId: run.id,
        metadata: input.audit?.metadata
      });

      return {
        mission: this.getMissionById(mission.id)!,
        run: this.getMissionRunById(run.id)!,
        routingDecision,
        chatThread,
        chatMessage,
        auditEvent
      } satisfies CreateMissionBundleResult;
    });
  }

  recordRouteDecisionBundle(input: RecordRouteDecisionBundleInput) {
    return this.transaction(() => {
      const mission = this.getMissionById(input.missionId);
      if (!mission) return undefined;
      const run = input.runId ? this.getMissionRunById(input.runId) : undefined;
      const routeDecision = this.createRoutingDecision({
        ...input.routeDecision,
        missionId: mission.id,
        runId: input.routeDecision.runId ?? run?.id
      });
      const nextMission = this.updateMissionStatus(mission.id, mission.status, {
        operatorId: input.primaryAgentId ?? routeDecision.selectedPrimaryAgentId,
        latestRunId: run?.id ?? mission.latestRunId,
        metadata: {
          ...(mission.metadata ?? {}),
          latestRouteDecisionId: routeDecision.id
        }
      })!;

      let nextRun: MissionRun | undefined;
      if (run) {
        nextRun = {
          ...run,
          routeDecisionId: routeDecision.id,
          operatorId: input.primaryAgentId ?? routeDecision.selectedPrimaryAgentId,
          updatedAt: nowIso()
        };
        this.updatePayloadRow(
          "mission_runs",
          nextRun.id,
          {
            workspace_id: nextRun.workspaceId,
            mission_id: nextRun.missionId,
            session_id: nextRun.sessionId,
            requested_by_operator_id: nextRun.requestedByOperatorId,
            operator_id: nextRun.operatorId,
            provider: nextRun.provider,
            model: nextRun.model,
            status: nextRun.status,
            command_policy: nextRun.commandPolicy,
            requested_command: nextRun.requestedCommand,
            approval_request_id: nextRun.approvalRequestId,
            route_decision_id: nextRun.routeDecisionId,
            claimed_by_worker_id: nextRun.claimedByWorkerId,
            claimed_at: nextRun.claimedAt,
            lease_expires_at: nextRun.leaseExpiresAt,
            attempt_count: nextRun.attemptCount ?? 0,
            retry_count: nextRun.retryCount ?? 0,
            last_error: nextRun.lastError,
            result_summary: nextRun.resultSummary,
            error: nextRun.error,
            started_at: nextRun.startedAt,
            completed_at: nextRun.completedAt,
            correlation_id: nextRun.correlationId,
            created_at: nextRun.createdAt,
            updated_at: nextRun.updatedAt
          },
          nextRun
        );
      }
      const missionLog =
        nextRun && input.logMessage ?
          this.appendMissionLog(nextRun.id, "plan", input.logMessage) :
          undefined;
      const auditEvent = this.appendAuditEvent({
        workspaceId: nextMission.workspaceId,
        event: "route.decision_made",
        actor: input.auditActor ?? routeDecision.selectedPrimaryAgentId,
        summary: routeDecision.reason,
        missionId: nextMission.id,
        runId: nextRun?.id,
        correlationId: input.correlationId ?? nextRun?.correlationId ?? routeDecision.id,
        metadata: input.metadata
      });
      return {
        mission: nextMission,
        run: nextRun,
        routingDecision: routeDecision,
        auditEvent,
        missionLog
      } satisfies RecordRouteDecisionBundleResult;
    });
  }

  createApprovalRequestBundle(input: CreateApprovalRequestBundleInput) {
    return this.transaction(() => {
      const approval = this.createApprovalRequest(input.approval);
      const run = approval.runId ? this.getMissionRunById(approval.runId) : undefined;
      const mission = approval.missionId ? this.getMissionById(approval.missionId) : undefined;

      let nextRun = run;
      if (run) {
        nextRun = this.releaseRunLease({
          runId: run.id,
          status: input.runStatus ?? "awaiting_approval",
          missionStatus: undefined
        });
        if (nextRun) {
          const runWithApproval = {
            ...nextRun,
            approvalRequestId: approval.id,
            updatedAt: nowIso()
          };
          this.updatePayloadRow(
            "mission_runs",
            runWithApproval.id,
            {
              workspace_id: runWithApproval.workspaceId,
              mission_id: runWithApproval.missionId,
              session_id: runWithApproval.sessionId,
              requested_by_operator_id: runWithApproval.requestedByOperatorId,
              operator_id: runWithApproval.operatorId,
              provider: runWithApproval.provider,
              model: runWithApproval.model,
              status: runWithApproval.status,
              command_policy: runWithApproval.commandPolicy,
              requested_command: runWithApproval.requestedCommand,
              approval_request_id: runWithApproval.approvalRequestId,
              route_decision_id: runWithApproval.routeDecisionId,
              claimed_by_worker_id: runWithApproval.claimedByWorkerId,
              claimed_at: runWithApproval.claimedAt,
              lease_expires_at: runWithApproval.leaseExpiresAt,
              attempt_count: runWithApproval.attemptCount ?? 0,
              retry_count: runWithApproval.retryCount ?? 0,
              last_error: runWithApproval.lastError,
              result_summary: runWithApproval.resultSummary,
              error: runWithApproval.error,
              started_at: runWithApproval.startedAt,
              completed_at: runWithApproval.completedAt,
              correlation_id: runWithApproval.correlationId,
              created_at: runWithApproval.createdAt,
              updated_at: runWithApproval.updatedAt
            },
            runWithApproval
          );
          nextRun = runWithApproval;
        }
      }
      const nextMission =
        mission ?
          this.updateMissionStatus(mission.id, input.missionStatus ?? "awaiting_approval", { latestRunId: nextRun?.id ?? mission.latestRunId }) :
          undefined;

      const quickActions = (input.quickActions ?? []).map((blueprint) =>
        this.createQuickAction({
          ...blueprint,
          missionId: blueprint.missionId ?? approval.missionId,
          runId: blueprint.runId ?? approval.runId,
          approvalRequestId: blueprint.approvalRequestId ?? approval.id
        })
      );
      const missionLog =
        nextRun && input.logMessage ?
          this.appendMissionLog(nextRun.id, "approval", input.logMessage) :
          undefined;
      const auditEvent = this.appendAuditEvent({
        workspaceId: approval.workspaceId,
        event: "approval.requested",
        actor: input.auditActor ?? approval.agentId,
        summary: `Approval requested for ${approval.command ?? approval.tool}.`,
        missionId: approval.missionId,
        runId: approval.runId,
        correlationId: input.correlationId ?? approval.correlationId,
        metadata: input.metadata
      });
      return {
        approval,
        run: nextRun,
        mission: nextMission,
        quickActions,
        auditEvent,
        missionLog
      } satisfies CreateApprovalRequestBundleResult;
    });
  }

  resolveApprovalDecisionBundle(input: ResolveApprovalDecisionBundleInput) {
    return this.transaction(() => {
      const approval = this.resolveApprovalRequest(input.approvalId, input.status, input.scope);
      if (!approval) return undefined;
      const run = approval.runId ? this.getMissionRunById(approval.runId) : undefined;
      const mission = approval.missionId ? this.getMissionById(approval.missionId) : undefined;
      const expiredQuickActionIds: string[] = [];
      if (input.expireApprovalQuickActions ?? true) {
        const active = this.readPayloadList<QuickActionRecord>("quick_actions").filter(
          (action) => action.approvalRequestId === approval.id && !action.consumedAt && !isExpired(action.expiresAt)
        );
        for (const action of active) {
          const next = { ...action, expiresAt: action.expiresAt ?? nowIso() };
          this.updatePayloadRow(
            "quick_actions",
            next.id,
            {
              workspace_id: next.workspaceId,
              mission_id: next.missionId,
              run_id: next.runId,
              approval_request_id: next.approvalRequestId,
              label: next.label,
              emoji: next.emoji,
              action_type: next.actionType,
              risk_level: next.riskLevel,
              expires_at: next.expiresAt,
              consumed_at: next.consumedAt,
              consumed_by_operator_id: next.consumedByOperatorId,
              correlation_id: next.correlationId,
              created_at: next.createdAt
            },
            next
          );
          expiredQuickActionIds.push(next.id);
        }
      }

      let nextRun = run;
      if (run) {
        const runStatus = input.runStatus ?? (input.status === "approved" ? "queued" : "denied");
        nextRun = this.releaseRunLease({
          runId: run.id,
          status: runStatus,
          error: input.error ?? (runStatus === "denied" ? "Control Gate denied the request." : undefined)
        });
        if (nextRun && runStatus === "denied") {
          nextRun = {
            ...nextRun,
            completedAt: nowIso(),
            updatedAt: nowIso()
          };
          this.updatePayloadRow(
            "mission_runs",
            nextRun.id,
            {
              workspace_id: nextRun.workspaceId,
              mission_id: nextRun.missionId,
              session_id: nextRun.sessionId,
              requested_by_operator_id: nextRun.requestedByOperatorId,
              operator_id: nextRun.operatorId,
              provider: nextRun.provider,
              model: nextRun.model,
              status: nextRun.status,
              command_policy: nextRun.commandPolicy,
              requested_command: nextRun.requestedCommand,
              approval_request_id: nextRun.approvalRequestId,
              route_decision_id: nextRun.routeDecisionId,
              claimed_by_worker_id: nextRun.claimedByWorkerId,
              claimed_at: nextRun.claimedAt,
              lease_expires_at: nextRun.leaseExpiresAt,
              attempt_count: nextRun.attemptCount ?? 0,
              retry_count: nextRun.retryCount ?? 0,
              last_error: nextRun.lastError,
              result_summary: nextRun.resultSummary,
              error: nextRun.error,
              started_at: nextRun.startedAt,
              completed_at: nextRun.completedAt,
              correlation_id: nextRun.correlationId,
              created_at: nextRun.createdAt,
              updated_at: nextRun.updatedAt
            },
            nextRun
          );
        }
      }
      const nextMission =
        mission ?
          this.updateMissionStatus(
            mission.id,
            input.missionStatus ?? (input.status === "approved" ? "queued" : "denied"),
            { latestRunId: nextRun?.id ?? mission.latestRunId }
          ) :
          undefined;

      const missionLog =
        nextRun && input.logMessage ?
          this.appendMissionLog(nextRun.id, "approval", input.logMessage) :
          undefined;
      const auditEvent = this.appendAuditEvent({
        workspaceId: approval.workspaceId,
        event: `approval.${input.status}`,
        actor: input.operatorId,
        summary: `${input.status} ${approval.tool}.`,
        missionId: approval.missionId,
        runId: approval.runId,
        correlationId: input.correlationId ?? approval.correlationId,
        metadata: input.metadata
      });
      return {
        approval,
        run: nextRun,
        mission: nextMission,
        expiredQuickActionIds,
        auditEvent,
        missionLog
      } satisfies ResolveApprovalDecisionBundleResult;
    });
  }

  consumeQuickActionBundle(input: ConsumeQuickActionBundleInput) {
    return this.transaction(() => {
      const action = this.consumeQuickAction(input.actionId, input.operatorId);
      if (!action) return undefined;
      const expiredQuickActionIds: string[] = [];
      if (input.expireSiblingActionTypes?.length) {
        const siblings = this.readPayloadList<QuickActionRecord>("quick_actions").filter(
          (candidate) =>
            candidate.id !== action.id &&
            !candidate.consumedAt &&
            !isExpired(candidate.expiresAt) &&
            candidate.missionId === action.missionId &&
            candidate.runId === action.runId &&
            candidate.approvalRequestId === action.approvalRequestId &&
            input.expireSiblingActionTypes?.includes(candidate.actionType)
        );
        for (const sibling of siblings) {
          const next = { ...sibling, expiresAt: sibling.expiresAt ?? nowIso() };
          this.updatePayloadRow(
            "quick_actions",
            next.id,
            {
              workspace_id: next.workspaceId,
              mission_id: next.missionId,
              run_id: next.runId,
              approval_request_id: next.approvalRequestId,
              label: next.label,
              emoji: next.emoji,
              action_type: next.actionType,
              risk_level: next.riskLevel,
              expires_at: next.expiresAt,
              consumed_at: next.consumedAt,
              consumed_by_operator_id: next.consumedByOperatorId,
              correlation_id: next.correlationId,
              created_at: next.createdAt
            },
            next
          );
          expiredQuickActionIds.push(next.id);
        }
      }
      const auditEvent = this.appendAuditEvent({
        workspaceId: action.workspaceId,
        event: "quick_action.bundle_consumed",
        actor: input.operatorId,
        summary: `Consumed quick action ${action.label}.`,
        missionId: action.missionId,
        runId: action.runId,
        correlationId: input.correlationId ?? action.correlationId,
        metadata: input.metadata
      });
      return {
        action,
        expiredQuickActionIds,
        auditEvent
      } satisfies ConsumeQuickActionBundleResult;
    });
  }

  completeRunBundle(input: CompleteRunBundleInput) {
    return this.transaction(() => {
      const run = this.completeRun(input);
      const mission = this.getMissionById(input.missionId);
      if (!run || !mission) return undefined;
      const missionLogs: MissionRunLog[] = [];
      if (input.stderr) missionLogs.push(this.appendMissionLog(run.id, "stderr", input.stderr));
      if (input.resultLogMessage) missionLogs.push(this.appendMissionLog(run.id, "result", input.resultLogMessage));
      const archiveEntry =
        input.archiveEntry ?
          this.readPayloadById<MemoryRecord>("memories", input.archiveEntry.id ?? "") ?? input.archiveEntry :
          undefined;
      const usageEvent =
        input.usageEvent ?
          this.appendUsageEvent({
            ...input.usageEvent,
            workspaceId: input.usageEvent.workspaceId ?? mission.workspaceId,
            runId: input.usageEvent.runId ?? run.id
          }) :
          undefined;
      const session =
        mission.sessionId ?
          this.getSessionById(mission.sessionId) :
          undefined;
      if (session) {
        this.updateSession(session.id, {
          latestRunId: run.id,
          status: input.sessionStatus ?? "complete",
          summary: input.sessionSummary ?? `Mission ${mission.title} is completed.`
        });
      }
      const quickActions = this.readPayloadList<QuickActionRecord>("quick_actions").filter(
        (action) => !action.consumedAt && !isExpired(action.expiresAt) && (action.runId === run.id || action.missionId === mission.id)
      );
      for (const action of quickActions) {
        const next = { ...action, expiresAt: action.expiresAt ?? nowIso() };
        this.updatePayloadRow(
          "quick_actions",
          next.id,
          {
            workspace_id: next.workspaceId,
            mission_id: next.missionId,
            run_id: next.runId,
            approval_request_id: next.approvalRequestId,
            label: next.label,
            emoji: next.emoji,
            action_type: next.actionType,
            risk_level: next.riskLevel,
            expires_at: next.expiresAt,
            consumed_at: next.consumedAt,
            consumed_by_operator_id: next.consumedByOperatorId,
            correlation_id: next.correlationId,
            created_at: next.createdAt
          },
          next
        );
      }
      const auditEvents: AuditEvent[] = [];
      if (archiveEntry) {
        auditEvents.push(
          this.appendAuditEvent({
            workspaceId: mission.workspaceId,
            event: "archive.entry_written",
            actor: input.auditActor ?? run.operatorId,
            summary: `Archived result for ${mission.title}.`,
            missionId: mission.id,
            runId: run.id,
            correlationId: input.correlationId,
            metadata: input.metadata
          })
        );
      }
      auditEvents.push(
        this.appendAuditEvent({
          workspaceId: mission.workspaceId,
          event: "run.completed",
          actor: input.auditActor ?? run.operatorId,
          summary: `Completed ${mission.title}.`,
          missionId: mission.id,
          runId: run.id,
          correlationId: input.correlationId,
          metadata: input.metadata
        })
      );
      return {
        run: this.getMissionRunById(run.id)!,
        mission: this.getMissionById(mission.id)!,
        missionLogs,
        archiveEntry,
        usageEvent,
        auditEvents
      } satisfies CompleteRunBundleResult;
    });
  }

  failRunBundle(input: FailRunBundleInput) {
    return this.transaction(() => {
      const run = this.failRun(input);
      const mission = this.getMissionById(input.missionId);
      if (!run || !mission) return undefined;
      const expiredQuickActionIds: string[] = [];
      if (input.expireActionTypes?.length) {
        const actions = this.readPayloadList<QuickActionRecord>("quick_actions").filter(
          (action) =>
            !action.consumedAt &&
            !isExpired(action.expiresAt) &&
            action.runId === run.id &&
            input.expireActionTypes?.includes(action.actionType)
        );
        for (const action of actions) {
          const next = { ...action, expiresAt: action.expiresAt ?? nowIso() };
          this.updatePayloadRow(
            "quick_actions",
            next.id,
            {
              workspace_id: next.workspaceId,
              mission_id: next.missionId,
              run_id: next.runId,
              approval_request_id: next.approvalRequestId,
              label: next.label,
              emoji: next.emoji,
              action_type: next.actionType,
              risk_level: next.riskLevel,
              expires_at: next.expiresAt,
              consumed_at: next.consumedAt,
              consumed_by_operator_id: next.consumedByOperatorId,
              correlation_id: next.correlationId,
              created_at: next.createdAt
            },
            next
          );
          expiredQuickActionIds.push(next.id);
        }
      }
      const missionLog =
        input.logMessage ? this.appendMissionLog(run.id, "stderr", input.logMessage) : undefined;
      const retryQuickAction =
        input.retryQuickAction ?
          this.createQuickAction({
            ...input.retryQuickAction,
            missionId: input.retryQuickAction.missionId ?? mission.id,
            runId: input.retryQuickAction.runId ?? run.id
          }) :
          undefined;
      const session =
        mission.sessionId ?
          this.getSessionById(mission.sessionId) :
          undefined;
      if (session) {
        this.updateSession(session.id, {
          latestRunId: run.id,
          status: input.sessionStatus ?? "failed",
          summary: input.sessionSummary ?? `Mission ${mission.title} failed.`
        });
      }
      const auditEvent = this.appendAuditEvent({
        workspaceId: mission.workspaceId,
        event: "run.failed",
        actor: input.auditActor ?? run.operatorId,
        summary: input.error,
        missionId: mission.id,
        runId: run.id,
        correlationId: input.correlationId ?? run.correlationId,
        metadata: input.metadata
      });
      return {
        run: this.getMissionRunById(run.id)!,
        mission: this.getMissionById(mission.id)!,
        missionLog,
        retryQuickAction,
        expiredQuickActionIds,
        auditEvent
      } satisfies FailRunBundleResult;
    });
  }

  pauseRunBundle(input: import("./repository").PauseRunBundleInput) {
    return this.transaction(() => {
      const run = this.getMissionRunById(input.runId);
      if (!run) return undefined;
      const mission = this.getMissionById(run.missionId);
      if (!mission) return undefined;
      const nextRun = this.releaseRunLease({
        runId: run.id,
        status: "paused"
      });
      if (!nextRun) return undefined;
      const nextMission = this.updateMissionStatus(mission.id, "paused", { latestRunId: nextRun.id });
      const expiredQuickActionIds: string[] = [];
      const actions = this.readPayloadList<QuickActionRecord>("quick_actions").filter(
        (action) => !action.consumedAt && !isExpired(action.expiresAt) && action.runId === run.id
      );
      for (const action of actions) {
        const next = { ...action, expiresAt: action.expiresAt ?? nowIso() };
        this.updatePayloadRow(
          "quick_actions",
          next.id,
          {
            workspace_id: next.workspaceId,
            mission_id: next.missionId,
            run_id: next.runId,
            approval_request_id: next.approvalRequestId,
            label: next.label,
            emoji: next.emoji,
            action_type: next.actionType,
            risk_level: next.riskLevel,
            expires_at: next.expiresAt,
            consumed_at: next.consumedAt,
            consumed_by_operator_id: next.consumedByOperatorId,
            correlation_id: next.correlationId,
            created_at: next.createdAt
          },
          next
        );
        expiredQuickActionIds.push(next.id);
      }
      const resumeQuickAction = this.createQuickAction({
        missionId: mission.id,
        runId: run.id,
        label: "Resume",
        emoji: "▶️",
        actionType: "resume",
        riskLevel: "low"
      });
      const missionLog = this.appendMissionLog(run.id, "system", "Run paused by operator.");
      const auditEvent = this.appendAuditEvent({
        workspaceId: mission.workspaceId,
        event: "run.paused",
        actor: input.actor,
        summary: input.summary ?? `Paused ${mission.title}.`,
        missionId: mission.id,
        runId: run.id,
        correlationId: input.correlationId,
        metadata: input.metadata
      });
      return {
        run: nextRun,
        mission: nextMission!,
        resumeQuickAction,
        expiredQuickActionIds,
        missionLog,
        auditEvent
      };
    });
  }

  resumeRunBundle(input: import("./repository").ResumeRunBundleInput) {
    return this.transaction(() => {
      const run = this.getMissionRunById(input.runId);
      if (!run) return undefined;
      const mission = this.getMissionById(run.missionId);
      if (!mission) return undefined;
      const nextRun = this.releaseRunLease({
        runId: run.id,
        status: "queued",
        error: undefined
      });
      if (!nextRun) return undefined;
      const clearedRun = { ...nextRun, error: undefined, lastError: undefined, updatedAt: nowIso() };
      this.updatePayloadRow(
        "mission_runs",
        clearedRun.id,
        {
          workspace_id: clearedRun.workspaceId,
          mission_id: clearedRun.missionId,
          session_id: clearedRun.sessionId,
          requested_by_operator_id: clearedRun.requestedByOperatorId,
          operator_id: clearedRun.operatorId,
          provider: clearedRun.provider,
          model: clearedRun.model,
          status: clearedRun.status,
          command_policy: clearedRun.commandPolicy,
          requested_command: clearedRun.requestedCommand,
          approval_request_id: clearedRun.approvalRequestId,
          route_decision_id: clearedRun.routeDecisionId,
          claimed_by_worker_id: clearedRun.claimedByWorkerId,
          claimed_at: clearedRun.claimedAt,
          lease_expires_at: clearedRun.leaseExpiresAt,
          attempt_count: clearedRun.attemptCount ?? 0,
          retry_count: clearedRun.retryCount ?? 0,
          last_error: clearedRun.lastError,
          result_summary: clearedRun.resultSummary,
          error: clearedRun.error,
          started_at: clearedRun.startedAt,
          completed_at: clearedRun.completedAt,
          correlation_id: clearedRun.correlationId,
          created_at: clearedRun.createdAt,
          updated_at: clearedRun.updatedAt
        },
        clearedRun
      );
      const nextMission = this.updateMissionStatus(mission.id, "queued", { latestRunId: run.id });
      const expiredQuickActionIds: string[] = [];
      const actions = this.readPayloadList<QuickActionRecord>("quick_actions").filter(
        (action) => !action.consumedAt && !isExpired(action.expiresAt) && action.runId === run.id && action.actionType === "resume"
      );
      for (const action of actions) {
        const next = { ...action, expiresAt: action.expiresAt ?? nowIso() };
        this.updatePayloadRow(
          "quick_actions",
          next.id,
          {
            workspace_id: next.workspaceId,
            mission_id: next.missionId,
            run_id: next.runId,
            approval_request_id: next.approvalRequestId,
            label: next.label,
            emoji: next.emoji,
            action_type: next.actionType,
            risk_level: next.riskLevel,
            expires_at: next.expiresAt,
            consumed_at: next.consumedAt,
            consumed_by_operator_id: next.consumedByOperatorId,
            correlation_id: next.correlationId,
            created_at: next.createdAt
          },
          next
        );
        expiredQuickActionIds.push(next.id);
      }
      const missionLog = this.appendMissionLog(run.id, "system", "Run resumed and queued.");
      const auditEvent = this.appendAuditEvent({
        workspaceId: mission.workspaceId,
        event: "run.resumed",
        actor: input.actor,
        summary: input.summary ?? `Resumed ${mission.title}.`,
        missionId: mission.id,
        runId: run.id,
        correlationId: input.correlationId,
        metadata: input.metadata
      });
      return {
        run: this.getMissionRunById(run.id)!,
        mission: nextMission!,
        expiredQuickActionIds,
        missionLog,
        auditEvent
      };
    });
  }

  retryRunBundle(input: import("./repository").RetryRunBundleInput) {
    return this.transaction(() => {
      const previousRun = this.getMissionRunById(input.runId);
      if (!previousRun) return undefined;
      const mission = this.getMissionById(previousRun.missionId);
      if (!mission) return undefined;
      const expiredQuickActionIds: string[] = [];
      const actions = this.readPayloadList<QuickActionRecord>("quick_actions").filter(
        (action) => !action.consumedAt && !isExpired(action.expiresAt) && action.runId === previousRun.id
      );
      for (const action of actions) {
        const next = { ...action, expiresAt: action.expiresAt ?? nowIso() };
        this.updatePayloadRow(
          "quick_actions",
          next.id,
          {
            workspace_id: next.workspaceId,
            mission_id: next.missionId,
            run_id: next.runId,
            approval_request_id: next.approvalRequestId,
            label: next.label,
            emoji: next.emoji,
            action_type: next.actionType,
            risk_level: next.riskLevel,
            expires_at: next.expiresAt,
            consumed_at: next.consumedAt,
            consumed_by_operator_id: next.consumedByOperatorId,
            correlation_id: next.correlationId,
            created_at: next.createdAt
          },
          next
        );
        expiredQuickActionIds.push(next.id);
      }
      const retried = this.createMissionRun({
        workspaceId: previousRun.workspaceId,
        missionId: previousRun.missionId,
        sessionId: previousRun.sessionId,
        requestedByOperatorId: previousRun.requestedByOperatorId,
        operatorId: previousRun.operatorId,
        provider: previousRun.provider,
        model: previousRun.model,
        status: "queued",
        commandPolicy: previousRun.commandPolicy,
        requestedCommand: previousRun.requestedCommand,
        retryCount: (previousRun.retryCount ?? 0) + 1,
        correlationId: previousRun.correlationId,
        metadata: previousRun.metadata
      });
      const nextMission = this.updateMissionStatus(mission.id, "queued", { latestRunId: retried.id })!;
      const auditEvent = this.appendAuditEvent({
        workspaceId: mission.workspaceId,
        event: "run.retry_requested",
        actor: input.actor,
        summary: input.summary ?? `Retry requested for ${mission.title}.`,
        missionId: mission.id,
        runId: retried.id,
        correlationId: input.correlationId ?? previousRun.correlationId,
        metadata: input.metadata
      });
      return {
        previousRun,
        mission: nextMission,
        run: retried,
        expiredQuickActionIds,
        auditEvent
      };
    });
  }

  startRunExecutionBundle(input: import("./repository").StartRunExecutionBundleInput) {
    return this.transaction(() => {
      const run = this.getMissionRunById(input.runId);
      if (!run) return undefined;
      const mission = this.getMissionById(run.missionId);
      if (!mission) return undefined;
      const nextRun = { ...run, status: "running" as const, updatedAt: nowIso() };
      this.updatePayloadRow(
        "mission_runs",
        nextRun.id,
        {
          workspace_id: nextRun.workspaceId,
          mission_id: nextRun.missionId,
          session_id: nextRun.sessionId,
          requested_by_operator_id: nextRun.requestedByOperatorId,
          operator_id: nextRun.operatorId,
          provider: nextRun.provider,
          model: nextRun.model,
          status: nextRun.status,
          command_policy: nextRun.commandPolicy,
          requested_command: nextRun.requestedCommand,
          approval_request_id: nextRun.approvalRequestId,
          route_decision_id: nextRun.routeDecisionId,
          claimed_by_worker_id: nextRun.claimedByWorkerId,
          claimed_at: nextRun.claimedAt,
          lease_expires_at: nextRun.leaseExpiresAt,
          attempt_count: nextRun.attemptCount ?? 0,
          retry_count: nextRun.retryCount ?? 0,
          last_error: nextRun.lastError,
          result_summary: nextRun.resultSummary,
          error: nextRun.error,
          started_at: nextRun.startedAt,
          completed_at: nextRun.completedAt,
          correlation_id: nextRun.correlationId,
          created_at: nextRun.createdAt,
          updated_at: nextRun.updatedAt
        },
        nextRun
      );
      const nextMission = this.updateMissionStatus(mission.id, "running", { latestRunId: nextRun.id })!;
      const missionLog = this.appendMissionLog(nextRun.id, "exec", `Executing ${mission.command}.`);
      const auditEvent = this.appendAuditEvent({
        workspaceId: mission.workspaceId,
        event: "command.execution_started",
        actor: input.actor,
        summary: input.summary ?? `Executing ${mission.command}.`,
        missionId: mission.id,
        runId: nextRun.id,
        correlationId: input.correlationId,
        metadata: input.metadata
      });
      return {
        run: this.getMissionRunById(nextRun.id)!,
        mission: nextMission,
        missionLog,
        auditEvent
      };
    });
  }

  appendChatExchangeBundle(input: import("./repository").AppendChatExchangeBundleInput) {
    return this.transaction(() => {
      const userMessage =
        input.userMessage ?
          this.appendChatMessage(input.userMessage) :
          undefined;
      const assistantMessage =
        input.assistantMessage ?
          this.appendChatMessage(input.assistantMessage) :
          undefined;
      const auditEvent =
        input.audit ?
          this.appendAuditEvent({
            workspaceId: this.getOrCreateDefaultWorkspace().id,
            event: input.audit.event,
            actor: input.audit.actor,
            summary: input.audit.summary,
            missionId: input.audit.missionId,
            runId: input.audit.runId,
            correlationId: input.audit.correlationId,
            metadata: input.audit.metadata
          }) :
          undefined;
      return { userMessage, assistantMessage, auditEvent };
    });
  }

  importFromJson(jsonPath = resolveLegacyAgentOSJsonPath(findRepoRoot(dirname(this.filePath)))) {
    if (!existsSync(jsonPath)) return false;
    this.saveDatabase(loadJsonDatabase(jsonPath));
    return true;
  }

  private tryImportLegacyJson() {
    const repoRoot = findRepoRoot(dirname(this.filePath));
    const legacyJsonPath = resolveLegacyAgentOSJsonPath(repoRoot);
    if (legacyJsonPath !== this.filePath && existsSync(legacyJsonPath)) {
      this.saveDatabase(loadJsonDatabase(legacyJsonPath));
      return true;
    }
    return false;
  }

  private createSchema() {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, slug TEXT NOT NULL, name TEXT NOT NULL, mode TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS operators (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, display_name TEXT NOT NULL, role TEXT NOT NULL, auth_mode TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, workload INTEGER NOT NULL, current_task_id TEXT, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, workspace_id TEXT, title TEXT NOT NULL, status TEXT NOT NULL, assigned_agent_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, workspace_id TEXT, type TEXT NOT NULL, title TEXT NOT NULL, source TEXT NOT NULL, mission_id TEXT, run_id TEXT, archived INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS usage_events (id TEXT PRIMARY KEY, workspace_id TEXT, provider TEXT NOT NULL, model TEXT NOT NULL, agent_id TEXT, task_id TEXT, run_id TEXT, estimated_cost_usd REAL NOT NULL, created_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY, workspace_id TEXT, scope TEXT NOT NULL, scope_id TEXT, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS approval_requests (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, requested_by_operator_id TEXT NOT NULL, agent_id TEXT NOT NULL, mission_id TEXT, session_id TEXT, run_id TEXT, tool TEXT NOT NULL, permission_level TEXT NOT NULL, status TEXT NOT NULL, scope TEXT, created_at TEXT NOT NULL, resolved_at TEXT, correlation_id TEXT, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, event TEXT NOT NULL, actor TEXT NOT NULL, mission_id TEXT, run_id TEXT, correlation_id TEXT, created_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_mission (id TEXT PRIMARY KEY, updated_at TEXT NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, requested_by_operator_id TEXT NOT NULL, title TEXT NOT NULL, operator_id TEXT NOT NULL, session_id TEXT, status TEXT NOT NULL, sandbox_level TEXT NOT NULL, command TEXT NOT NULL, command_policy TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, latest_run_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS mission_runs (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, mission_id TEXT NOT NULL, session_id TEXT, requested_by_operator_id TEXT NOT NULL, operator_id TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, status TEXT NOT NULL, command_policy TEXT NOT NULL, requested_command TEXT, approval_request_id TEXT, route_decision_id TEXT, claimed_by_worker_id TEXT, claimed_at TEXT, lease_expires_at TEXT, attempt_count INTEGER, retry_count INTEGER, last_error TEXT, result_summary TEXT, error TEXT, started_at TEXT, completed_at TEXT, correlation_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS mission_logs (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, level TEXT NOT NULL, created_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS routines (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, requested_by_operator_id TEXT NOT NULL, title TEXT NOT NULL, frequency TEXT NOT NULL, enabled INTEGER NOT NULL, status TEXT NOT NULL, latest_run_id TEXT, last_run_at TEXT, next_run_at TEXT, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS loadout (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, requested_by_operator_id TEXT NOT NULL, mission_id TEXT, operator_id TEXT NOT NULL, status TEXT NOT NULL, latest_run_id TEXT, resumed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS agent_routing_decisions (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, mission_id TEXT NOT NULL, run_id TEXT, task_type TEXT NOT NULL, complexity TEXT NOT NULL, risk_level TEXT NOT NULL, selected_primary_agent_id TEXT NOT NULL, provider_lane TEXT NOT NULL, route_confidence REAL NOT NULL, created_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS chat_threads (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, operator_id TEXT NOT NULL, title TEXT NOT NULL, scope TEXT NOT NULL, mission_id TEXT, run_id TEXT, approval_request_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, thread_id TEXT NOT NULL, role TEXT NOT NULL, operator_id TEXT, mission_id TEXT, run_id TEXT, approval_request_id TEXT, intent_type TEXT, ask_human INTEGER, correlation_id TEXT, created_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS quick_actions (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, mission_id TEXT, run_id TEXT, approval_request_id TEXT, label TEXT NOT NULL, emoji TEXT NOT NULL, action_type TEXT NOT NULL, risk_level TEXT NOT NULL, expires_at TEXT, consumed_at TEXT, consumed_by_operator_id TEXT, correlation_id TEXT, created_at TEXT NOT NULL, sort_order INTEGER NOT NULL, payload_json TEXT NOT NULL);
    `);
  }

  private transaction<T>(fn: () => T): T {
    return this.sqlite.transaction(fn)();
  }

  private nextSortOrder(tableName: string, mode: "prepend" | "append" = "prepend") {
    const column = mode === "prepend" ? "MIN(sort_order)" : "MAX(sort_order)";
    const row = this.sqlite.prepare(`SELECT ${column} as value FROM ${tableName}`).get() as { value: number | null };
    if (row?.value === null || row?.value === undefined) return 0;
    return mode === "prepend" ? row.value - 1 : row.value + 1;
  }

  private readPayloadById<T>(tableName: string, id: string): T | undefined {
    const row = this.sqlite.prepare(`SELECT payload_json FROM ${tableName} WHERE id = ?`).get(id) as { payload_json: string } | undefined;
    return row ? parseRowPayload<T>(row.payload_json) : undefined;
  }

  private readPayloadList<T>(tableName: string, options?: { where?: string; params?: unknown[]; order?: "ASC" | "DESC" }) {
    const where = options?.where ? ` WHERE ${options.where}` : "";
    const order = options?.order ?? "ASC";
    const rows = this.sqlite
      .prepare(`SELECT payload_json FROM ${tableName}${where} ORDER BY sort_order ${order}`)
      .all(...(options?.params ?? [])) as Array<{ payload_json: string }>;
    return rows.map((row) => parseRowPayload<T>(row.payload_json));
  }

  private insertPayloadRow(tableName: string, columns: Record<string, unknown>, payload: Record<string, unknown>, mode: "prepend" | "append" = "prepend") {
    const sortOrder = this.nextSortOrder(tableName, mode);
    const entries = Object.entries({ ...columns, sort_order: sortOrder, payload_json: JSON.stringify(payload) });
    const columnNames = entries.map(([key]) => key).join(", ");
    const placeholders = entries.map(() => "?").join(", ");
    this.sqlite
      .prepare(`INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`)
      .run(...entries.map(([, value]) => value));
  }

  private updatePayloadRow(tableName: string, id: string, columns: Record<string, unknown>, payload: Record<string, unknown>) {
    const entries = Object.entries({ ...columns, payload_json: JSON.stringify(payload) });
    const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
    this.sqlite.prepare(`UPDATE ${tableName} SET ${assignments} WHERE id = ?`).run(...entries.map(([, value]) => value), id);
  }

  private getDefaultWorkspace() {
    return this.readPayloadList<WorkspaceRecord>("workspaces", { order: "ASC" })[0];
  }

  private getDefaultOperator() {
    return this.readPayloadList<OperatorRecord>("operators", { order: "ASC" })[0];
  }

  private saveDatabase(database: AgentOSDatabase) {
    const normalized = normalizeDatabase(database);
    const tx = this.sqlite.transaction(() => {
      replaceRows(this.db, workspacesTable, serializeRows(normalized.workspaces, (row, index) => ({
        id: row.id, slug: row.slug, name: row.name, mode: row.mode, createdAt: row.createdAt, updatedAt: row.updatedAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, operatorsTable, serializeRows(normalized.operators, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, displayName: row.displayName, role: row.role, authMode: row.authMode, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, agentsTable, serializeRows(normalized.agents, (row, index) => ({
        id: row.id, name: row.name, role: row.role, status: row.status, workload: row.workload, currentTaskId: row.currentTaskId, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, tasksTable, serializeRows(normalized.tasks, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, title: row.title, status: row.status, assignedAgentId: row.assignedAgentId, createdAt: row.createdAt, updatedAt: row.updatedAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, memoriesTable, serializeRows(normalized.memories, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, type: row.type, title: row.title, source: row.source, missionId: row.missionId, runId: row.runId, archived: row.archived ? 1 : 0, createdAt: row.createdAt, updatedAt: row.updatedAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, usageEventsTable, serializeRows(normalized.usageEvents, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, provider: row.provider, model: row.model, agentId: row.agentId, taskId: row.taskId, runId: row.runId, estimatedCostUsd: row.estimatedCostUsd, createdAt: row.createdAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, budgetsTable, serializeRows(normalized.budgets, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, scope: row.scope, scopeId: row.scopeId, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, approvalsTable, serializeRows(normalized.approvals, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, requestedByOperatorId: row.requestedByOperatorId, agentId: row.agentId, missionId: row.missionId, sessionId: row.sessionId, runId: row.runId, tool: row.tool, permissionLevel: row.permissionLevel, status: row.status, scope: row.scope, createdAt: row.createdAt, resolvedAt: row.resolvedAt, correlationId: row.correlationId, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, auditEventsTable, serializeRows(normalized.auditEvents, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, event: row.event, actor: row.actor, missionId: row.missionId, runId: row.runId, correlationId: row.correlationId, createdAt: row.createdAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, demoMissionTable, [{ id: normalized.demoMission.id, updatedAt: normalized.demoMission.updatedAt, payloadJson: JSON.stringify(normalized.demoMission) }]);
      replaceRows(this.db, missionsTable, serializeRows(normalized.missions, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, requestedByOperatorId: row.requestedByOperatorId, title: row.title, operatorId: row.operatorId, sessionId: row.sessionId, status: row.status, sandboxLevel: row.sandboxLevel, command: row.command, commandPolicy: row.commandPolicy, provider: row.provider, model: row.model, latestRunId: row.latestRunId, createdAt: row.createdAt, updatedAt: row.updatedAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, missionRunsTable, serializeRows(normalized.missionRuns, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, missionId: row.missionId, sessionId: row.sessionId, requestedByOperatorId: row.requestedByOperatorId, operatorId: row.operatorId, provider: row.provider, model: row.model, status: row.status, commandPolicy: row.commandPolicy, requestedCommand: row.requestedCommand, approvalRequestId: row.approvalRequestId, routeDecisionId: row.routeDecisionId, claimedByWorkerId: row.claimedByWorkerId, claimedAt: row.claimedAt, leaseExpiresAt: row.leaseExpiresAt, attemptCount: row.attemptCount ?? 0, retryCount: row.retryCount ?? 0, lastError: row.lastError, resultSummary: row.resultSummary, error: row.error, startedAt: row.startedAt, completedAt: row.completedAt, correlationId: row.correlationId, createdAt: row.createdAt, updatedAt: row.updatedAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, missionLogsTable, serializeRows(normalized.missionLogs, (row, index) => ({
        id: row.id, runId: row.runId, level: row.level, createdAt: row.createdAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, routinesTable, serializeRows(normalized.routines, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, requestedByOperatorId: row.requestedByOperatorId, title: row.title, frequency: row.frequency, enabled: row.enabled ? 1 : 0, status: row.status, latestRunId: row.latestRunId, lastRunAt: row.lastRunAt, nextRunAt: row.nextRunAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, loadoutTable, serializeRows(normalized.loadout, (row, index) => ({
        id: row.id, name: row.name, kind: row.kind, status: row.status, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, sessionsTable, serializeRows(normalized.sessions, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, requestedByOperatorId: row.requestedByOperatorId, missionId: row.missionId, operatorId: row.operatorId, status: row.status, latestRunId: row.latestRunId, resumedAt: row.resumedAt, createdAt: row.createdAt, updatedAt: row.updatedAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, routingDecisionsTable, serializeRows(normalized.routingDecisions, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, missionId: row.missionId, runId: row.runId, taskType: row.taskType, complexity: row.complexity, riskLevel: row.riskLevel, selectedPrimaryAgentId: row.selectedPrimaryAgentId, providerLane: row.providerLane, routeConfidence: row.routeConfidence, createdAt: row.createdAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, chatThreadsTable, serializeRows(normalized.chatThreads, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, operatorId: row.operatorId, title: row.title, scope: row.scope, missionId: row.missionId, runId: row.runId, approvalRequestId: row.approvalRequestId, createdAt: row.createdAt, updatedAt: row.updatedAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, chatMessagesTable, serializeRows(normalized.chatMessages, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, threadId: row.threadId, role: row.role, operatorId: row.operatorId, missionId: row.missionId, runId: row.runId, approvalRequestId: row.approvalRequestId, intentType: row.intentType, askHuman: row.askHuman === undefined ? null : row.askHuman ? 1 : 0, correlationId: row.correlationId, createdAt: row.createdAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, quickActionsTable, serializeRows(normalized.quickActions, (row, index) => ({
        id: row.id, workspaceId: row.workspaceId, missionId: row.missionId, runId: row.runId, approvalRequestId: row.approvalRequestId, label: row.label, emoji: row.emoji, actionType: row.actionType, riskLevel: row.riskLevel, expiresAt: row.expiresAt, consumedAt: row.consumedAt, consumedByOperatorId: row.consumedByOperatorId, correlationId: row.correlationId, createdAt: row.createdAt, sortOrder: index, payloadJson: JSON.stringify(row)
      })));
      replaceRows(this.db, metaTable, [
        { key: "schemaVersion", value: String(CURRENT_SCHEMA_VERSION) },
        { key: "initializedAt", value: normalized.initializedAt }
      ]);
    });
    tx();
  }

  private loadDatabase(): AgentOSDatabase {
    const initializedAt =
      (this.sqlite.prepare("SELECT value FROM meta WHERE key = ?").get("initializedAt") as { value: string } | undefined)?.value ?? nowIso();

    return normalizeDatabase({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      initializedAt,
      workspaces: this.db.select().from(workspacesTable).orderBy(workspacesTable.sortOrder).all().map((row) => parseRowPayload<WorkspaceRecord>(row.payloadJson)),
      operators: this.db.select().from(operatorsTable).orderBy(operatorsTable.sortOrder).all().map((row) => parseRowPayload<OperatorRecord>(row.payloadJson)),
      agents: this.db.select().from(agentsTable).orderBy(agentsTable.sortOrder).all().map((row) => parseRowPayload<AgentProfile>(row.payloadJson)),
      tasks: this.db.select().from(tasksTable).orderBy(tasksTable.sortOrder).all().map((row) => parseRowPayload<AgentTask>(row.payloadJson)),
      memories: this.db.select().from(memoriesTable).orderBy(memoriesTable.sortOrder).all().map((row) => parseRowPayload<MemoryRecord>(row.payloadJson)),
      usageEvents: this.db.select().from(usageEventsTable).orderBy(usageEventsTable.sortOrder).all().map((row) => parseRowPayload<UsageEvent>(row.payloadJson)),
      budgets: this.db.select().from(budgetsTable).orderBy(budgetsTable.sortOrder).all().map((row) => parseRowPayload<UsageBudget>(row.payloadJson)),
      approvals: this.db.select().from(approvalsTable).orderBy(approvalsTable.sortOrder).all().map((row) => parseRowPayload<ApprovalRecord>(row.payloadJson)),
      auditEvents: this.db.select().from(auditEventsTable).orderBy(auditEventsTable.sortOrder).all().map((row) => parseRowPayload<AuditEvent>(row.payloadJson)),
      demoMission:
        this.db.select().from(demoMissionTable).all()[0] ?
          parseRowPayload<DemoMissionRun>(this.db.select().from(demoMissionTable).all()[0]!.payloadJson) :
          structuredClone(defaultDemoMission),
      missions: this.db.select().from(missionsTable).orderBy(missionsTable.sortOrder).all().map((row) => parseRowPayload<MissionRecord>(row.payloadJson)),
      missionRuns: this.db.select().from(missionRunsTable).orderBy(missionRunsTable.sortOrder).all().map((row) => parseRowPayload<MissionRun>(row.payloadJson)),
      missionLogs: this.db.select().from(missionLogsTable).orderBy(missionLogsTable.sortOrder).all().map((row) => parseRowPayload<MissionRunLog>(row.payloadJson)),
      routines: this.db.select().from(routinesTable).orderBy(routinesTable.sortOrder).all().map((row) => parseRowPayload<RoutineRecord>(row.payloadJson)),
      loadout: this.db.select().from(loadoutTable).orderBy(loadoutTable.sortOrder).all().map((row) => parseRowPayload<LoadoutItem>(row.payloadJson)),
      sessions: this.db.select().from(sessionsTable).orderBy(sessionsTable.sortOrder).all().map((row) => parseRowPayload<SessionRecord>(row.payloadJson)),
      routingDecisions: this.db.select().from(routingDecisionsTable).orderBy(routingDecisionsTable.sortOrder).all().map((row) => parseRowPayload<AgentRoutingDecisionRecord>(row.payloadJson)),
      chatThreads: this.db.select().from(chatThreadsTable).orderBy(chatThreadsTable.sortOrder).all().map((row) => parseRowPayload<ChatThreadRecord>(row.payloadJson)),
      chatMessages: this.db.select().from(chatMessagesTable).orderBy(chatMessagesTable.sortOrder).all().map((row) => parseRowPayload<ChatMessageRecord>(row.payloadJson)),
      quickActions: this.db.select().from(quickActionsTable).orderBy(quickActionsTable.sortOrder).all().map((row) => parseRowPayload<QuickActionRecord>(row.payloadJson))
    });
  }
}

export class FilePersistenceAdapter extends SqlitePersistenceAdapter {}

let defaultAdapter: PersistenceAdapter | undefined;

export function getPersistenceAdapter(filePath?: string): PersistenceAdapter {
  const resolved = filePath ?? resolveAgentOSDataPath();
  if (extname(resolved).toLowerCase() === ".json") {
    return new JsonFilePersistenceAdapter(resolved);
  }
  if (filePath) return new SqlitePersistenceAdapter(resolved);
  defaultAdapter ??= new SqlitePersistenceAdapter(resolved);
  return defaultAdapter;
}

export function getJsonFallbackAdapter(filePath?: string) {
  return new JsonFilePersistenceAdapter(filePath ?? resolveLegacyAgentOSJsonPath());
}

export function resetPersistenceAdapterForTests() {
  defaultAdapter = undefined;
}

export function resetSqliteDatabaseFile(path = resolveAgentOSDataPath()) {
  if (existsSync(path)) unlinkSync(path);
  const wal = `${path}-wal`;
  const shm = `${path}-shm`;
  if (existsSync(wal)) unlinkSync(wal);
  if (existsSync(shm)) unlinkSync(shm);
}

export type * from "./repository";
