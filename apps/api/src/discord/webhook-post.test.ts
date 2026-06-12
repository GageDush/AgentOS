import { beforeEach, describe, expect, it, vi } from "vitest";

const deliverRichAgentCard = vi.fn(async () => ({ id: "message-1", channel_id: "channel-1" }));

vi.mock("./rich-card-delivery", () => ({
  deliverRichAgentCard
}));

describe("postPersonaRichMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to deliverRichAgentCard", async () => {
    const { postPersonaRichMessage } = await import("./webhook-post");
    await postPersonaRichMessage("https://example.test/webhook", {
      recipient: "Gage",
      message: "Round-table briefing opened.",
      includeQuickActions: false
    });

    expect(deliverRichAgentCard).toHaveBeenCalledWith(
      "https://example.test/webhook",
      expect.objectContaining({
        recipient: "Gage",
        includeQuickActions: false
      })
    );
  });
});
