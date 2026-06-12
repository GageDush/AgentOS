import { describe, expect, it } from "vitest";
import type { ContextPacket, TaskEnvelope } from "@agentos/shared";
import { resolveQaCommands, runQaGate } from "./qa-gate";

const envelope = {
  taskId: "task-qa",
  createdAt: new Date().toISOString(),
  userGoal: "Verify build",
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
  repoPaths: [],
  riskAreas: [],
  suggestedCommands: ["pnpm typecheck", "pnpm test"],
  maxTokenBudget: 4000,
  filesIncluded: [],
  memoryIncluded: [],
  excludedContext: [],
  notes: []
} satisfies ContextPacket;

describe("runQaGate", () => {
  it("resolves verification commands from context", () => {
    const commands = resolveQaCommands(envelope, contextPacket);
    expect(commands).toContain("pnpm test");
    expect(commands).toContain("pnpm typecheck");
  });

  it("passes in mock mode without executeCommand", async () => {
    const report = await runQaGate(envelope, contextPacket);
    expect(report.status).toBe("passed");
    expect(report.testsRun?.length).toBeGreaterThan(0);
  });

  it("fails when a live command fails", async () => {
    const report = await runQaGate(envelope, contextPacket, async (command) => ({
      ok: command.includes("typecheck"),
      command,
      exitCode: command.includes("typecheck") ? 0 : 1,
      stderr: "failed"
    }));
    expect(report.status).toBe("failed");
  });
});
