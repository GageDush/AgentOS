import { describe, expect, it } from "vitest";
import { dequeueMissionRunJobs, enqueueMissionRun, getQueueBackend, peekMissionRunQueue } from "./index";

describe("@agentos/queue", () => {
  it("defaults to local backend", () => {
    delete process.env.AGENTOS_QUEUE_BACKEND;
    expect(getQueueBackend()).toBe("local");
  });

  it("enqueues and dequeues mission run jobs", async () => {
    await enqueueMissionRun("run-1");
    await enqueueMissionRun("run-2");
    expect(peekMissionRunQueue()).toHaveLength(2);
    const batch = dequeueMissionRunJobs(1);
    expect(batch[0]?.runId).toBe("run-1");
    expect(peekMissionRunQueue()).toHaveLength(1);
  });
});
