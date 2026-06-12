import { describe, expect, it } from "vitest";
import { isAppCreationRequest, parseBuildIntent } from "./intake";

describe("intake", () => {
  it("detects app creation language", () => {
    expect(isAppCreationRequest("Make me a standalone app that tracks news")).toBe(true);
    expect(isAppCreationRequest("run typecheck")).toBe(false);
  });

  it("parses build intent with questionnaire", () => {
    const intent = parseBuildIntent("Build a workflow for daily summaries");
    expect(intent.taskType).toBe("app_creation");
    expect(intent.questionnaire.length).toBeGreaterThan(0);
  });
});
