import type { PersistenceAdapter } from "../index";

export class PostgresPersistenceAdapter implements PersistenceAdapter {
  readonly filePath = "postgres://agentos-hosted-placeholder";

  private unsupported(): never {
    throw new Error(
      "PostgresPersistenceAdapter is a host-ready scaffold only. SQLite remains the active local adapter until a hosted Postgres connection and migration flow are introduced."
    );
  }

  ensureInitialized() {
    this.unsupported();
  }

  reset() {
    this.unsupported();
  }

  snapshot() {
    return this.unsupported();
  }

  mutate() {
    return this.unsupported();
  }

  getOrCreateDefaultWorkspace() {
    return this.unsupported();
  }

  listWorkspaces() {
    return this.unsupported();
  }

  getOrCreateDefaultOperator() {
    return this.unsupported();
  }

  listOperators() {
    return this.unsupported();
  }

  createMission() {
    return this.unsupported();
  }

  getMissionById() {
    return this.unsupported();
  }

  listMissionsForWorkspace() {
    return this.unsupported();
  }

  updateMissionStatus() {
    return this.unsupported();
  }

  createMissionRun() {
    return this.unsupported();
  }

  getMissionRunById() {
    return this.unsupported();
  }

  claimNextQueuedRun() {
    return this.unsupported();
  }

  releaseRunLease() {
    return this.unsupported();
  }

  failRun() {
    return this.unsupported();
  }

  completeRun() {
    return this.unsupported();
  }

  appendMissionLog() {
    return this.unsupported();
  }

  listMissionLogs() {
    return this.unsupported();
  }

  createApprovalRequest() {
    return this.unsupported();
  }

  resolveApprovalRequest() {
    return this.unsupported();
  }

  listPendingApprovals() {
    return this.unsupported();
  }

  appendAuditEvent() {
    return this.unsupported();
  }

  listAuditEvents() {
    return this.unsupported();
  }

  createArchiveEntry() {
    return this.unsupported();
  }

  archiveMemoryEntry() {
    return this.unsupported();
  }

  createRoutine() {
    return this.unsupported();
  }

  getRoutineById() {
    return this.unsupported();
  }

  updateRoutine() {
    return this.unsupported();
  }

  createSession() {
    return this.unsupported();
  }

  getSessionById() {
    return this.unsupported();
  }

  updateSession() {
    return this.unsupported();
  }

  createRoutingDecision() {
    return this.unsupported();
  }

  listRoutingDecisionsForMission() {
    return this.unsupported();
  }

  appendUsageEvent() {
    return this.unsupported();
  }

  listUsageEvents() {
    return this.unsupported();
  }

  listBudgets() {
    return this.unsupported();
  }

  createChatThread() {
    return this.unsupported();
  }

  appendChatMessage() {
    return this.unsupported();
  }

  listChatThreads() {
    return this.unsupported();
  }

  listChatMessages() {
    return this.unsupported();
  }

  createQuickAction() {
    return this.unsupported();
  }

  consumeQuickAction() {
    return this.unsupported();
  }

  findActiveQuickAction() {
    return this.unsupported();
  }

  listQuickActions() {
    return this.unsupported();
  }

  createMissionBundle() {
    return this.unsupported();
  }

  recordRouteDecisionBundle() {
    return this.unsupported();
  }

  createApprovalRequestBundle() {
    return this.unsupported();
  }

  resolveApprovalDecisionBundle() {
    return this.unsupported();
  }

  consumeQuickActionBundle() {
    return this.unsupported();
  }

  completeRunBundle() {
    return this.unsupported();
  }

  failRunBundle() {
    return this.unsupported();
  }

  pauseRunBundle() {
    return this.unsupported();
  }

  resumeRunBundle() {
    return this.unsupported();
  }

  retryRunBundle() {
    return this.unsupported();
  }

  startRunExecutionBundle() {
    return this.unsupported();
  }

  appendChatExchangeBundle() {
    return this.unsupported();
  }
}
