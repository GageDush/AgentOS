import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPersistenceAdapterForTests, resetSqliteDatabaseFile } from "@agentos/persistence";

describe("api store", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.AGENTOS_DATA_PATH = join(mkdtempSync(join(tmpdir(), "agentos-api-store-")), "agentos.db");
    resetPersistenceAdapterForTests();
    resetSqliteDatabaseFile(process.env.AGENTOS_DATA_PATH);
  });

  it("creates a task", async () => {
    const { createTask, store } = await import("./store");
    const before = store.tasks.length;
    const task = createTask({ title: "Test AgentOS task", prompt: "Summarize the demo." });
    expect(task.title).toContain("AgentOS");
    expect(task.status).toBe("queued");
    expect(store.tasks.length).toBe(before + 1);
  });

  it("summarizes usage", async () => {
    const { usageSummary } = await import("./store");
    expect(usageSummary().totalTokens).toBeGreaterThanOrEqual(0);
  });

  it("updates task lifecycle", async () => {
    const { completeTask, createTask, startTask } = await import("./store");
    const task = createTask({ title: "Lifecycle task", prompt: "Do a tiny safe thing." });
    expect(startTask(task.id)?.status).toBe("running");
    expect(completeTask(task.id, "Done safely.")?.status).toBe("complete");
  });

  it("starts a demo mission", async () => {
    const { runDemoMission } = await import("./store");
    const mission = runDemoMission();
    expect(mission.status).toBe("running");
    expect(mission.steps.some((step) => step.status === "running")).toBe(true);
  });
});
