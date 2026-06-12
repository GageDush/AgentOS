import { describe, expect, it } from "vitest";
import { shouldSkipPrimaryAfterSubtasks, sortPlannerSubtasks } from "./planner-executor";

describe("planner-executor graph", () => {
  it("topologically sorts subtasks by dependsOn", () => {
    const ordered = sortPlannerSubtasks([
      { id: "b", agent: "docs-agent", summary: "docs", dependsOn: ["a"] },
      { id: "a", agent: "code-implementer", summary: "impl", dependsOn: [] }
    ]);
    expect(ordered.map((task) => task.id)).toEqual(["a", "b"]);
  });

  it("skips primary when implementer already ran in subtasks", () => {
    const skip = shouldSkipPrimaryAfterSubtasks("code-implementer", [
      { agent: "code-implementer", status: "complete", summary: "done" }
    ]);
    expect(skip).toBe(true);
  });
});
