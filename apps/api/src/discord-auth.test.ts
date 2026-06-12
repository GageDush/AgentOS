import { describe, expect, it } from "vitest";
import { buildDiscordAuthorizeUrl, getDiscordOAuthRedirectUri } from "./discord-auth";

describe("discord oauth", () => {
  it("builds an authorize URL with the configured redirect URI", () => {
    process.env.DISCORD_CLIENT_ID = "1234567890";
    process.env.DISCORD_OAUTH_REDIRECT_URI = "https://api.flous.dev/auth/discord/callback";
    const url = new URL(buildDiscordAuthorizeUrl("state-abc"));
    expect(url.hostname).toBe("discord.com");
    expect(url.searchParams.get("client_id")).toBe("1234567890");
    expect(url.searchParams.get("redirect_uri")).toBe("https://api.flous.dev/auth/discord/callback");
    expect(url.searchParams.get("state")).toBe("state-abc");
    expect(url.searchParams.get("scope")).toBe("identify");
  });

  it("defaults redirect URI to local API callback", () => {
    delete process.env.DISCORD_OAUTH_REDIRECT_URI;
    process.env.AGENTOS_API_PORT = "8787";
    expect(getDiscordOAuthRedirectUri()).toBe("http://127.0.0.1:8787/auth/discord/callback");
  });

  it("uses production redirect URI for flous.dev host", () => {
    process.env.DISCORD_OAUTH_REDIRECT_URI = "http://127.0.0.1:8787/auth/discord/callback";
    process.env.DISCORD_OAUTH_REDIRECT_URI_PROD = "https://api.flous.dev/auth/discord/callback";
    expect(getDiscordOAuthRedirectUri("api.flous.dev")).toBe("https://api.flous.dev/auth/discord/callback");
    expect(getDiscordOAuthRedirectUri("127.0.0.1:8787")).toBe("http://127.0.0.1:8787/auth/discord/callback");
  });
});
