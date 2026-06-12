import { describe, expect, it } from "vitest";
import type { ContextPacket, TaskEnvelope } from "@agentos/shared";
import { executeAgentPipelineStep, executeAgentStep } from "./executor";

const envelope = {
  taskId: "task-qa",
  createdAt: new Date().toISOString(),
  userGoal: "Run QA",
  normalizedGoal: "Verify build",
  taskType: "qa",
  complexity: "simple",
  riskLevel: "low",
  requiresRepoContext: false,
  requiresCodeChange: false,
  requiresPlanning: false,
  requiresQa: true,
  requiresCodeReview: false,
  requiresSecurityReview: false,
  requiresReleaseGate: false,
  filesInScope: [],
  inScope: ["pnpm test"],
  outOfScope: [],
  relevantMemoryKeys: [],
  contextBudgetTokens: 4000,
  acceptanceCriteria: [],
  requiredGates: ["qa"],
  mode: "assisted",
  notes: []
} satisfies TaskEnvelope;

const contextPacket = {
  agent: "context-minimizer",
  status: "complete",
  contextBudget: "small",
  repoPaths: ["packages/runtime/src/index.ts"],
  riskAreas: ["packages/runtime/"],
  suggestedCommands: ["pnpm test", "pnpm typecheck"],
  maxTokenBudget: 4000,
  filesIncluded: [],
  memoryIncluded: [],
  excludedContext: [],
  notes: []
} satisfies ContextPacket;

describe("executeAgentStep", () => {
  it("returns a mock specialist report", () => {
    const report = executeAgentStep("code-implementer", envelope, contextPacket);
    expect(report.agent).toBe("code-implementer");
    expect(report.status).toBe("complete");
    expect(report.summary).toContain("Mock");
  });

  it("runs specialist then QA gate in mock pipeline mode", () => {
    const { primary, qa } = executeAgentPipelineStep("code-implementer", envelope, contextPacket, {
      runQaGate: true
    });
    expect(primary.agent).toBe("code-implementer");
    expect(qa?.agent).toBe("qa-agent");
    expect(qa?.status).toBe("passed");
    expect(qa?.testsRun?.length).toBeGreaterThan(0);
  });
});
