import { describe, expect, it } from "vitest";
import type { TaskEnvelope } from "@agentos/shared";
import { buildAutopilotReleaseCommands, prepareReleaseReport } from "./release";

const envelope = {
  taskId: "task-release",
  createdAt: new Date().toISOString(),
  userGoal: "Ship release",
  normalizedGoal: "Prepare release",
  taskType: "release",
  complexity: "simple",
  riskLevel: "low",
  requiresRepoContext: false,
  requiresCodeChange: false,
  requiresPlanning: false,
  requiresQa: true,
  requiresCodeReview: false,
  requiresSecurityReview: false,
  requiresReleaseGate: true,
  filesInScope: [],
  inScope: ["pnpm test"],
  outOfScope: [],
  relevantMemoryKeys: [],
  contextBudgetTokens: 4000,
  acceptanceCriteria: [],
  requiredGates: ["release_manager"],
  mode: "assisted",
  notes: []
} satisfies TaskEnvelope;

describe("prepareReleaseReport", () => {
  it("requires human approval by default", async () => {
    process.env.FEATURE_AGENT_LLM = "false";
    const report = await prepareReleaseReport(envelope, undefined, {
      gitStatusOutput: " M packages/runtime/src/index.ts",
      priorGatePasses: { qa: "passed", security: "passed" }
    });
    expect(report.agent).toBe("release-manager");
    expect(report.approvalRequired).toBe(true);
    expect(report.status).toBe("approval_required");
    expect(report.commitMessage).toContain("feat(agentos)");
  });

  it("builds autopilot git commands", () => {
    const prevSkip = process.env.AGENTOS_SKIP_GH_PR;
    delete process.env.AGENTOS_SKIP_GH_PR;
    try {
      const cmds = buildAutopilotReleaseCommands("ready", "feat: ship it");
      expect(cmds[0]).toBe("git add -A");
      expect(cmds[1]).toContain("git commit");
      expect(cmds[2]).toBe("gh pr create --fill");
      expect(buildAutopilotReleaseCommands("blocked", "x")).toEqual([]);
    } finally {
      if (prevSkip === undefined) delete process.env.AGENTOS_SKIP_GH_PR;
      else process.env.AGENTOS_SKIP_GH_PR = prevSkip;
    }
  });
});
