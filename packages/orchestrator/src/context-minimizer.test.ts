import { describe, expect, it } from "vitest";
import type { TaskEnvelope } from "@agentos/shared";
import { buildContextPacket } from "./context-minimizer";

const baseEnvelope = {
  taskId: "task-1",
  createdAt: new Date().toISOString(),
  userGoal: "Fix auth regression",
  normalizedGoal: "Repair login bug",
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
  inScope: ["git diff apps/api/src/auth.ts"],
  outOfScope: [],
  relevantMemoryKeys: [],
  contextBudgetTokens: 4000,
  acceptanceCriteria: [],
  requiredGates: ["qa", "code_review"],
  mode: "assisted",
  notes: []
} satisfies TaskEnvelope;

describe("buildContextPacket", () => {
  it("returns a compact packet with inferred paths and memory hints", () => {
    const packet = buildContextPacket(baseEnvelope, {
      command: "git diff apps/api/src/auth.ts"
    });
    expect(packet.agent).toBe("context-minimizer");
    expect(packet.status).toBe("complete");
    expect(packet.repoPaths).toContain("apps/api/src/auth.ts");
    expect(packet.suggestedCommands.length).toBeGreaterThan(0);
    expect(packet.maxTokenBudget).toBe(4000);
    expect(packet.memoryIncluded.some((entry) => entry.path.includes("risk-areas.md"))).toBe(true);
  });

  it("caps file scope for simple envelopes", () => {
    const packet = buildContextPacket(baseEnvelope);
    for (const file of packet.filesIncluded) {
      expect(file.mode).toBe("excerpt");
    }
  });
});
