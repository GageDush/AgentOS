import { describe, expect, it } from "vitest";
import { inferProviderLaneSmart, shouldPruneSupportingAgent } from "./lane-router";

describe("inferProviderLaneSmart", () => {
  it("defers when quota is blocked", () => {
    expect(
      inferProviderLaneSmart({
        text: "fix readme typo",
        complexity: "simple",
        riskLevel: "low",
        quotaBlocked: true
      })
    ).toBe("defer");
  });

  it("prefers local lane for low-risk docs work", () => {
    const lane = inferProviderLaneSmart({
      text: "update readme docs only",
      complexity: "simple",
      riskLevel: "low"
    });
    expect(["ollama_local", "mock_local"]).toContain(lane);
  });

  it("prunes supporting agents when roster is large", () => {
    const supporting = new Set([
      "context-minimizer",
      "architect-agent",
      "product-agent",
      "systems-synthesizer",
      "qa-agent"
    ]);
    expect(shouldPruneSupportingAgent("architect-agent", "code-implementer", supporting)).toBe(true);
    expect(shouldPruneSupportingAgent("qa-agent", "code-implementer", supporting)).toBe(false);
    expect(shouldPruneSupportingAgent("code-reviewer", "code-implementer", supporting)).toBe(false);
  });

  it("keeps systems-synthesizer until roster exceeds six agents", () => {
    const medium = new Set([
      "context-minimizer",
      "architect-agent",
      "product-agent",
      "systems-synthesizer",
      "qa-agent",
      "code-reviewer"
    ]);
    expect(shouldPruneSupportingAgent("systems-synthesizer", "code-implementer", medium)).toBe(false);

    const large = new Set([...medium, "security-auditor"]);
    expect(shouldPruneSupportingAgent("systems-synthesizer", "code-implementer", large)).toBe(true);
  });

  it("never prunes gate agents from an oversized roster", () => {
    const supporting = new Set([
      "context-minimizer",
      "architect-agent",
      "product-agent",
      "systems-synthesizer",
      "qa-agent",
      "code-reviewer",
      "security-auditor",
      "release-manager"
    ]);
    for (const gateAgent of ["qa-agent", "code-reviewer", "security-auditor", "release-manager"]) {
      expect(shouldPruneSupportingAgent(gateAgent, "code-implementer", supporting)).toBe(false);
    }
  });
});
