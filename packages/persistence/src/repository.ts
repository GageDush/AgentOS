import type {
  AgentRoutingDecisionRecord,
  ApprovalRecord,
  ApprovalScope,
  AuditEvent,
  ChatMessageRecord,
  ChatThreadRecord,
  MemoryRecord,
  MissionRecord,
  MissionRun,
  MissionRunLog,
  OperatorRecord,
  QuickActionType,
  QuickActionRecord,
  RouteRiskLevel,
  RoutineRecord,
  SessionRecord,
  UsageBudget,
  UsageEvent,
  WorkspaceRecord
} from "@agentos/shared";

export type CreateMissionInput = Partial<MissionRecord>;
export type CreateMissionRunInput = Omit<MissionRun, "id" | "createdAt" | "updatedAt">;
export type CreateApprovalInput = Omit<ApprovalRecord, "id" | "createdAt" | "status">;
export type CreateChatThreadInput = Partial<ChatThreadRecord>;
export type CreateChatMessageInput = Omit<ChatMessageRecord, "id" | "workspaceId" | "createdAt">;
export type CreateQuickActionInput = Omit<QuickActionRecord, "id" | "workspaceId" | "createdAt">;
export type CreateRoutingDecisionInput = AgentRoutingDecisionRecord;
export type AppendAuditInput = Omit<AuditEvent, "id" | "workspaceId" | "createdAt"> & { workspaceId?: string };
export type AppendUsageEventInput = Omit<UsageEvent, "id" | "createdAt">;

export type ClaimRunOptions = {
  workerId: string;
  maxAttempts: number;
  leaseDurationMs: number;
  specificRunId?: string;
};

export type ClaimRunResult =
  | { ok: true; run: MissionRun; mission: MissionRecord; reclaimed: boolean }
  | { ok: false; reason: string; runId?: string };

export type ReleaseRunLeaseInput = {
  runId: string;
  status?: MissionRun["status"];
  missionStatus?: MissionRecord["status"];
  error?: string;
};

export type CompleteRunInput = {
  runId: string;
  missionId: string;
  summary: string;
  stdout?: string;
  archiveEntry?: MemoryRecord;
};

export type FailRunInput = {
  runId: string;
  missionId: string;
  error: string;
  status?: MissionRun["status"];
  missionStatus?: MissionRecord["status"];
};

export type QuickActionBlueprint = Omit<CreateQuickActionInput, "missionId" | "runId" | "approvalRequestId"> & {
  missionId?: string;
  runId?: string;
  approvalRequestId?: string;
};

export type CreateMissionBundleInput = {
  mission: CreateMissionInput;
  initialRun?: Partial<CreateMissionRunInput> & Pick<Partial<MissionRun>, "id" | "createdAt" | "updatedAt">;
  routingDecision?: CreateRoutingDecisionInput;
  chatThread?: CreateChatThreadInput;
  initialChatMessage?: Omit<CreateChatMessageInput, "threadId">;
  audit?: {
    event?: string;
    actor: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  };
};

export type CreateMissionBundleResult = {
  mission: MissionRecord;
  run: MissionRun;
  routingDecision?: AgentRoutingDecisionRecord;
  chatThread?: ChatThreadRecord;
  chatMessage?: ChatMessageRecord;
  auditEvent: AuditEvent;
};

