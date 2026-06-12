import { describe, expect, it } from "vitest";
import { scorePlannerNeed } from "./planner-score";

describe("scorePlannerNeed", () => {
  it("skips planner for answer_only", () => {
    const result = scorePlannerNeed({
      complexity: "simple",
      taskType: "answer_only",
      domainSpan: 0,
      routeConfidence: 0.9,
      text: "what is agentos"
    });
    expect(result.runFullPlanner).toBe(false);
    expect(result.runLightweightPlanner).toBe(false);
  });

  it("runs full planner for complex multi-domain work", () => {
    const result = scorePlannerNeed({
      complexity: "complex",
      taskType: "app_creation",
      domainSpan: 3,
      routeConfidence: 0.7,
      text: "build dashboard api and database maybe?"
    });
    expect(result.runFullPlanner).toBe(true);
  });
});
