import { describe, expect, it, vi } from "vitest";

vi.mock("@agentos/runtime", () => ({
  processPendingMissionRuns: vi.fn(async () => [{ ok: true, summary: "processed" }])
}));

describe("worker heartbeat", () => {
  it("processes pending runs", async () => {
    const { processPendingMissionRuns } = await import("@agentos/runtime");
    const results = await processPendingMissionRuns({ workerId: "worker-test" });
    expect(results).toHaveLength(1);
    expect(processPendingMissionRuns).toHaveBeenCalled();
  });
});
