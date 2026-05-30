import { describe, expect, it } from "vitest";
import { completeTask, createTask, runDemoMission, startTask, store, usageSummary } from "./store";

describe("api store", () => {
  it("creates a task", () => {
    const before = store.tasks.length;
    const task = createTask({ title: "Test AgentOS task", prompt: "Summarize the demo." });
    expect(task.title).toContain("AgentOS");
    expect(task.status).toBe("queued");
    expect(store.tasks.length).toBe(before + 1);
  });

  it("summarizes usage", () => {
    expect(usageSummary().totalTokens).toBeGreaterThan(0);
  });

  it("updates task lifecycle", () => {
    const task = createTask({ title: "Lifecycle task", prompt: "Do a tiny safe thing." });
    expect(startTask(task.id)?.status).toBe("running");
    expect(completeTask(task.id, "Done safely.")?.status).toBe("complete");
  });

  it("starts a demo mission", () => {
    const mission = runDemoMission();
    expect(mission.status).toBe("running");
    expect(mission.steps.some((step) => step.status === "running")).toBe(true);
  });
});
