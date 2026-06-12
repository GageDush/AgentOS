import { describe, expect, it } from "vitest";
import type { TaskEnvelope } from "@agentos/shared";
import { shouldRunContextMinimizer } from "./context-triggers";

const envelope = {
  taskId: "t1",
  createdAt: new Date().toISOString(),
  userGoal: "Fix",
  normalizedGoal: "Fix",
  taskType: "code_change",
  complexity: "simple",
  riskLevel: "low",
  requiresRepoContext: false,
  requiresCodeChange: true,
  requiresPlanning: false,
  requiresQa: true,
  requiresCodeReview: true,
  requiresSecurityReview: false,
  requiresReleaseGate: false,
  filesInScope: [],
  inScope: [],
  outOfScope: [],
  relevantMemoryKeys: [],
  contextBudgetTokens: 4000,
  acceptanceCriteria: [],
  requiredGates: [],
  mode: "assisted",
  notes: []
} satisfies TaskEnvelope;

describe("shouldRunContextMinimizer", () => {
  it("runs when repo context required", () => {
    expect(
      shouldRunContextMinimizer({
        envelope: { ...envelope, requiresRepoContext: true },
        supportingAgentCount: 0
      })
    ).toBe(true);
  });

  it("runs after repeated failures", () => {
    expect(
      shouldRunContextMinimizer({
        envelope,
        supportingAgentCount: 0,
        priorFailureCount: 2
      })
    ).toBe(true);
  });

  it("skips answer_only", () => {
    expect(
      shouldRunContextMinimizer({
        envelope: { ...envelope, taskType: "answer_only" },
        supportingAgentCount: 0
      })
    ).toBe(false);
  });
});
