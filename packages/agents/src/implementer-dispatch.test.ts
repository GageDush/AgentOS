import { describe, expect, it } from "vitest";
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
