import { describe, expect, it } from "vitest";
import type { TaskEnvelope } from "@agentos/shared";
import { hashDiffStat, shouldScheduleCodeReview } from "./review-schedule";

const baseEnvelope = {
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
  filesInScope: [],
  inScope: [],
  outOfScope: [],
  relevantMemoryKeys: [],
  contextBudgetTokens: 4000,
  acceptanceCriteria: [],
  requiredGates: ["qa", "code_review"],
  mode: "assisted",
  notes: []
} satisfies TaskEnvelope;

describe("shouldScheduleCodeReview", () => {
  it("runs first review when none recorded", () => {
    expect(
      shouldScheduleCodeReview({
        envelope: baseEnvelope
      })
    ).toBe(true);
  });

  it("skips when diff hash unchanged", () => {
    const hash = hashDiffStat("1 file changed, 2 insertions");
    expect(
      shouldScheduleCodeReview({
        envelope: baseEnvelope,
        lastReviewAt: new Date().toISOString(),
        lastReviewDiffHash: hash,
        currentDiffHash: hash
      })
    ).toBe(false);
  });

  it("skips answer_only tasks", () => {
    expect(
      shouldScheduleCodeReview({
        envelope: { ...baseEnvelope, taskType: "answer_only", requiresCodeReview: false }
      })
    ).toBe(false);
  });
});
