import { describe, expect, it, vi } from "vitest";
import type { TaskEnvelope } from "@agentos/shared";
import { dispatchImplementerWork } from "./implementer-dispatch";

const envelope = {
  taskId: "t1",
  createdAt: new Date().toISOString(),
  userGoal: "Fix bug",
  normalizedGoal: "Fix bug",
  taskType: "bug_fix",
  complexity: "simple",
  riskLevel: "low",
  requiresRepoContext: true,
  requiresCodeChange: true,
  requiresPlanning: false,
  requiresQa: true,
  requiresCodeReview: true,
  requiresSecurityReview: false,
  requiresReleaseGate: false,
  filesInScope: ["packages/runtime/src/index.ts"],
  inScope: ["pnpm typecheck"],
  outOfScope: [],
  relevantMemoryKeys: [],
  contextBudgetTokens: 4000,
  acceptanceCriteria: ["Tests pass"],
  requiredGates: ["qa"],
  mode: "assisted",
  notes: []
} satisfies TaskEnvelope;

describe("dispatchImplementerWork", () => {
  it("infers scoped files from mission goal when context packet is missing", async () => {
    const prev = process.env.FEATURE_TOOL_EXECUTION;
    process.env.FEATURE_TOOL_EXECUTION = "true";
    const fetchCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        fetchCalls.push(String(url));
        return {
          ok: true,
          json: async () => ({ id: "read", ok: true, stdout: "ok" })
        };
      })
    );

    await dispatchImplementerWork(
      "code-implementer",
      {
        ...envelope,
        userGoal: "Fix bug in packages/agents/src/tool-broker.ts",
        normalizedGoal: "Fix bug in packages/agents/src/tool-broker.ts",
        filesInScope: []
      },
      undefined,
      {
        mode: "gateway",
        executeCommand: async (command) => ({ ok: true, command, stdout: "ok" })
      }
    );

    expect(fetchCalls.some((url) => url.includes("/tools/invoke"))).toBe(true);
    if (prev === undefined) delete process.env.FEATURE_TOOL_EXECUTION;
    else process.env.FEATURE_TOOL_EXECUTION = prev;
    vi.unstubAllGlobals();
  });

  it("runs gateway mode commands", async () => {
    const report = await dispatchImplementerWork("code-implementer", envelope, undefined, {
      mode: "gateway",
      executeCommand: async (command) => ({ ok: true, command, stdout: "ok" })
    });
    expect(report.dispatchMode).toBe("gateway");
    expect(report.status).toBe("complete");
    expect(report.commandsRun?.length).toBeGreaterThan(0);
  });
});
