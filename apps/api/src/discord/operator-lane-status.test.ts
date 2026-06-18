import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store", () => ({
  store: {
    missionRuns: [] as Array<{ status: string }>
  }
}));

describe("operator lane status", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it(
    "reports ready when no active task or runs",
    async () => {
      const { getOperatorLaneStatus } = await import("./operator-lane-status");
      expect(getOperatorLaneStatus().ready).toBe(true);
      expect(getOperatorLaneStatus().topic).toContain("Ready");
    },
    15_000
  );

  it("classifies mission and control commands", async () => {
    const { operatorLaneTaskLabel } = await import("./operator-lane-status");
    expect(operatorLaneTaskLabel("mission Demo build")).toBe("mission");
    expect(operatorLaneTaskLabel("approve")).toBe("approve");
    expect(operatorLaneTaskLabel("hello there")).toBe("chat");
  });

  it("allows status while busy", async () => {
    const { isOperatorLaneBypassCommand } = await import("./operator-lane-status");
    expect(isOperatorLaneBypassCommand("status")).toBe(true);
    expect(isOperatorLaneBypassCommand("help")).toBe(false);
  });

  it("marks busy while work is in flight", async () => {
    const mod = await import("./operator-lane-status");
    let seenBusy = false;
    await mod.withOperatorLaneBusy("chan-1", "chat", async () => {
      seenBusy = !mod.getOperatorLaneStatus().ready;
      return "done";
    });
    expect(seenBusy).toBe(true);
    expect(mod.getOperatorLaneStatus().ready).toBe(true);
  });
});
