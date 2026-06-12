import type { AgentOSDatabase, PersistenceAdapter } from "../index";
import { buildSeedDatabase } from "../index";
import type {
  AppendAuditInput,
  AppendUsageEventInput,
  ClaimRunOptions,
  ClaimRunResult,
  CompleteRunBundleInput,
  CompleteRunBundleResult,
  CompleteRunInput,
  ConsumeQuickActionBundleInput,
  ConsumeQuickActionBundleResult,
  CreateApprovalInput,
  CreateApprovalRequestBundleInput,
  CreateApprovalRequestBundleResult,
  CreateChatMessageInput,
  CreateChatThreadInput,
  CreateMissionBundleInput,
  CreateMissionBundleResult,
  CreateMissionInput,
  CreateMissionRunInput,
  CreateQuickActionInput,
  CreateRoutingDecisionInput,
  FailRunBundleInput,
  FailRunBundleResult,
  FailRunInput,
  RecordRouteDecisionBundleInput,
  RecordRouteDecisionBundleResult,
  ReleaseRunLeaseInput,
  ResolveApprovalDecisionBundleInput,
  ResolveApprovalDecisionBundleResult
} from "../repository";
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
  QuickActionRecord,
  RoutineRecord,
  SessionRecord,
  UsageBudget,
  UsageEvent,
  WorkspaceRecord
} from "@agentos/shared";

/** Raised when the hosted Postgres connection string is still a placeholder. */
export class PostgresNotConnectedError extends Error {
  readonly code = "POSTGRES_NOT_CONNECTED" as const;
  readonly method: string;

  constructor(method: string, detail?: string) {
    super(
      detail ??
        `PostgresPersistenceAdapter.${method} requires a hosted Postgres connection. SQLite remains the active local adapter until AGENTOS_DATABASE_URL is configured.`
    );
    this.name = "PostgresNotConnectedError";
    this.method = method;
  }
}

/** Raised for methods that are intentionally deferred on the Postgres adapter. */
export class PostgresNotImplementedError extends Error {
  readonly code = "POSTGRES_NOT_IMPLEMENTED" as const;
  readonly method: string;

  constructor(method: string, detail?: string) {
    super(
      detail ??
        `PostgresPersistenceAdapter.${method} is not implemented yet. SQLite remains the active local adapter.`
    );
    this.name = "PostgresNotImplementedError";
    this.method = method;
  }
}

/**
 * Planned SQL for hosted bundle transactions. These strings document the target
 * Postgres shape; execution requires a real `pg` pool wired to AGENTOS_DATABASE_URL.
 */
export const POSTGRES_BUNDLE_SQL = {
  createMissionBundle: `
BEGIN;
  INSERT INTO missions (...) VALUES (...);
  INSERT INTO mission_runs (...) VALUES (...);
  -- optional routing_decisions, chat_threads, chat_messages inserts
  INSERT INTO audit_events (...) VALUES (...);
COMMIT;`,
  recordRouteDecisionBundle: `
BEGIN;
  INSERT INTO routing_decisions (...) VALUES (...);
  UPDATE missions SET operator_id = $1, latest_run_id = $2, payload_json = $3 WHERE id = $4;
  UPDATE mission_runs SET route_decision_id = $1, operator_id = $2 WHERE id = $3;
  INSERT INTO mission_logs (...) VALUES (...);
  INSERT INTO audit_events (...) VALUES (...);
COMMIT;`,
  resolveApprovalDecisionBundle: `
BEGIN;
  UPDATE approval_requests SET status = $1, resolved_at = $2 WHERE id = $3;
  UPDATE quick_actions SET expires_at = $1 WHERE approval_request_id = $2 AND consumed_at IS NULL;
  UPDATE mission_runs SET status = $1, approval_request_id = $2, lease fields cleared WHERE id = $3;
  UPDATE missions SET status = $1 WHERE id = $2;
  INSERT INTO audit_events (...) VALUES (...);
COMMIT;`
} as const;

/**
 * Hosted worker lease claim. Postgres workers should atomically claim the next
 * queued run using `FOR UPDATE SKIP LOCKED` inside a single transaction:
 *
 * ```sql
 * BEGIN;
 * SELECT id FROM mission_runs
 *   WHERE status = 'queued'
 *      OR (status IN ('planning', 'running') AND lease_expires_at < NOW())
 *   ORDER BY sort_order ASC
 *   FOR UPDATE SKIP LOCKED
 *   LIMIT 1;
 * UPDATE mission_runs
 *   SET status = 'planning',
 *       claimed_by_worker_id = $1,
 *       claimed_at = NOW(),
 *       lease_expires_at = NOW() + ($2 * INTERVAL '1 millisecond'),
 *       attempt_count = COALESCE(attempt_count, 0) + 1
 *   WHERE id = $3
 *   RETURNING *;
 * COMMIT;
 * ```
 */
export const POSTGRES_CLAIM_NEXT_QUEUED_RUN_SQL = `
SELECT id FROM mission_runs
  WHERE status = 'queued'
     OR (status IN ('planning', 'running') AND lease_expires_at < NOW())
  ORDER BY sort_order ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;`;

