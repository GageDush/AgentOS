import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApprovalRecord } from "@agentos/shared";

const postPersonaRichMessage = vi.fn(async () => ({ id: "msg-1", channel_id: "ch-approvals" }));
const markApprovalNotified = vi.fn();

vi.mock("./webhook-post", () => ({
  postPersonaRichMessage
}));

vi.mock("./client", () => ({
  isDiscordBotEnabled: () => true
}));

vi.mock("./bootstrap", () => ({
  loadDiscordGuildState: () => ({ webhooks: { approvals: "https://example.test/approvals" } })
}));

vi.mock("./registry", () => ({
  hasNotifiedApproval: () => false,
  markApprovalNotified
}));

vi.mock("./messenger", () => ({
  sendAgentMessage: vi.fn()
}));

const pendingApproval: ApprovalRecord = {
  id: "approval-terminal-run",
  workspaceId: "workspace-local",
  requestedByOperatorId: "operator-local",
  agentId: "builder-agent",
  missionId: "mission-seed-local-checks",
  runId: "mission-run-seed",
  tool: "shell",
  permissionLevel: "safe_execute",
  inputSummary: "Run npm test in the repo root.",
  status: "pending",
  command: "npm test",
  createdAt: "2026-06-11T00:00:00.000Z"
};

vi.mock("../store", () => ({
  listPendingApprovals: () => [pendingApproval],
  store: {
    approvals: [pendingApproval],
    missionRuns: [],
    agents: []
  }
}));

describe("notifyApprovalGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts scoped Ash rich card via postPersonaRichMessage", async () => {
    const { notifyApprovalGate } = await import("./notify");
    const result = await notifyApprovalGate(pendingApproval);

    expect(result.ok).toBe(true);
    expect(postPersonaRichMessage).toHaveBeenCalledWith(
      "https://example.test/approvals",
      expect.objectContaining({
        agentId: "admin-agent",
        recipient: "Operator",
        scope: {
          approvalRequestId: "approval-terminal-run",
          missionId: "mission-seed-local-checks",
          runId: "mission-run-seed"
        }
      })
    );
    expect(markApprovalNotified).toHaveBeenCalledWith("approval-terminal-run");
  });
});
