import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockIsDiscordBotEnabled = vi.fn();
const mockLoadDiscordGuildState = vi.fn();
const mockDispatch = vi.fn();
const mockHandleChat = vi.fn();

vi.mock("./client", () => ({
  isDiscordBotEnabled: () => mockIsDiscordBotEnabled(),
  loadDiscordGuildState: () => mockLoadDiscordGuildState()
}));

vi.mock("./interactions", () => ({
  dispatchDiscordInteraction: (...args: unknown[]) => mockDispatch(...args)
}));

vi.mock("./chat", () => ({
  handleDiscordChannelMessage: (...args: unknown[]) => mockHandleChat(...args)
}));

describe("discord gateway", () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsDiscordBotEnabled.mockReturnValue(false);
    mockLoadDiscordGuildState.mockReturnValue(undefined);
    mockDispatch.mockResolvedValue(undefined);
    mockHandleChat.mockResolvedValue(undefined);
    delete process.env.DISCORD_BOT_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns disabled when bot integration is off", async () => {
    const { startDiscordGateway } = await import("./gateway");
    const result = await startDiscordGateway();
    expect(result).toEqual({ ok: false, reason: "disabled" });
  });

  it("returns no-token when bot is enabled without token", async () => {
    mockIsDiscordBotEnabled.mockReturnValue(true);
    mockLoadDiscordGuildState.mockReturnValue({ channels: { general: "1" } });
    const { startDiscordGateway } = await import("./gateway");
    const result = await startDiscordGateway();
    expect(result).toEqual({ ok: false, reason: "no-token" });
  });

  it("starts connecting when gateway bot endpoint resolves", async () => {
    mockIsDiscordBotEnabled.mockReturnValue(true);
    mockLoadDiscordGuildState.mockReturnValue({ channels: { general: "chan-1" } });
    process.env.DISCORD_BOT_TOKEN = "test-token";

    class MockWebSocket {
      static OPEN = 1;
      static CONNECTING = 0;
      readyState = MockWebSocket.CONNECTING;
      addEventListener = vi.fn();
      close = vi.fn();
      send = vi.fn();
    }

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ url: "wss://gateway.discord.gg" })
      }))
    );
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);

    const { startDiscordGateway } = await import("./gateway");
    const result = await startDiscordGateway();
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("connecting");
  });
});
