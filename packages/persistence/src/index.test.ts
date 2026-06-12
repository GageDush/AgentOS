import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { JsonFilePersistenceAdapter, SqlitePersistenceAdapter, buildSeedDatabase } from "./index";
import { PostgresPersistenceAdapter } from "./adapters/postgres";

describe("sql repository adapter", () => {
  it("initializes default workspace and operator", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    expect(adapter.getOrCreateDefaultWorkspace().slug).toBe("local");
    expect(adapter.getOrCreateDefaultOperator().authMode).toBe("local-default");
  });

  it("creates, gets, and lists missions through the repository", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const workspace = adapter.getOrCreateDefaultWorkspace();
    const mission = adapter.createMission({
      title: "Repository-created mission",
      objective: "Exercise the mission repository.",
      command: "git status",
      status: "queued"
    });
    expect(adapter.getMissionById(mission.id)?.title).toBe("Repository-created mission");
    expect(adapter.listMissionsForWorkspace(workspace.id).some((item) => item.id === mission.id)).toBe(true);
  });

  it("creates runs and claims the next queued run", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const mission = adapter.createMission({ title: "Claim me", command: "git status", status: "queued" });
    const run = adapter.createMissionRun({
      workspaceId: mission.workspaceId,
      missionId: mission.id,
      sessionId: mission.sessionId,
      requestedByOperatorId: mission.requestedByOperatorId,
      operatorId: mission.operatorId,
      provider: mission.provider,
      model: mission.model,
      status: "queued",
      commandPolicy: "auto_allowed",
      requestedCommand: mission.command
    });
    const claimed = adapter.claimNextQueuedRun({
      workerId: "worker-test",
      maxAttempts: 3,
      leaseDurationMs: 60_000,
      specificRunId: run.id
    });
    expect(claimed.ok).toBe(true);
    if (claimed.ok) {
      expect(claimed.run.claimedByWorkerId).toBe("worker-test");
      expect(claimed.run.attemptCount).toBe(1);
    }
  });

  it("reclaims expired leases and respects max attempts", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    adapter.mutate((database) => {
      const run = database.missionRuns[0]!;
      run.status = "running";
      run.claimedByWorkerId = "worker-old";
      run.claimedAt = new Date(Date.now() - 120_000).toISOString();
      run.leaseExpiresAt = new Date(Date.now() - 60_000).toISOString();
      run.attemptCount = 0;
      database.missions.find((item) => item.id === run.missionId)!.status = "running";
    });
    const reclaimed = adapter.claimNextQueuedRun({
      workerId: "worker-new",
      maxAttempts: 3,
      leaseDurationMs: 60_000
    });
    expect(reclaimed.ok).toBe(true);
    if (reclaimed.ok) {
      expect(reclaimed.reclaimed).toBe(true);
      expect(reclaimed.run.claimedByWorkerId).toBe("worker-new");
    }

    adapter.mutate((database) => {
      const run = database.missionRuns[0]!;
      run.status = "queued";
      run.attemptCount = 3;
      run.claimedByWorkerId = undefined;
      run.leaseExpiresAt = undefined;
    });
    const denied = adapter.claimNextQueuedRun({
      workerId: "worker-new",
      maxAttempts: 3,
      leaseDurationMs: 60_000
    });
    expect(denied.ok).toBe(false);
  });

  it("resolves approvals and appends audit events", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const pending = adapter.listPendingApprovals()[0]!;
    const resolved = adapter.resolveApprovalRequest(pending.id, "approved", "once");
    expect(resolved?.status).toBe("approved");
    const audit = adapter.appendAuditEvent({
      event: "test.audit",
      actor: "vitest",
      summary: "Repository audit event"
    });
    expect(adapter.listAuditEvents().some((item) => item.id === audit.id)).toBe(true);
  });

  it("deduplicates and consumes quick actions", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const actionA = adapter.createQuickAction({
      missionId: "mission-a",
      runId: "run-a",
      label: "Approve",
      emoji: "✅",
      actionType: "approve",
      riskLevel: "medium"
    });
    const actionB = adapter.createQuickAction({
      missionId: "mission-a",
      runId: "run-a",
      label: "Approve",
      emoji: "✅",
      actionType: "approve",
      riskLevel: "medium"
    });
    expect(actionB.id).toBe(actionA.id);
    const consumed = adapter.consumeQuickAction(actionA.id, "operator-local");
    expect(consumed?.consumedByOperatorId).toBe("operator-local");
    expect(adapter.findActiveQuickAction({ missionId: "mission-a", runId: "run-a", actionType: "approve" })).toBeUndefined();
  });

  it("keeps snapshot compatibility after repository writes", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const mission = adapter.createMission({ title: "Snapshot mission", command: "git status" });
    const snapshot = adapter.snapshot();
    expect(snapshot.missions.some((item) => item.id === mission.id)).toBe(true);
  });

  it("creates a mission bundle atomically", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const created = adapter.createMissionBundle({
      mission: {
        title: "Bundle mission",
        command: "git status",
        status: "queued"
      },
      initialRun: {
        status: "queued",
        commandPolicy: "auto_allowed",
        requestedCommand: "git status"
      },
      audit: {
        actor: "vitest",
        summary: "Created bundle mission"
      }
    });
    expect(created.mission.latestRunId).toBe(created.run.id);
    expect(adapter.snapshot().auditEvents.some((event) => event.summary === "Created bundle mission")).toBe(true);
  });

  it("creates approval bundle with quick actions and audit", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const mission = adapter.createMission({ title: "Approval bundle", command: "pnpm install", status: "queued" });
    const run = adapter.createMissionRun({
      workspaceId: mission.workspaceId,
      missionId: mission.id,
      sessionId: mission.sessionId,
      requestedByOperatorId: mission.requestedByOperatorId,
      operatorId: mission.operatorId,
      provider: mission.provider,
      model: mission.model,
      status: "running",
      commandPolicy: "approval_required",
      requestedCommand: mission.command
    });
    const bundle = adapter.createApprovalRequestBundle({
      approval: {
        workspaceId: mission.workspaceId,
        requestedByOperatorId: mission.requestedByOperatorId,
        agentId: run.operatorId,
        missionId: mission.id,
        sessionId: mission.sessionId,
        runId: run.id,
        tool: "command.execute",
        permissionLevel: "dependency_install",
        inputSummary: "Needs install approval",
        scope: "once",
        command: mission.command
      },
      quickActions: [
        { label: "Approve", emoji: "✅", actionType: "approve", riskLevel: "medium" },
        { label: "Deny", emoji: "❌", actionType: "deny", riskLevel: "medium" }
      ],
      releaseRunLease: true,
      runStatus: "awaiting_approval",
      missionStatus: "awaiting_approval",
      logMessage: "Approval requested."
    });
    expect(bundle?.approval.status).toBe("pending");
    expect(bundle?.quickActions).toHaveLength(2);
    expect(adapter.getMissionRunById(run.id)?.status).toBe("awaiting_approval");
  });

  it("resolves approval bundle atomically and expires approval actions", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const mission = adapter.createMission({ title: "Resolve approval", command: "pnpm install", status: "queued" });
    const run = adapter.createMissionRun({
      workspaceId: mission.workspaceId,
      missionId: mission.id,
      sessionId: mission.sessionId,
      requestedByOperatorId: mission.requestedByOperatorId,
      operatorId: mission.operatorId,
      provider: mission.provider,
      model: mission.model,
      status: "awaiting_approval",
      commandPolicy: "approval_required",
      requestedCommand: mission.command
    });
    const approvalBundle = adapter.createApprovalRequestBundle({
      approval: {
        workspaceId: mission.workspaceId,
        requestedByOperatorId: mission.requestedByOperatorId,
        agentId: run.operatorId,
        missionId: mission.id,
        sessionId: mission.sessionId,
        runId: run.id,
        tool: "command.execute",
        permissionLevel: "dependency_install",
        inputSummary: "Needs install approval",
        scope: "once",
        command: mission.command
      },
      quickActions: [{ label: "Approve", emoji: "✅", actionType: "approve", riskLevel: "medium" }]
    })!;
    const resolved = adapter.resolveApprovalDecisionBundle({
      approvalId: approvalBundle.approval.id,
      status: "approved",
      scope: "once",
      operatorId: "operator-local",
      runStatus: "queued",
      missionStatus: "queued",
      logMessage: "Approved and queued."
    });
    expect(resolved?.approval.status).toBe("approved");
    expect(resolved?.run?.status).toBe("queued");
    expect(resolved?.expiredQuickActionIds.length).toBeGreaterThan(0);
  });

  it("consumes quick action bundle and audits it", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const action = adapter.createQuickAction({
      missionId: "mission-bundle",
      runId: "run-bundle",
      label: "Pause",
      emoji: "⏸️",
      actionType: "pause",
      riskLevel: "low"
    });
    const consumed = adapter.consumeQuickActionBundle({
      actionId: action.id,
      operatorId: "operator-local"
    });
    expect(consumed?.action.consumedByOperatorId).toBe("operator-local");
    expect(consumed?.auditEvent.event).toBe("quick_action.bundle_consumed");
  });

  it("completes a run bundle with archive and usage persistence", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const mission = adapter.createMission({ title: "Complete bundle", command: "git status", status: "queued" });
    const run = adapter.createMissionRun({
      workspaceId: mission.workspaceId,
      missionId: mission.id,
      sessionId: mission.sessionId,
      requestedByOperatorId: mission.requestedByOperatorId,
      operatorId: mission.operatorId,
      provider: mission.provider,
      model: mission.model,
      status: "running",
      commandPolicy: "auto_allowed",
      requestedCommand: mission.command
    });
    const completed = adapter.completeRunBundle({
      runId: run.id,
      missionId: mission.id,
      summary: "Completed successfully.",
      stdout: "clean",
      archiveEntry: {
        id: "archive-complete",
        workspaceId: mission.workspaceId,
        type: "task_memory",
        title: "Complete bundle archive",
        content: "done",
        source: "mission-run",
        missionId: mission.id,
        runId: run.id,
        agentId: run.operatorId,
        tags: ["complete"],
        importance: 6,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      usageEvent: {
        workspaceId: mission.workspaceId,
        provider: "local-gateway",
        model: "mock_local",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        agentId: run.operatorId,
        runId: run.id
      }
    });
    expect(completed?.run.status).toBe("completed");
    expect(completed?.archiveEntry?.title).toBe("Complete bundle archive");
    expect(completed?.usageEvent?.provider).toBe("local-gateway");
  });

  it("fails a run bundle and creates a retry quick action", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const mission = adapter.createMission({ title: "Fail bundle", command: "git status", status: "queued" });
    const run = adapter.createMissionRun({
      workspaceId: mission.workspaceId,
      missionId: mission.id,
      sessionId: mission.sessionId,
      requestedByOperatorId: mission.requestedByOperatorId,
      operatorId: mission.operatorId,
      provider: mission.provider,
      model: mission.model,
      status: "running",
      commandPolicy: "auto_allowed",
      requestedCommand: mission.command
    });
    const failed = adapter.failRunBundle({
      runId: run.id,
      missionId: mission.id,
      error: "boom",
      logMessage: "boom",
      retryQuickAction: {
        label: "Retry",
        emoji: "🔁",
        actionType: "retry",
        riskLevel: "medium"
      }
    });
    expect(failed?.run.status).toBe("failed");
    expect(failed?.retryQuickAction?.actionType).toBe("retry");
  });

  it("pauses, resumes, and retries runs through repository bundles", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const mission = adapter.createMission({ title: "Lifecycle bundle", command: "git status", status: "queued" });
    const run = adapter.createMissionRun({
      workspaceId: mission.workspaceId,
      missionId: mission.id,
      sessionId: mission.sessionId,
      requestedByOperatorId: mission.requestedByOperatorId,
      operatorId: mission.operatorId,
      provider: mission.provider,
      model: mission.model,
      status: "running",
      commandPolicy: "auto_allowed",
      requestedCommand: mission.command
    });
    const paused = adapter.pauseRunBundle({ runId: run.id, actor: "operator-local" });
    expect(paused?.run.status).toBe("paused");
    expect(paused?.resumeQuickAction.actionType).toBe("resume");
    const resumed = adapter.resumeRunBundle({ runId: run.id, actor: "operator-local" });
    expect(resumed?.run.status).toBe("queued");
    const retried = adapter.retryRunBundle({ runId: run.id, actor: "operator-local" });
    expect(retried?.run.id).not.toBe(run.id);
    expect(retried?.mission.latestRunId).toBe(retried?.run.id);
  });

  it("starts run execution and appends chat exchange bundles", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const mission = adapter.createMission({ title: "Start bundle", command: "git status", status: "queued" });
    const run = adapter.createMissionRun({
      workspaceId: mission.workspaceId,
      missionId: mission.id,
      sessionId: mission.sessionId,
      requestedByOperatorId: mission.requestedByOperatorId,
      operatorId: mission.operatorId,
      provider: mission.provider,
      model: mission.model,
      status: "planning",
      commandPolicy: "auto_allowed",
      requestedCommand: mission.command
    });
    const started = adapter.startRunExecutionBundle({ runId: run.id, actor: "worker-local" });
    expect(started?.run.status).toBe("running");
    expect(started?.auditEvent.event).toBe("command.execution_started");
    const thread = adapter.createChatThread({ title: "Lifecycle thread", scope: "run", missionId: mission.id, runId: run.id });
    const exchange = adapter.appendChatExchangeBundle({
      threadId: thread.id,
      userMessage: {
        threadId: thread.id,
        role: "user",
        content: "show details",
        operatorId: "operator-local",
        missionId: mission.id,
        runId: run.id
      },
      assistantMessage: {
        threadId: thread.id,
        role: "assistant",
        content: "Mission details here",
        operatorId: "operator-local",
        missionId: mission.id,
        runId: run.id
      },
      audit: {
        event: "chat.message_received",
        actor: "operator-local",
        summary: "show details",
        missionId: mission.id,
        runId: run.id
      }
    });
    expect(exchange.userMessage?.threadId).toBe(thread.id);
    expect(exchange.assistantMessage?.content).toBe("Mission details here");
  });

  it("imports legacy json state into sql when the database is first created", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const legacyPath = join(dir, "agentos-local.json");
    const dbPath = join(dir, "agentos-local.db");
    const legacy = buildSeedDatabase();
    legacy.missions.unshift({
      ...legacy.missions[0],
      id: "mission-from-json",
      title: "Imported legacy mission"
    });
    writeFileSync(legacyPath, JSON.stringify(legacy, null, 2), "utf8");
    process.env.AGENTOS_JSON_FALLBACK_PATH = legacyPath;
    const adapter = new SqlitePersistenceAdapter(dbPath);
    expect(adapter.snapshot().missions.some((mission) => mission.id === "mission-from-json")).toBe(true);
    delete process.env.AGENTOS_JSON_FALLBACK_PATH;
  });
});

