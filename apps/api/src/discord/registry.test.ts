import { describe, expect, it } from "vitest";
import { hasNotifiedOutbox, markNotifiedOutbox } from "./registry";

describe("discord registry outbox", () => {
  it("tracks notified ids", () => {
    const key = `test-${Date.now()}`;
    expect(hasNotifiedOutbox("audit", key)).toBe(false);
    markNotifiedOutbox("audit", key);
    expect(hasNotifiedOutbox("audit", key)).toBe(true);
  });
});
