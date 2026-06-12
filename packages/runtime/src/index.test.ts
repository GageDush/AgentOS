import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SqlitePersistenceAdapter } from "@agentos/persistence";
import { executeRichQuickAction, handleChatMessage, pauseMissionRun, processPendingMissionRuns, resolveApprovalDecision } from "./index";

function mockGatewaySuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          ok: true,
          command: "git status",
          exitCode: 0,
          stdout: "ok",
          stderr: "",
          durationMs: 12
        }
      })
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runtime spine", () => {
  it("claims and processes queued runs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    persistence.mutate((database) => {
      database.missionRuns.unshift({
        id: "run-local",
        workspaceId: database.workspaces[0].id,
        missionId: database.missions[0].id,
        sessionId: database.sessions[0].id,
        requestedByOperatorId: database.operators[0].id,
        operatorId: "builder-agent",
        provider: "mock",
        model: "mock-agentos-local",
        status: "queued",
        commandPolicy: "auto_allowed",
        requestedCommand: "git status",
        attemptCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      database.missions[0].latestRunId = "run-local";
      database.missions[0].status = "queued";
      database.missions[0].command = "git status";
    });
    const results = await processPendingMissionRuns({ persistence, gatewayBase: "http://127.0.0.1:8790", workerId: "worker-test" });
    expect(results.length).toBeGreaterThan(0);
    expect(persistence.snapshot().routingDecisions.length).toBeGreaterThan(0);
  });

  it("persists chat messages from conversational control", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const response = await handleChatMessage("thread-local-command-center", "operator-local", "show details", { persistence });
    expect(response.message.role).toBe("assistant");
    expect(persistence.snapshot().chatMessages.length).toBeGreaterThan(1);
  });

  it("pauses a mission run", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const result = pauseMissionRun("mission-run-seed", { persistence });
    expect(result.ok).toBe(true);
    expect(persistence.snapshot().missionRuns.find((run) => run.id === "mission-run-seed")?.status).toBe("paused");
  });

  it("reclaims expired leases", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    persistence.mutate((database) => {
      const run = database.missionRuns[0]!;
      const mission = database.missions.find((item) => item.id === run.missionId)!;
      run.status = "running";
      run.claimedByWorkerId = "worker-old";
      run.claimedAt = new Date(Date.now() - 120_000).toISOString();
      run.leaseExpiresAt = new Date(Date.now() - 60_000).toISOString();
      run.attemptCount = 0;
      mission.status = "running";
      mission.command = "git status";
      run.commandPolicy = "auto_allowed";
      run.requestedCommand = "git status";
    });
    await processPendingMissionRuns({ persistence, gatewayBase: "http://127.0.0.1:8790", workerId: "worker-new" });
    const reclaimed = persistence.snapshot().auditEvents.find((event) => event.event === "worker.lease_expired");
    expect(reclaimed).toBeTruthy();
  });

  it("blocks completion when QA gate is required and not yet passed", async () => {
    mockGatewaySuccess();
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    persistence.mutate((database) => {
      const mission = database.missions[0]!;
      mission.title = "Fix auth bug";
      mission.objective = "Repair the login regression in API code.";
      mission.prompt = "Investigate and fix the auth bug.";
      mission.command = "git status";
      mission.status = "queued";
      mission.sandboxLevel = "observe";
      mission.commandPolicy = "auto_allowed";
      database.missionRuns.unshift({
        id: "run-qa-gate",
        workspaceId: database.workspaces[0].id,
        missionId: mission.id,
        sessionId: database.sessions[0].id,
        requestedByOperatorId: database.operators[0].id,
        operatorId: "builder-agent",
        provider: "mock",
        model: "mock-agentos-local",
        status: "queued",
        commandPolicy: "auto_allowed",
        requestedCommand: "git status",
        attemptCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      mission.latestRunId = "run-qa-gate";
    });
    await processPendingMissionRuns({ persistence, gatewayBase: "http://127.0.0.1:8790", workerId: "worker-test" });
    const snapshot = persistence.snapshot();
    const run = snapshot.missionRuns.find((item) => item.id === "run-qa-gate");
    expect(run?.status).toBe("paused");
    expect(snapshot.auditEvents.some((event) => event.event === "gate.completion_blocked")).toBe(true);
    expect(run?.status).not.toBe("completed");
  });

  it("defers execution when quota steward reports depleted buckets", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    persistence.mutate((database) => {
      for (let index = 0; index < 50; index += 1) {
        database.usageEvents.unshift({
          id: `usage-${index}`,
          workspaceId: database.workspaces[0].id,
          provider: "anthropic",
          model: "claude-sonnet",
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCostUsd: 1,
          createdAt: new Date().toISOString()
        });
      }
      const mission = database.missions[0]!;
      mission.command = "git status";
      mission.status = "queued";
      mission.sandboxLevel = "observe";
      mission.commandPolicy = "auto_allowed";
      database.missionRuns.unshift({
        id: "run-quota",
        workspaceId: database.workspaces[0].id,
        missionId: mission.id,
        sessionId: database.sessions[0].id,
        requestedByOperatorId: database.operators[0].id,
        operatorId: "builder-agent",
        provider: "mock",
        model: "mock-agentos-local",
        status: "queued",
        commandPolicy: "auto_allowed",
        requestedCommand: "git status",
        attemptCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      mission.latestRunId = "run-quota";
    });
    await processPendingMissionRuns({ persistence, gatewayBase: "http://127.0.0.1:8790", workerId: "worker-test" });
    const snapshot = persistence.snapshot();
    const route = snapshot.routingDecisions.find((entry) => entry.runId === "run-quota");
    expect(snapshot.auditEvents.some((event) => event.event === "quota.deferred" && event.runId === "run-quota")).toBe(true);
    expect(route?.providerLane).toBe("defer");
    expect(snapshot.missionRuns.find((item) => item.id === "run-quota")?.status).toBe("paused");
  });

  it("rejects implementer self-approval", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    persistence.mutate((database) => {
      const approval = database.approvals[0];
      const run = database.missionRuns.find((item) => item.id === approval?.runId);
      if (run) run.operatorId = "code-implementer";
      if (approval) approval.agentId = "code-implementer";
    });
    const result = await resolveApprovalDecision("approval-terminal-run", "approved", "once", "code-implementer", {
      persistence
    });
    expect(result.ok).toBe(false);
    expect(result.summary).toContain("cannot self-approve");
  });

  it("deduplicates active quick actions for the same run action type", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    persistence.mutate((database) => {
      database.missionRuns.unshift({
        id: "run-failing",
        workspaceId: database.workspaces[0].id,
        missionId: database.missions[0].id,
        sessionId: database.sessions[0].id,
        requestedByOperatorId: database.operators[0].id,
        operatorId: "builder-agent",
        provider: "mock",
        model: "mock-agentos-local",
        status: "failed",
        commandPolicy: "auto_allowed",
        requestedCommand: "git status",
        attemptCount: 1,
        error: "boom",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    pauseMissionRun("run-failing", { persistence });
    pauseMissionRun("run-failing", { persistence });
    const resumeActions = persistence
      .snapshot()
      .quickActions.filter((action) => action.runId === "run-failing" && action.actionType === "resume" && !action.consumedAt && !action.expiresAt);
    expect(resumeActions).toHaveLength(1);
  });

  it("executes scoped rich approve through control gate", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-rich-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const result = await executeRichQuickAction(
      {
        actionType: "approve",
        operatorId: "operator-local",
        scope: { approvalRequestId: "approval-terminal-run" }
      },
      { persistence }
    );
    expect(result.ok).toBe(true);
    expect(persistence.snapshot().approvals.find((item) => item.id === "approval-terminal-run")?.status).toBe("approved");
  });

  it("blocks rich approve without scoped pending approval", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agentos-runtime-rich-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    const result = await executeRichQuickAction(
      {
        actionType: "approve",
        operatorId: "operator-local",
        scope: {}
      },
      { persistence }
    );
    expect(result.ok).toBe(false);
    expect(result.summary).toContain("scoped pending approval");
  });
});
