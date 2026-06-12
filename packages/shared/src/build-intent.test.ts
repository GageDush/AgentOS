import { describe, expect, it } from "vitest";
import type { BuildIntent, QuestionnaireItem } from "./build-intent";

describe("build intent", () => {
  it("models app_creation with questionnaire answers", () => {
    const item: QuestionnaireItem = { id: "app-name", prompt: "What should the app be called?" };
    const intent: BuildIntent = {
      intentId: "intent-1",
      taskType: "app_creation",
      appName: "Task Tracker",
      summary: "A lightweight todo app",
      questionnaire: [item],
      answers: { "app-name": "Task Tracker" }
    };

    expect(intent.taskType).toBe("app_creation");
    expect(intent.questionnaire).toHaveLength(1);
    expect(intent.answers?.["app-name"]).toBe("Task Tracker");
  });
});
