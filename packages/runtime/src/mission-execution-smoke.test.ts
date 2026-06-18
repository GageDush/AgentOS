import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SqlitePersistenceAdapter } from "@agentos/persistence";
import type { MissionRecord } from "@agentos/shared";
import type { ToolRequest } from "@agentos/shared";
import { processPendingMissionRuns } from "./index";

type GatewayMockOptions = {
  commandOk?: (command: string) => boolean;
};

function mockGatewayFetch(options: GatewayMockOptions = {}) {
  const commandOk = options.commandOk ?? (() => true);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const urlStr = String(url);
      const body = JSON.parse(String(init?.body ?? "{}")) as { command?: string } & ToolRequest;

      if (urlStr.includes("/tools/invoke")) {
        const request = body as ToolRequest;
        if (request.id === "read") {
          return {
            ok: true,
            json: async () => ({
              id: "read",
              ok: true,
              stdout: `export function isToolExecutionEnabled() {}\n`,
              leaseId: request.leaseId
            })
          };
        }
        if (request.id === "grep") {
          return {
            ok: true,
            json: async () => ({
              id: "grep",
              ok: true,
              stdout: "packages/agents/src/tool-broker.ts:6:export function isToolExecutionEnabled",
              leaseId: request.leaseId
            })
          };
        }
        if (request.id === "git.status") {
          return {
            ok: true,
            json: async () => ({
              id: "git.status",
              ok: true,
              stdout: " M packages/agents/src/tool-broker.ts",
              leaseId: request.leaseId
            })
          };
        }
        if (request.id === "git.diff") {
          return {
            ok: true,
            json: async () => ({
              id: "git.diff",
              ok: true,
              stdout: "diff --git a/packages/agents/src/tool-broker.ts",
              leaseId: request.leaseId
            })
          };
        }
        return {
          ok: true,
          json: async () => ({
            id: request.id,
            ok: false,
            error: `unexpected tool ${request.id}`,
            leaseId: request.leaseId
          })
        };
      }

      if (urlStr.includes("/execute")) {
        const command = body.command ?? "";
        const ok = commandOk(command);
        const stdout = command.includes("git diff --stat")
          ? " README.md | 2 +-\n 1 file changed, 2 insertions(+)"
          : command.includes("git diff --name-only")
            ? "packages/agents/src/tool-broker.ts\n"
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
      }

      return {
        ok: false,
        json: async () => ({ ok: false, error: `unexpected fetch ${urlStr}` })
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
    vi.stubEnv("FEATURE_OLLAMA", "false");
    vi.stubEnv("AGENTOS_MOCK_AGENT_EXECUTION", "true");
    vi.stubEnv("AGENTOS_IMPLEMENTER_MODE", "mock");
    mockGatewayFetch({ commandOk: (command) => !/\b(pnpm test|pnpm typecheck)\b/.test(command) });

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
    vi.stubEnv("FEATURE_OLLAMA", "false");
    vi.stubEnv("AGENTOS_MOCK_AGENT_EXECUTION", "true");
    vi.stubEnv("AGENTOS_IMPLEMENTER_MODE", "mock");
    mockGatewayFetch();

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

  it("dispatches gateway tools through processRun when tool execution is enabled", async () => {
    vi.stubEnv("AGENTOS_REQUIRE_HUMAN_APPROVAL", "false");
    vi.stubEnv("AGENTOS_CLASSIFIER_TIER2", "false");
    vi.stubEnv("AGENTOS_MOCK_AGENT_EXECUTION", "true");
    vi.stubEnv("FEATURE_AGENT_LLM", "false");
    vi.stubEnv("FEATURE_OLLAMA", "false");
    vi.stubEnv("FEATURE_TOOL_EXECUTION", "true");
    vi.stubEnv("AGENTOS_IMPLEMENTER_MODE", "gateway");
    vi.stubEnv("AGENTOS_IMPLEMENTER_APPLY_PATCHES", "false");
    vi.stubEnv("FEATURE_MEMORY_WIKI", "false");
    mockGatewayFetch();

    const dir = mkdtempSync(join(tmpdir(), "agentos-mission-smoke-"));
    const persistence = new SqlitePersistenceAdapter(join(dir, "agentos.db"));
    seedQueuedRun(persistence, {
      runId: "run-tool-exec",
      title: "Tool broker fix",
      objective: "Fix bug in tool broker export",
      prompt: "Fix bug in packages/agents/src/tool-broker.ts export function",
      command: "pnpm typecheck"
    });

    await processPendingMissionRuns({
      persistence,
      gatewayBase: "http://127.0.0.1:8790",
      workerId: "worker-smoke"
    });

    const snapshot = persistence.snapshot();
    const route = snapshot.routingDecisions.find((entry) => entry.runId === "run-tool-exec");
    expect(route?.selectedPrimaryAgentId).toBe("code-implementer");

    const dispatch = snapshot.auditEvents.find(
      (event) => event.event === "agent.implementer_dispatched" && event.runId === "run-tool-exec"
    );
    expect(dispatch).toBeDefined();
    const metadata = dispatch?.metadata as {
      dispatchMode?: string;
      commandsRun?: string[];
    };
    expect(metadata?.dispatchMode).toBe("gateway");
    expect(metadata?.commandsRun?.some((entry) => entry.startsWith("read:"))).toBe(true);
    expect(metadata?.commandsRun).toContain("git.status");

    const primaryStep = snapshot.auditEvents.find(
      (event) => event.event === "agent.step_executed" && event.actor === "code-implementer" && event.runId === "run-tool-exec"
    );
    const primaryMeta = primaryStep?.metadata as { mock?: boolean; report?: { dispatchMode?: string } };
    expect(primaryMeta?.mock).toBe(false);
    expect(primaryMeta?.report?.dispatchMode).toBe("gateway");

    const qaStep = snapshot.auditEvents.find(
      (event) => event.event === "agent.step_executed" && event.actor === "qa-agent" && event.runId === "run-tool-exec"
    );
    const qaReport = (qaStep?.metadata as { report?: { status?: string } } | undefined)?.report;
    expect(qaReport?.status).toBe("passed");
  });
});
