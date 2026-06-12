import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCustomId } from "./components";

const executeRichQuickAction = vi.fn(async () => ({ ok: true, summary: "Approved once." }));
const resolveApprovalDecision = vi.fn(async () => ({ ok: true, summary: "Legacy approved." }));

vi.mock("@agentos/runtime", () => ({
  executeRichQuickAction,
  resolveApprovalDecision
}));

vi.mock("../store", () => ({
  getTask: vi.fn(),
  listPendingApprovals: vi.fn(() => []),
  store: {
    approvals: [
      {
        id: "approval-terminal-run",
        missionId: "mission-seed-local-checks",
        runId: "mission-run-seed",
        status: "pending"
      }
    ],
    missionRuns: [],
    agents: []
  }
}));

vi.mock("./messenger", () => ({
  embedInteractionResponse: vi.fn((input) => ({ type: 4, data: input })),
  embedUpdateResponse: vi.fn((input) => ({ type: 7, data: input })),
  syncSeenToMessage: vi.fn(async () => ({ ok: true }))
}));

vi.mock("./notify", () => ({
  postSystemPulse: vi.fn()
}));

describe("handleButtonPress rich actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes rich_approve through executeRichQuickAction with scoped ids", async () => {
    const { handleButtonPress } = await import("./button-handlers");
    await handleButtonPress(
      { custom_id: encodeCustomId("rich_approve", "approval-terminal-run") },
      "Gage",
      "operator-local",
      { id: "message-1", channel_id: "channel-approvals" }
    );

    expect(executeRichQuickAction).toHaveBeenCalledWith({
      actionType: "approve",
      operatorId: "operator-local",
      scope: {
        approvalRequestId: "approval-terminal-run",
        missionId: "mission-seed-local-checks",
        runId: "mission-run-seed"
      }
    });
    expect(resolveApprovalDecision).not.toHaveBeenCalled();
  });

  it("routes rich_deny through executeRichQuickAction with scoped ids", async () => {
    const { handleButtonPress } = await import("./button-handlers");
    await handleButtonPress(
      { custom_id: encodeCustomId("rich_deny", "approval-terminal-run") },
      "Gage",
      "operator-local",
      { id: "message-2", channel_id: "channel-approvals" }
    );

    expect(executeRichQuickAction).toHaveBeenCalledWith({
      actionType: "deny",
      operatorId: "operator-local",
      scope: {
        approvalRequestId: "approval-terminal-run",
        missionId: "mission-seed-local-checks",
        runId: "mission-run-seed"
      }
    });
  });
});
