import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { SqlitePersistenceAdapter } from "@agentos/persistence";
import { handleChatMessage, pauseMissionRun, processPendingMissionRuns } from "./index";

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
});
