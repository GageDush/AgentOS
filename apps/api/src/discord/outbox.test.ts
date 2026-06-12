import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "@agentos/shared";

vi.mock("./client", () => ({ isDiscordBotEnabled: vi.fn(() => false) }));
vi.mock("./bootstrap", () => ({ loadDiscordGuildState: vi.fn(() => null) }));
vi.mock("./registry", () => ({ hasNotifiedOutbox: () => false, markNotifiedOutbox: vi.fn() }));
vi.mock("./webhook-post", () => ({
  postPersonaWebhookMessage: vi.fn(async () => ({ id: "msg-1", channel_id: "ch-1" }))
}));

describe("discord outbox", () => {
  it("skips audit dispatch when bot disabled", async () => {
    const { dispatchAuditToDiscord } = await import("./outbox");
    const event: AuditEvent = {
      id: "a1",
      workspaceId: "ws-local",
      event: "test.event",
      actor: "qa-agent",
      summary: "test",
      createdAt: new Date().toISOString()
    };
    const result = await dispatchAuditToDiscord(event);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("disabled");
  });

  it("uses danger tone for gate failure events when enabled", async () => {
    const client = await import("./client");
    vi.mocked(client.isDiscordBotEnabled).mockReturnValue(true);
    const bootstrap = await import("./bootstrap");
    vi.mocked(bootstrap.loadDiscordGuildState).mockReturnValue({
      webhooks: { opsFeed: { id: "1", token: "t", name: "ops", channel_id: "ch" } }
    } as never);
    const webhook = await import("./webhook-post");
    const { dispatchAuditToDiscord } = await import("./outbox");
    const event: AuditEvent = {
      id: "a2",
      workspaceId: "ws-local",
      event: "gate.qa_failed",
      actor: "qa-agent",
      summary: "pnpm test failed",
      createdAt: new Date().toISOString()
    };
    const result = await dispatchAuditToDiscord(event);
    expect(result.ok).toBe(true);
    expect(webhook.postPersonaWebhookMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Gate failed", tone: "danger" })
    );
  });
});