export type RecordRouteDecisionBundleInput = {
  routeDecision: CreateRoutingDecisionInput;
  missionId: string;
  runId?: string;
  primaryAgentId?: string;
  logMessage?: string;
  auditActor?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type RecordRouteDecisionBundleResult = {
  mission: MissionRecord;
  run?: MissionRun;
  routingDecision: AgentRoutingDecisionRecord;
  auditEvent: AuditEvent;
  missionLog?: MissionRunLog;
};

export type CreateApprovalRequestBundleInput = {
  approval: CreateApprovalInput;
  quickActions?: QuickActionBlueprint[];
  releaseRunLease?: boolean;
  runStatus?: MissionRun["status"];
  missionStatus?: MissionRecord["status"];
  logMessage?: string;
  auditActor?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type CreateApprovalRequestBundleResult = {
  approval: ApprovalRecord;
  run?: MissionRun;
  mission?: MissionRecord;
  quickActions: QuickActionRecord[];
  auditEvent: AuditEvent;
  missionLog?: MissionRunLog;
};

export type ResolveApprovalDecisionBundleInput = {
  approvalId: string;
  status: ApprovalRecord["status"];
  scope?: ApprovalScope;
  operatorId: string;
  runStatus?: MissionRun["status"];
  missionStatus?: MissionRecord["status"];
  error?: string;
  logMessage?: string;
  expireApprovalQuickActions?: boolean;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type ResolveApprovalDecisionBundleResult = {
  approval: ApprovalRecord;
  run?: MissionRun;
  mission?: MissionRecord;
  expiredQuickActionIds: string[];
  auditEvent: AuditEvent;
  missionLog?: MissionRunLog;
};

export type ConsumeQuickActionBundleInput = {
  actionId: string;
  operatorId: string;
  expireSiblingActionTypes?: QuickActionType[];
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type ConsumeQuickActionBundleResult = {
  action: QuickActionRecord;
  expiredQuickActionIds: string[];
  auditEvent: AuditEvent;
};

export type CompleteRunBundleInput = CompleteRunInput & {
  stdout?: string;
  stderr?: string;
  resultLogMessage?: string;
  archiveEntry?: MemoryRecord;
  usageEvent?: AppendUsageEventInput;
  sessionStatus?: SessionRecord["status"];
  sessionSummary?: string;
  auditActor?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type CompleteRunBundleResult = {
  run: MissionRun;
  mission: MissionRecord;
  missionLogs: MissionRunLog[];
  archiveEntry?: MemoryRecord;
  usageEvent?: UsageEvent;
  auditEvents: AuditEvent[];
};

export type FailRunBundleInput = FailRunInput & {
  logMessage?: string;
  retryQuickAction?: QuickActionBlueprint;
  sessionStatus?: SessionRecord["status"];
  sessionSummary?: string;
  auditActor?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  expireActionTypes?: QuickActionType[];
};

export type FailRunBundleResult = {
  run: MissionRun;
  mission: MissionRecord;
  missionLog?: MissionRunLog;
  retryQuickAction?: QuickActionRecord;
  expiredQuickActionIds: string[];
  auditEvent: AuditEvent;
};

export type PauseRunBundleInput = {
  runId: string;
  actor: string;
  summary?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type PauseRunBundleResult = {
  run: MissionRun;
  mission: MissionRecord;
  resumeQuickAction: QuickActionRecord;
  expiredQuickActionIds: string[];
  missionLog: MissionRunLog;
  auditEvent: AuditEvent;
};

export type ResumeRunBundleInput = {
  runId: string;
  actor: string;
  summary?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type ResumeRunBundleResult = {
  run: MissionRun;
  mission: MissionRecord;
  expiredQuickActionIds: string[];
  missionLog: MissionRunLog;
  auditEvent: AuditEvent;
};

export type RetryRunBundleInput = {
  runId: string;
  actor: string;
  summary?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type RetryRunBundleResult = {
  previousRun: MissionRun;
  mission: MissionRecord;
  run: MissionRun;
  expiredQuickActionIds: string[];
  auditEvent: AuditEvent;
};

export type StartRunExecutionBundleInput = {
  runId: string;
  actor: string;
  summary?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

export type StartRunExecutionBundleResult = {
  run: MissionRun;
  mission: MissionRecord;
  missionLog: MissionRunLog;
  auditEvent: AuditEvent;
};

export type AppendChatExchangeBundleInput = {
  threadId: string;
  userMessage?: CreateChatMessageInput;
  assistantMessage?: CreateChatMessageInput;
  audit?: {
    event: string;
    actor: string;
    summary: string;
    missionId?: string;
    runId?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  };
};

export type AppendChatExchangeBundleResult = {
  userMessage?: ChatMessageRecord;
  assistantMessage?: ChatMessageRecord;
  auditEvent?: AuditEvent;
};

export interface WorkspaceRepository {
  getOrCreateDefaultWorkspace(): WorkspaceRecord;
  listWorkspaces(): WorkspaceRecord[];
}

export interface OperatorRepository {
  getOrCreateDefaultOperator(): OperatorRecord;
  listOperators(workspaceId?: string): OperatorRecord[];
}

export interface MissionRepository {
  createMission(input: CreateMissionInput): MissionRecord;
  getMissionById(id: string): MissionRecord | undefined;
  listMissionsForWorkspace(workspaceId: string): MissionRecord[];
  updateMissionStatus(id: string, status: MissionRecord["status"], updates?: Partial<MissionRecord>): MissionRecord | undefined;
}

export interface MissionRunRepository {
  createMissionRun(input: CreateMissionRunInput): MissionRun;
  getMissionRunById(id: string): MissionRun | undefined;
  claimNextQueuedRun(options: ClaimRunOptions): ClaimRunResult;
  releaseRunLease(input: ReleaseRunLeaseInput): MissionRun | undefined;
  failRun(input: FailRunInput): MissionRun | undefined;
  completeRun(input: CompleteRunInput): MissionRun | undefined;
}

export interface MissionLogRepository {
  appendMissionLog(runId: string, level: MissionRunLog["level"], message: string): MissionRunLog;
  listMissionLogs(runId: string): MissionRunLog[];
}

export interface ApprovalRepository {
  createApprovalRequest(input: CreateApprovalInput): ApprovalRecord;
  resolveApprovalRequest(id: string, status: ApprovalRecord["status"], scope?: ApprovalRecord["scope"]): ApprovalRecord | undefined;
  listPendingApprovals(): ApprovalRecord[];
}

export interface AuditRepository {
  appendAuditEvent(input: AppendAuditInput): AuditEvent;
  listAuditEvents(workspaceId?: string): AuditEvent[];
}

export interface MemoryRepository {
  createArchiveEntry(input: Omit<MemoryRecord, "id" | "workspaceId" | "createdAt" | "updatedAt">): MemoryRecord;
  archiveMemoryEntry(id: string): MemoryRecord | undefined;
}

export interface RoutineRepository {
  createRoutine(input: Partial<RoutineRecord>): RoutineRecord;
  getRoutineById(id: string): RoutineRecord | undefined;
  updateRoutine(id: string, updates: Partial<RoutineRecord>): RoutineRecord | undefined;
}

export interface SessionRepository {
  createSession(input: Partial<SessionRecord>): SessionRecord;
  getSessionById(id: string): SessionRecord | undefined;
  updateSession(id: string, updates: Partial<SessionRecord>): SessionRecord | undefined;
}

export interface RoutingDecisionRepository {
  createRoutingDecision(input: CreateRoutingDecisionInput): AgentRoutingDecisionRecord;
  listRoutingDecisionsForMission(missionId: string): AgentRoutingDecisionRecord[];
}

export interface UsageRepository {
  appendUsageEvent(input: AppendUsageEventInput): UsageEvent;
  listUsageEvents(workspaceId?: string): UsageEvent[];
  listBudgets(workspaceId?: string): UsageBudget[];
}

export interface ChatRepository {
  createChatThread(input: CreateChatThreadInput): ChatThreadRecord;
  appendChatMessage(input: CreateChatMessageInput): ChatMessageRecord;
  listChatThreads(workspaceId?: string): ChatThreadRecord[];
  listChatMessages(threadId: string): ChatMessageRecord[];
}

export interface QuickActionRepository {
  createQuickAction(input: CreateQuickActionInput): QuickActionRecord;
  consumeQuickAction(id: string, operatorId: string): QuickActionRecord | undefined;
  findActiveQuickAction(scope: {
    missionId?: string;
    runId?: string;
    approvalRequestId?: string;
    actionType: QuickActionRecord["actionType"];
  }): QuickActionRecord | undefined;
  listQuickActions(workspaceId?: string): QuickActionRecord[];
}

export interface RuntimeBundleRepository {
  createMissionBundle(input: CreateMissionBundleInput): CreateMissionBundleResult;
  recordRouteDecisionBundle(input: RecordRouteDecisionBundleInput): RecordRouteDecisionBundleResult | undefined;
  createApprovalRequestBundle(input: CreateApprovalRequestBundleInput): CreateApprovalRequestBundleResult | undefined;
  resolveApprovalDecisionBundle(input: ResolveApprovalDecisionBundleInput): ResolveApprovalDecisionBundleResult | undefined;
  consumeQuickActionBundle(input: ConsumeQuickActionBundleInput): ConsumeQuickActionBundleResult | undefined;
  completeRunBundle(input: CompleteRunBundleInput): CompleteRunBundleResult | undefined;
  failRunBundle(input: FailRunBundleInput): FailRunBundleResult | undefined;
  pauseRunBundle(input: PauseRunBundleInput): PauseRunBundleResult | undefined;
  resumeRunBundle(input: ResumeRunBundleInput): ResumeRunBundleResult | undefined;
  retryRunBundle(input: RetryRunBundleInput): RetryRunBundleResult | undefined;
  startRunExecutionBundle(input: StartRunExecutionBundleInput): StartRunExecutionBundleResult | undefined;
  appendChatExchangeBundle(input: AppendChatExchangeBundleInput): AppendChatExchangeBundleResult;
}

export interface AgentOSRepository
  extends WorkspaceRepository,
    OperatorRepository,
    MissionRepository,
    MissionRunRepository,
    MissionLogRepository,
    ApprovalRepository,
    AuditRepository,
    MemoryRepository,
    RoutineRepository,
    SessionRepository,
    RoutingDecisionRepository,
    UsageRepository,
    ChatRepository,
    QuickActionRepository,
    RuntimeBundleRepository {}
