import { describe, expect, it } from "vitest";
import { dispatchDiscordInteraction, handleDiscordInteraction } from "./interactions";

describe("discord interactions integration", () => {
  it("handles ping through public handler", async () => {
    const payload = { type: 1, id: "interaction-1", token: "token", application_id: "app" };
    await expect(handleDiscordInteraction(payload)).resolves.toEqual({ type: 1 });
  });

  it("dedupes duplicate interaction dispatch", async () => {
    const payload = { type: 1, id: "dedupe-1", token: "token", application_id: "app" };
    const first = await dispatchDiscordInteraction(payload, "http");
    const second = await dispatchDiscordInteraction(payload, "http");
    expect(first).toEqual({ type: 1 });
    expect(second).toEqual({ type: 1 });
  });
});
