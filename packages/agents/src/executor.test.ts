import { describe, expect, it } from "vitest";
import type { ContextPacket, TaskEnvelope, TaskEnvelopeGate } from "@agentos/shared";
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
  it("returns a mock specialist report", async () => {
    process.env.FEATURE_OLLAMA = "false";
    const report = await executeAgentStep("code-implementer", envelope, contextPacket);
    expect(report.agent).toBe("code-implementer");
    expect(report.status).toBe("complete");
    expect(report.summary).toContain("code-implementer");
  });

  it("runs specialist then QA gate in mock pipeline mode", async () => {
    process.env.FEATURE_OLLAMA = "false";
    const { primary, qa, synthesizer, executedAgentIds } = await executeAgentPipelineStep(
      "code-implementer",
      envelope,
      contextPacket,
      {
        runQaGate: true
      }
    );
    expect(primary.agent).toBe("code-implementer");
    expect(qa?.agent).toBe("qa-agent");
    expect(qa?.status).toBe("passed");
    expect(qa?.testsRun?.length).toBeGreaterThan(0);
    expect(synthesizer.agent).toBe("systems-synthesizer");
    expect(executedAgentIds).toContain("systems-synthesizer");
  });

  it("runs release manager when release gate is required", async () => {
    process.env.FEATURE_OLLAMA = "false";
    process.env.FEATURE_AGENT_LLM = "false";
    const releaseEnvelope = {
      ...envelope,
      taskType: "release",
      requiresReleaseGate: true,
      requiredGates: ["release_manager"] as TaskEnvelopeGate[]
    } satisfies TaskEnvelope;
    const { primary, release, synthesizer } = await executeAgentPipelineStep(
      "code-implementer",
      releaseEnvelope,
      contextPacket,
      {
        runReleaseGate: true
      }
    );
    expect(synthesizer.agent).toBe("systems-synthesizer");
    expect(primary.agent).toBe("code-implementer");
    expect(release?.agent).toBe("release-manager");
    expect(release?.summary.toLowerCase()).toContain("release manager");
  });
});
