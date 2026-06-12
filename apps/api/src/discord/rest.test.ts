import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("DiscordRestClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries on HTTP 429 rate limit", async () => {
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ retry_after: 0.01 }), { status: 429 });
      }
      return new Response(JSON.stringify({ id: "guild-1", name: "AgentOS" }), { status: 200 });
    });

    const { DiscordRestClient } = await import("./rest");
    const client = new DiscordRestClient("test-token", "guild-1");
    const guild = await client.getGuild();
    expect(calls).toBeGreaterThan(1);
    expect(guild).toMatchObject({ id: "guild-1" });
  });

  it("throws on non-retryable errors", async () => {
    fetchMock.mockResolvedValue(new Response("forbidden", { status: 403 }));
    const { DiscordRestClient } = await import("./rest");
    const client = new DiscordRestClient("test-token", "guild-1");
    await expect(client.getGuild()).rejects.toThrow(/403/);
  });
});
