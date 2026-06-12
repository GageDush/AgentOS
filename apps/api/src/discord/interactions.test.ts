import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dispatchDiscordInteraction,
  interactionPublicKeyConfigured,
  resolveDiscordInteraction,
  verifyInteractionRequest
} from "./interactions";

vi.mock("./button-handlers", () => ({
  handleButtonPress: vi.fn(async () => ({ type: 4, data: { content: "button-ok" } }))
}));

vi.mock("./commands", () => ({
  handleSlashCommand: vi.fn(async () => ({ type: 4, data: { content: "slash-ok" } }))
}));

describe("discord interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISCORD_PUBLIC_KEY;
  });

  it("responds to ping with type 1", async () => {
    await expect(resolveDiscordInteraction({ id: "1", application_id: "app", token: "tok", type: 1 })).resolves.toEqual({
      type: 1
    });
  });

  it("rejects unsigned interaction requests when public key is configured", () => {
    process.env.DISCORD_PUBLIC_KEY = "00".repeat(32);
    expect(verifyInteractionRequest({}, "{}")).toBe(false);
  });

  it("reports public key configuration", () => {
    expect(interactionPublicKeyConfigured()).toBe(false);
    process.env.DISCORD_PUBLIC_KEY = "abc";
    expect(interactionPublicKeyConfigured()).toBe(true);
  });

  it("routes button presses", async () => {
    const { handleButtonPress } = await import("./button-handlers");
    const response = await resolveDiscordInteraction({
      id: "2",
      application_id: "app",
      token: "tok",
      type: 3,
      data: { custom_id: "approve:run-1", component_type: 2 },
      member: { user: { id: "9", username: "tester" } }
    });
    expect(handleButtonPress).toHaveBeenCalled();
    expect(response).toEqual({ type: 4, data: { content: "button-ok" } });
  });

  it("dedupes duplicate interaction ids over http", async () => {
    const payload = {
      id: "dup-1",
      application_id: "app",
      token: "tok",
      type: 1
    };
    const first = await dispatchDiscordInteraction(payload, "http");
    const second = await dispatchDiscordInteraction(payload, "http");
    expect(first).toEqual({ type: 1 });
    expect(second).toEqual({ type: 1 });
  });
});
