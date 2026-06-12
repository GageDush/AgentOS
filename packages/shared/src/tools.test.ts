import { describe, expect, it } from "vitest";
import { isTaskSpawnEnabled, parseToolRequest, serializeToolRequest, type ToolRequest } from "./tools";

describe("tools", () => {
  it("round-trips ToolRequest JSON", () => {
    const request: ToolRequest = {
      id: "read",
      path: "packages/shared/src/tools.ts",
      missionId: "m-1",
      runId: "r-1",
      leaseId: "lease-abc"
    };
    const raw = serializeToolRequest(request);
    expect(parseToolRequest(raw)).toEqual(request);
  });

  it("gates task.spawn behind FEATURE_TASK_SPAWN", () => {
    const prev = process.env.FEATURE_TASK_SPAWN;
    delete process.env.FEATURE_TASK_SPAWN;
    expect(isTaskSpawnEnabled()).toBe(false);
    process.env.FEATURE_TASK_SPAWN = "true";
    expect(isTaskSpawnEnabled()).toBe(true);
    if (prev === undefined) delete process.env.FEATURE_TASK_SPAWN;
    else process.env.FEATURE_TASK_SPAWN = prev;
  });
});
