import { describe, expect, it } from "vitest";
import { isVagueResearchPrompt, refineResearchRoute } from "./research-route";

describe("refineResearchRoute", () => {
  it("reclassifies actionable research to code_change", () => {
    const result = refineResearchRoute("please implement auth fix", {
      taskType: "research",
      userGoal: "implement auth fix"
    });
    expect(result.recommendedTaskType).toBe("code_change");
    expect(result.primaryAgentId).toBe("code-implementer");
  });

  it("detects vague prompts", () => {
    expect(isVagueResearchPrompt("help")).toBe(true);
    expect(isVagueResearchPrompt("how does the orchestrator classify tasks in agentos")).toBe(false);
  });
});