export class PostgresPersistenceAdapter implements PersistenceAdapter {
  readonly filePath: string;

  constructor(connectionString = process.env.AGENTOS_DATABASE_URL ?? "postgres://agentos-hosted-placeholder") {
    this.filePath = connectionString;
  }

  private get isConnected(): boolean {
    return !this.filePath.includes("agentos-hosted-placeholder");
  }

  private requireConnection(method: string): void {
    if (!this.isConnected) {
      throw new PostgresNotConnectedError(method);
    }
  }

  private notImplemented(method: string): never {
    throw new PostgresNotImplementedError(method);
  }

  private requireConnectionForWrite(method: string): void {
    this.requireConnection(method);
  }

  private bundleNotReady(method: keyof typeof POSTGRES_BUNDLE_SQL): never {
    throw new PostgresNotConnectedError(
      method,
      `PostgresPersistenceAdapter.${method} is scaffolded for hosted transactions but requires AGENTOS_DATABASE_URL. Planned SQL: ${POSTGRES_BUNDLE_SQL[method].trim()}`
    );
  }

  ensureInitialized() {
    this.requireConnectionForWrite("ensureInitialized");
  }

  reset(_database?: AgentOSDatabase) {
    this.requireConnectionForWrite("reset");
  }

  snapshot(): AgentOSDatabase {
    return buildSeedDatabase();
  }

  mutate<T>(_mutator: (database: AgentOSDatabase) => T): T {
    return this.notImplemented("mutate");
  }

  getOrCreateDefaultWorkspace(): WorkspaceRecord {
    return this.notImplemented("getOrCreateDefaultWorkspace");
  }

  listWorkspaces(): WorkspaceRecord[] {
    return this.snapshot().workspaces;
  }

  getOrCreateDefaultOperator(): OperatorRecord {
    return this.notImplemented("getOrCreateDefaultOperator");
  }

