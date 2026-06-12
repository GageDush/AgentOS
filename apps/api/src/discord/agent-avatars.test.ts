import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("agent avatars", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("prefers AGENTOS_DISCORD_AVATAR_BASE_URL for Discord", async () => {
    process.env.AGENTOS_DISCORD_AVATAR_BASE_URL = "https://cdn.example.com/portraits";
    const { resolveDiscordAgentAvatarUrl } = await import("./agent-avatars");
    expect(resolveDiscordAgentAvatarUrl("admin-agent")).toBe(
      "https://cdn.example.com/portraits/agentos-operator.png"
    );
  });

  it("falls back to API media/agents when Discord base is unset", async () => {
    delete process.env.AGENTOS_DISCORD_AVATAR_BASE_URL;
    process.env.AGENTOS_API_BASE_URL = "https://api.flous.dev";
    const { resolveDiscordAgentAvatarUrl } = await import("./agent-avatars");
    expect(resolveDiscordAgentAvatarUrl("builder-agent")).toBe(
      "https://api.flous.dev/media/agents/builder-agent.png"
    );
  });

  it("does not return localhost URLs for Discord", async () => {
    delete process.env.AGENTOS_DISCORD_AVATAR_BASE_URL;
    delete process.env.AGENTOS_API_BASE_URL;
    delete process.env.AGENTOS_PUBLIC_APP_URL;
    delete process.env.DEPLOYMENT_URL;
    const { resolveHttpAgentAvatarUrl } = await import("./agent-avatars");
    expect(resolveHttpAgentAvatarUrl("admin-agent")).toBeUndefined();
  });
});
