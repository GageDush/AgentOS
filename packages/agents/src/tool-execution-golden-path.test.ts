import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContextPacket, TaskEnvelope, ToolRequest } from "@agentos/shared";
import { dispatchImplementerWork } from "./implementer-dispatch";
import { executeAgentPipelineStep } from "./executor";

const envelope = {
  taskId: "tool-golden-1",
  createdAt: new Date().toISOString(),
  userGoal: "Fix tool broker export",
  normalizedGoal: "Fix tool broker export",
  taskType: "bug_fix",
  complexity: "simple",
  riskLevel: "low",
  requiresRepoContext: true,
  requiresCodeChange: true,
  requiresPlanning: false,
  requiresQa: true,
  requiresCodeReview: false,
  requiresSecurityReview: false,
  requiresReleaseGate: false,
  filesInScope: ["packages/agents/src/tool-broker.ts"],
  inScope: ["pnpm typecheck"],
  outOfScope: [],
  relevantMemoryKeys: ["test-commands"],
  contextBudgetTokens: 6000,
  acceptanceCriteria: ["Tool probe runs", "Patch applies", "Fix-verify passes"],
  requiredGates: ["qa"],
  mode: "assisted",
  notes: []
} satisfies TaskEnvelope;

const contextPacket = {
  agent: "context-minimizer",
  status: "complete",
  contextBudget: "medium",
  repoPaths: ["packages/agents/src/tool-broker.ts"],
  riskAreas: [],
  suggestedCommands: ["pnpm typecheck", "pnpm test"],
  maxTokenBudget: 6000,
  filesIncluded: [
    {
      path: "packages/agents/src/tool-broker.ts",
      reason: "Listed in task envelope scope.",
      mode: "excerpt"
    }
  ],
  memoryIncluded: [
    {
      path: ".agentos/memory/wiki/flows/test-commands.md",
      reason: "Manifest-scored wiki seed."
    }
  ],
  excludedContext: [],
  notes: ["Wiki manifest-first: 2 sections from 1 articles (800 chars); 0 low-signal candidates pruned."]
} satisfies ContextPacket;

async function mockGatewayExecuteCommand(command: string) {
  return {
    ok: true,
    command,
    stdout: command.includes("git diff --name-only") ? "packages/agents/src/tool-broker.ts\n" : "ok",
    exitCode: 0
  };
}

function mockGatewayToolFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toContain("/tools/invoke");
      const body = JSON.parse(String(init?.body ?? "{}")) as ToolRequest;

      if (body.id === "read") {
        return {
          ok: true,
          json: async () => ({
            id: "read",
            ok: true,
            stdout: `export function isToolExecutionEnabled() { return true; }\n`,
            leaseId: body.leaseId
          })
        };
      }
      if (body.id === "grep") {
        return {
          ok: true,
          json: async () => ({
            id: "grep",
            ok: true,
            stdout: "packages/agents/src/tool-broker.ts:6:export function isToolExecutionEnabled",
            leaseId: body.leaseId
          })
        };
      }
      if (body.id === "git.status") {
        return {
          ok: true,
          json: async () => ({
            id: "git.status",
            ok: true,
            stdout: " M packages/agents/src/tool-broker.ts",
            leaseId: body.leaseId
          })
        };
      }
      if (body.id === "git.diff") {
        return {
          ok: true,
          json: async () => ({
            id: "git.diff",
            ok: true,
            stdout: "diff --git a/packages/agents/src/tool-broker.ts",
            leaseId: body.leaseId
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          id: body.id,
          ok: false,
          error: `unexpected tool ${body.id}`,
          leaseId: body.leaseId
        })
      };
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("tool execution golden path", () => {
  it("gateway implementer probes tools, applies patch, and runs fix-verify", async () => {
    vi.stubEnv("FEATURE_TOOL_EXECUTION", "true");
    vi.stubEnv("FEATURE_AGENT_LLM", "false");
    vi.stubEnv("FEATURE_OLLAMA", "false");
    vi.stubEnv("AGENTOS_IMPLEMENTER_APPLY_PATCHES", "true");
    vi.stubEnv("AGENTOS_FIX_VERIFY_RETRIES", "0");
    mockGatewayToolFetch();

    const report = await dispatchImplementerWork("code-implementer", envelope, contextPacket, {
      mode: "gateway",
      missionId: "mission-tool-golden",
      runId: "run-tool-golden",
      executeCommand: mockGatewayExecuteCommand,
      generatePatch: async () =>
        [
          "```diff",
          "--- a/packages/agents/src/tool-broker.ts",
          "+++ b/packages/agents/src/tool-broker.ts",
          "@@ -1,3 +1,4 @@",
          "+// golden-path",
          " export function isToolExecutionEnabled() {",
          "```"
        ].join("\n"),
      applyPatch: async (_diff, allowed) => ({
        ok: true,
        changedFiles: allowed.slice(0, 1)
      })
    });

    expect(report.dispatchMode).toBe("gateway");
    expect(report.status).toBe("complete");
    expect(report.commandsRun?.some((entry) => entry.startsWith("read:"))).toBe(true);
    expect(report.commandsRun).toContain("git.status");
    expect(report.commandsRun).toContain("implementer.patch.apply");
    expect(report.commandsRun?.some((entry) => entry.startsWith("fix-verify:"))).toBe(true);
    expect(report.changedFiles).toContain("packages/agents/src/tool-broker.ts");
    expect(report.summary).toMatch(/Tool context:/);
  });

  it("pipeline step wires implementer dispatch with live tool execution metadata", async () => {
    vi.stubEnv("FEATURE_TOOL_EXECUTION", "true");
    vi.stubEnv("FEATURE_AGENT_LLM", "false");
    vi.stubEnv("FEATURE_OLLAMA", "false");
    vi.stubEnv("AGENTOS_IMPLEMENTER_MODE", "gateway");
    vi.stubEnv("AGENTOS_IMPLEMENTER_APPLY_PATCHES", "false");
    vi.stubEnv("AGENTOS_FIX_VERIFY_RETRIES", "0");
    mockGatewayToolFetch();

    const pipeline = await executeAgentPipelineStep("code-implementer", envelope, contextPacket, {
      runQaGate: true,
      memoryUpdates: false,
      missionId: "mission-tool-golden",
      runId: "run-tool-golden",
      executeCommand: mockGatewayExecuteCommand,
      implementerDispatch: { mode: "gateway" }
    });

    expect(pipeline.usedLiveExecution).toBe(true);
    expect("dispatchMode" in pipeline.primary ? pipeline.primary.dispatchMode : undefined).toBe("gateway");
    expect(pipeline.primary.commandsRun?.some((entry) => entry.startsWith("read:"))).toBe(true);
    expect(pipeline.qa?.status).toBe("passed");
    expect(pipeline.executedAgentIds).toContain("code-implementer");
    expect(pipeline.executedAgentIds).toContain("qa-agent");
  });
});