  listOperators(workspaceId?: string): OperatorRecord[] {
    return this.snapshot().operators.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  createMission(_input: CreateMissionInput): MissionRecord {
    return this.notImplemented("createMission");
  }

  getMissionById(id: string): MissionRecord | undefined {
    return this.snapshot().missions.find((item) => item.id === id);
  }

  listMissionsForWorkspace(workspaceId: string): MissionRecord[] {
    return this.snapshot().missions.filter((item) => item.workspaceId === workspaceId);
  }

  updateMissionStatus(
    _id: string,
    _status: MissionRecord["status"],
    _updates?: Partial<MissionRecord>
  ): MissionRecord | undefined {
    return this.notImplemented("updateMissionStatus");
  }

  createMissionRun(_input: CreateMissionRunInput): MissionRun {
    return this.notImplemented("createMissionRun");
  }

  getMissionRunById(id: string): MissionRun | undefined {
    return this.snapshot().missionRuns.find((item) => item.id === id);
  }

  /**
   * Claims the next queued mission run for a hosted worker.
   *
   * Local SQLite uses an in-process transaction; hosted Postgres should use
   * {@link POSTGRES_CLAIM_NEXT_QUEUED_RUN_SQL} with `FOR UPDATE SKIP LOCKED`
   * so concurrent workers do not block on the same row.
   */
  claimNextQueuedRun(_options: ClaimRunOptions): ClaimRunResult {
    if (!this.isConnected) {
      return {
        ok: false,
        reason:
          "Postgres connection not configured. Configure AGENTOS_DATABASE_URL to enable hosted lease claims."
      };
    }
    return this.notImplemented("claimNextQueuedRun");
  }

  releaseRunLease(_input: ReleaseRunLeaseInput): MissionRun | undefined {
    return this.notImplemented("releaseRunLease");
  }

  failRun(_input: FailRunInput): MissionRun | undefined {
    return this.notImplemented("failRun");
  }

  completeRun(_input: CompleteRunInput): MissionRun | undefined {
    return this.notImplemented("completeRun");
  }

  appendMissionLog(_runId: string, _level: MissionRunLog["level"], _message: string): MissionRunLog {
    return this.notImplemented("appendMissionLog");
  }

  listMissionLogs(runId: string): MissionRunLog[] {
    return this.snapshot().missionLogs.filter((item) => item.runId === runId);
  }

  createApprovalRequest(_input: CreateApprovalInput): ApprovalRecord {
    return this.notImplemented("createApprovalRequest");
  }

  resolveApprovalRequest(
    _id: string,
    _status: ApprovalRecord["status"],
    _scope?: ApprovalScope
  ): ApprovalRecord | undefined {
    return this.notImplemented("resolveApprovalRequest");
  }

  listPendingApprovals(): ApprovalRecord[] {
    return this.snapshot().approvals.filter((item) => item.status === "pending");
  }

  appendAuditEvent(_input: AppendAuditInput): AuditEvent {
    return this.notImplemented("appendAuditEvent");
  }

  listAuditEvents(workspaceId?: string): AuditEvent[] {
    return this.snapshot().auditEvents.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  createArchiveEntry(
    _input: Omit<MemoryRecord, "id" | "workspaceId" | "createdAt" | "updatedAt">
  ): MemoryRecord {
    return this.notImplemented("createArchiveEntry");
  }

  archiveMemoryEntry(_id: string): MemoryRecord | undefined {
    return this.notImplemented("archiveMemoryEntry");
  }

  createRoutine(_input: Partial<RoutineRecord>): RoutineRecord {
    return this.notImplemented("createRoutine");
  }

  getRoutineById(id: string): RoutineRecord | undefined {
    return this.snapshot().routines.find((item) => item.id === id);
  }

  updateRoutine(_id: string, _updates: Partial<RoutineRecord>): RoutineRecord | undefined {
    return this.notImplemented("updateRoutine");
  }

  createSession(_input: Partial<SessionRecord>): SessionRecord {
    return this.notImplemented("createSession");
  }

  getSessionById(id: string): SessionRecord | undefined {
    return this.snapshot().sessions.find((item) => item.id === id);
  }

  updateSession(_id: string, _updates: Partial<SessionRecord>): SessionRecord | undefined {
    return this.notImplemented("updateSession");
  }

  createRoutingDecision(_input: CreateRoutingDecisionInput): AgentRoutingDecisionRecord {
    return this.notImplemented("createRoutingDecision");
  }

  listRoutingDecisionsForMission(missionId: string): AgentRoutingDecisionRecord[] {
    return this.snapshot().routingDecisions.filter((item) => item.missionId === missionId);
  }

  appendUsageEvent(_input: AppendUsageEventInput): UsageEvent {
    return this.notImplemented("appendUsageEvent");
  }

  listUsageEvents(workspaceId?: string): UsageEvent[] {
    return this.snapshot().usageEvents.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  listBudgets(workspaceId?: string): UsageBudget[] {
    return this.snapshot().budgets.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  createChatThread(_input: CreateChatThreadInput): ChatThreadRecord {
    return this.notImplemented("createChatThread");
  }

  appendChatMessage(_input: CreateChatMessageInput): ChatMessageRecord {
    return this.notImplemented("appendChatMessage");
  }

  listChatThreads(workspaceId?: string): ChatThreadRecord[] {
    return this.snapshot().chatThreads.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  listChatMessages(threadId: string): ChatMessageRecord[] {
    return this.snapshot().chatMessages.filter((item) => item.threadId === threadId);
  }

  createQuickAction(_input: CreateQuickActionInput): QuickActionRecord {
    return this.notImplemented("createQuickAction");
  }

  consumeQuickAction(_id: string, _operatorId: string): QuickActionRecord | undefined {
    return this.notImplemented("consumeQuickAction");
  }

  findActiveQuickAction(_scope: {
    missionId?: string;
    runId?: string;
    approvalRequestId?: string;
    actionType: QuickActionRecord["actionType"];
  }): QuickActionRecord | undefined {
    return this.notImplemented("findActiveQuickAction");
  }

  listQuickActions(workspaceId?: string): QuickActionRecord[] {
    return this.snapshot().quickActions.filter((item) => !workspaceId || item.workspaceId === workspaceId);
  }

  createMissionBundle(_input: CreateMissionBundleInput): CreateMissionBundleResult {
    return this.bundleNotReady("createMissionBundle");
  }

  recordRouteDecisionBundle(
    _input: RecordRouteDecisionBundleInput
  ): RecordRouteDecisionBundleResult | undefined {
    return this.bundleNotReady("recordRouteDecisionBundle");
  }

  createApprovalRequestBundle(
    _input: CreateApprovalRequestBundleInput
  ): CreateApprovalRequestBundleResult | undefined {
    return this.notImplemented("createApprovalRequestBundle");
  }

  resolveApprovalDecisionBundle(
    _input: ResolveApprovalDecisionBundleInput
  ): ResolveApprovalDecisionBundleResult | undefined {
    return this.bundleNotReady("resolveApprovalDecisionBundle");
  }

  consumeQuickActionBundle(
    _input: ConsumeQuickActionBundleInput
  ): ConsumeQuickActionBundleResult | undefined {
    return this.notImplemented("consumeQuickActionBundle");
  }

  completeRunBundle(_input: CompleteRunBundleInput): CompleteRunBundleResult | undefined {
    return this.notImplemented("completeRunBundle");
  }

  failRunBundle(_input: FailRunBundleInput): FailRunBundleResult | undefined {
    return this.notImplemented("failRunBundle");
  }

  pauseRunBundle(_input: import("../repository").PauseRunBundleInput) {
    return this.notImplemented("pauseRunBundle");
  }

  resumeRunBundle(_input: import("../repository").ResumeRunBundleInput) {
    return this.notImplemented("resumeRunBundle");
  }

  retryRunBundle(_input: import("../repository").RetryRunBundleInput) {
    return this.notImplemented("retryRunBundle");
  }

  startRunExecutionBundle(_input: import("../repository").StartRunExecutionBundleInput) {
    return this.notImplemented("startRunExecutionBundle");
  }

  appendChatExchangeBundle(_input: import("../repository").AppendChatExchangeBundleInput) {
    return this.notImplemented("appendChatExchangeBundle");
  }
}
