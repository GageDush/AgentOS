import { describe, expect, it } from "vitest";
import { verifyDiscordInteractionSignature } from "./verify";

describe("verifyDiscordInteractionSignature", () => {
  it("rejects malformed signatures", () => {
    expect(verifyDiscordInteractionSignature("00".repeat(32), "00", "123", "{}")).toBe(false);
  });
});