describe("json fallback adapter", () => {
  it("supports compatibility reads and writes", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-persist-"));
    const adapter = new JsonFilePersistenceAdapter(join(dir, "agentos.json"));
    const action = adapter.createQuickAction({
      missionId: "mission-json",
      label: "Approve",
      emoji: "✅",
      actionType: "approve",
      riskLevel: "medium"
    });
    const consumed = adapter.consumeQuickAction(action.id, "operator-local");
    expect(consumed?.consumedByOperatorId).toBe("operator-local");
  });
});

describe("postgres adapter scaffold", () => {
  const bundleMethods = [
    "createMissionBundle",
    "recordRouteDecisionBundle",
    "createApprovalRequestBundle",
    "resolveApprovalDecisionBundle",
    "consumeQuickActionBundle",
    "completeRunBundle",
    "failRunBundle",
    "pauseRunBundle",
    "resumeRunBundle",
    "retryRunBundle",
    "startRunExecutionBundle",
    "appendChatExchangeBundle"
  ] as const;

  it("exposes the full PersistenceAdapter method surface", () => {
    const adapter = new PostgresPersistenceAdapter();
    for (const method of bundleMethods) {
      expect(typeof adapter[method]).toBe("function");
    }
    expect(typeof adapter.claimNextQueuedRun).toBe("function");
    expect(adapter.filePath).toMatch(/^postgres:\/\//);
  });

  it("serves read-only snapshot paths without throwing", () => {
    const adapter = new PostgresPersistenceAdapter();
    expect(() => adapter.snapshot()).not.toThrow();
    expect(() => adapter.listWorkspaces()).not.toThrow();
    expect(() => adapter.listOperators()).not.toThrow();
    expect(() => adapter.getMissionById("mission-missing")).not.toThrow();
    expect(() => adapter.listMissionsForWorkspace("workspace-default")).not.toThrow();
    expect(() => adapter.getMissionRunById("run-missing")).not.toThrow();
    expect(() => adapter.listMissionLogs("run-missing")).not.toThrow();
    expect(() => adapter.listPendingApprovals()).not.toThrow();
    expect(() => adapter.listAuditEvents()).not.toThrow();
    expect(() => adapter.getRoutineById("routine-missing")).not.toThrow();
    expect(() => adapter.getSessionById("session-missing")).not.toThrow();
    expect(() => adapter.listRoutingDecisionsForMission("mission-missing")).not.toThrow();
    expect(() => adapter.listUsageEvents()).not.toThrow();
    expect(() => adapter.listBudgets()).not.toThrow();
    expect(() => adapter.listChatThreads()).not.toThrow();
    expect(() => adapter.listChatMessages("thread-missing")).not.toThrow();
    expect(() => adapter.listQuickActions()).not.toThrow();

    const snapshot = adapter.snapshot();
    expect(snapshot.schemaVersion).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.workspaces)).toBe(true);
  });

  it("returns a structured not-connected result for hosted lease claims", () => {
    const adapter = new PostgresPersistenceAdapter();
    const result = adapter.claimNextQueuedRun({
      workerId: "worker-1",
      maxAttempts: 3,
      leaseDurationMs: 30_000
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/AGENTOS_DATABASE_URL/i);
    }
  });

  it("uses documented bundle scaffolds instead of blanket unsupported errors", () => {
    const adapter = new PostgresPersistenceAdapter();
    expect(() =>
      adapter.createMissionBundle({
        mission: { title: "Hosted mission" }
      })
    ).toThrow(/createMissionBundle.*AGENTOS_DATABASE_URL/i);
    expect(() =>
      adapter.recordRouteDecisionBundle({
        missionId: "mission-1",
        routeDecision: {
          id: "route-1",
          workspaceId: "workspace-default",
          missionId: "mission-1",
          taskType: "code_change",
          complexity: "simple",
          riskLevel: "low",
          selectedPrimaryAgentId: "agent-1",
          supportingAgentIds: [],
          skippedAgents: [],
          requiredGates: [],
          providerLane: "mock_local",
          routeConfidence: 1,
          reason: "test",
          createdAt: new Date().toISOString()
        }
      })
    ).toThrow(/recordRouteDecisionBundle.*Planned SQL/i);
    expect(() =>
      adapter.resolveApprovalDecisionBundle({
        approvalId: "approval-1",
        status: "approved",
        operatorId: "operator-1"
      })
    ).toThrow(/resolveApprovalDecisionBundle/i);
  });

  it("still defers non-scaffolded bundle helpers with not-implemented errors", () => {
    const adapter = new PostgresPersistenceAdapter();
    expect(() =>
      adapter.pauseRunBundle({
        runId: "run-1",
        actor: "operator-1"
      })
    ).toThrow(/not implemented/i);
  });
});
