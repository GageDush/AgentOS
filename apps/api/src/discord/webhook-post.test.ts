import { beforeEach, describe, expect, it, vi } from "vitest";

const buildRichQuickActionRows = vi.fn(() => [{ type: 1 as const, components: [{ type: 2, custom_id: "aos:rich_approve:a1" }] }]);

vi.mock("./rich-action-buttons", () => ({
  buildRichQuickActionRows
}));

vi.mock("../store", () => ({
  listPendingApprovals: () => []
}));

vi.mock("./personas", () => ({
  resolvePersona: () => ({
    agentId: "admin-agent",
    characterName: "Ash",
    roleTitle: "Admin",
    color: 0xf1c40f
  }),
  personaDiscordName: () => "[Admin] Ash",
  personaAvatarUrl: () => "https://example.test/ash.png"
}));

vi.mock("./agent-profiles", () => ({
  buildAgentRichMessageInput: (input: Record<string, unknown>) => input
}));

vi.mock("@agentos/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@agentos/shared")>();
  return {
    ...actual,
    buildAgentDiscordEmbed: () => ({ embeds: [{ title: "Ash" }] })
  };
});

describe("postPersonaRichMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ id: "message-1", channel_id: "channel-1" })
      }))
    );
  });

  it("omits quick-action components when includeQuickActions is false", async () => {
    const { postPersonaRichMessage } = await import("./webhook-post");
    await postPersonaRichMessage("https://example.test/webhook", {
      recipient: "Gage",
      message: "Round-table briefing opened.",
      includeQuickActions: false
    });

    expect(buildRichQuickActionRows).not.toHaveBeenCalled();
    const fetchMock = vi.mocked(fetch);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.components).toBeUndefined();
  });

  it("includes quick-action components for scoped cards by default", async () => {
    const { postPersonaRichMessage } = await import("./webhook-post");
    await postPersonaRichMessage("https://example.test/webhook", {
      recipient: "Operator",
      message: "Control gate request",
      scope: {
        approvalRequestId: "approval-terminal-run",
        missionId: "mission-seed-local-checks",
        runId: "mission-run-seed"
      }
    });

    expect(buildRichQuickActionRows).toHaveBeenCalledWith(
      {
        approvalRequestId: "approval-terminal-run",
        missionId: "mission-seed-local-checks",
        runId: "mission-run-seed"
      },
      []
    );
    const fetchMock = vi.mocked(fetch);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.components).toHaveLength(1);
  });
});
