import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SqlitePersistenceAdapter } from "@agentos/persistence";
import type { MissionRecord } from "@agentos/shared";
import { processPendingMissionRuns } from "./index";

function mockGatewayCommandResults(results: Record<string, boolean> | ((command: string) => boolean)) {
  const resolve = typeof results === "function" ? results : (command: string) => results[command] ?? true;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { command?: string };
      const command = body.command ?? "";
      const ok = resolve(command);
      const stdout = command.includes("git diff --stat")
        ? " README.md | 2 +-\n 1 file changed, 2 insertions(+)"
        : ok
          ? "ok"
          : "";
      return {
        ok: true,
        json: async () => ({
          ok: true,
          result: {
            ok,
            command,
            exitCode: ok ? 0 : 1,
            stdout,
            stderr: ok ? "" : `failed: ${command}`,
            durationMs: 5
          }
        })
      };
    })
  );
}

function seedQueuedRun(
  persistence: SqlitePersistenceAdapter,
  input: {
    runId: string;
    title: string;
    objective: string;
    prompt: string;
    command: string;
    sandboxLevel?: MissionRecord["sandboxLevel"];
  }
) {
  persistence.mutate((database) => {
    const mission = database.missions[0]!;
    mission.title = input.title;
    mission.objective = input.objective;
    mission.prompt = input.prompt;
    mission.command = input.command;
    mission.status = "queued";
    mission.sandboxLevel = input.sandboxLevel ?? "safe_execute";
    mission.commandPolicy = "auto_allowed";
    database.missionRuns.unshift({
      id: input.runId,
      workspaceId: database.workspaces[0].id,
      missionId: mission.id,
      sessionId: database.sessions[0].id,
      requestedByOperatorId: database.operators[0].id,
      operatorId: "code-implementer",
      provider: "mock",
      model: "mock-agentos-local",
      status: "queued",
      commandPolicy: "auto_allowed",
      requestedCommand: input.command,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    mission.latestRunId = input.runId;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("mission execution smoke", () => {
  it("fails the run when live QA gate commands fail after a code change", async () => {
    vi.stubEnv("AGENTOS_REQUIRE_HUMAN_APPROVAL", "false");
    vi.stubEnv("AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL", "true");
    vi.stubEnv("AGENTOS_NO_SELF_APPROVAL", "false");
    vi.stubEnv("AGENTOS_CLASSIFIER_TIER2", "false");
    vi.stubEnv("FEATURE_AGENT_LLM", "false");
    vi.stubEnv("AGENTOS_IMPLEMENTER_MODE", "mock");
    mockGatewayCommandResults((command) => !/\b(pnpm test|pnpm typecheck)\b/.test(command));

    const dir = mkdtempSync(join(tmpdir(), "agentos-mission-smoke-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    seedQueuedRun(persistence, {
      runId: "run-qa-fail",
      title: "Ship README fix",
      objective: "Fix typo and complete release gate",
      prompt: "Fix README typo and prepare release commit",
      command: "git commit -m 'docs: typo'"
    });

    await processPendingMissionRuns({
      persistence,
      gatewayBase: "http://127.0.0.1:8790",
      workerId: "worker-smoke"
    });

    const snapshot = persistence.snapshot();
    const run = snapshot.missionRuns.find((item) => item.id === "run-qa-fail");
    const route = snapshot.routingDecisions.find((entry) => entry.runId === "run-qa-fail");

    expect(route?.selectedPrimaryAgentId).toBe("code-implementer");

    const qaStep = snapshot.auditEvents.find(
      (event) => event.event === "agent.step_executed" && event.actor === "qa-agent" && event.runId === "run-qa-fail"
    );
    const qaReport = (qaStep?.metadata as { report?: { status?: string } } | undefined)?.report;
    expect(qaReport?.status).toBe("failed");
    expect(run?.status).toBe("failed");
    expect(snapshot.auditEvents.some((event) => event.event === "gate.release_passed" && event.runId === "run-qa-fail")).toBe(
      false
    );
  });

  it("records release approval_required when QA passes on a code-change release mission", async () => {
    vi.stubEnv("AGENTOS_REQUIRE_HUMAN_APPROVAL", "false");
    vi.stubEnv("AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL", "true");
    vi.stubEnv("AGENTOS_NO_SELF_APPROVAL", "false");
    vi.stubEnv("AGENTOS_CLASSIFIER_TIER2", "false");
    vi.stubEnv("FEATURE_AGENT_LLM", "false");
    vi.stubEnv("AGENTOS_IMPLEMENTER_MODE", "mock");
    mockGatewayCommandResults(() => true);

    const dir = mkdtempSync(join(tmpdir(), "agentos-mission-smoke-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    seedQueuedRun(persistence, {
      runId: "run-qa-pass-release",
      title: "Ship README fix",
      objective: "Fix typo and complete release gate",
      prompt: "Fix README typo and prepare release commit",
      command: "git commit -m 'docs: typo'"
    });

    await processPendingMissionRuns({
      persistence,
      gatewayBase: "http://127.0.0.1:8790",
      workerId: "worker-smoke"
    });

    const snapshot = persistence.snapshot();
    const route = snapshot.routingDecisions.find((entry) => entry.runId === "run-qa-pass-release");
    expect(route?.requiredGates).toContain("qa");
    expect(route?.requiredGates).toContain("release");

    const qaStep = snapshot.auditEvents.find(
      (event) => event.event === "agent.step_executed" && event.actor === "qa-agent" && event.runId === "run-qa-pass-release"
    );
    const qaReport = (qaStep?.metadata as { report?: { status?: string } } | undefined)?.report;
    expect(qaReport?.status).toBe("passed");

    const releaseStep = snapshot.auditEvents.find(
      (event) =>
        event.event === "agent.step_executed" && event.actor === "release-manager" && event.runId === "run-qa-pass-release"
    );
    const releaseReport = (releaseStep?.metadata as { report?: { status?: string } } | undefined)?.report;
    expect(releaseReport?.status).toBe("approval_required");
    expect(snapshot.auditEvents.some((event) => event.event === "gate.release_passed" && event.runId === "run-qa-pass-release")).toBe(
      false
    );
  });
});
