import { describe, expect, it } from "vitest";
import { createTask, store, usageSummary } from "./store";

describe("api store", () => {
  it("creates a task", () => {
    const before = store.tasks.length;
    const task = createTask({ title: "Test AgentOS task" });
    expect(task.title).toContain("AgentOS");
    expect(store.tasks.length).toBe(before + 1);
  });

  it("summarizes usage", () => {
    expect(usageSummary().totalTokens).toBeGreaterThan(0);
  });
});
