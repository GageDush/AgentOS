import { describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
  isDiscordBotEnabled: vi.fn(() => false),
  getDiscordRestClient: vi.fn(() => null),
  resolveAgentOsChannelId: vi.fn(() => "channel-1")
}));

vi.mock("./bootstrap", () => ({
  loadDiscordGuildState: vi.fn(() => null)
}));

describe("sendAgentMessage", () => {
  it("returns mock mode when bot disabled", async () => {
    const { sendAgentMessage } = await import("./messenger");
    const result = await sendAgentMessage({
      agentId: "builder-agent",
      title: "Mission update",
      description: "Test"
    });
    expect(result).toEqual({ ok: false, mode: "mock" });
  });
});
