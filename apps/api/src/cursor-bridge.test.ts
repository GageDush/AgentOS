import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("cursor bridge", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("reports disabled when CURSOR_API_KEY is missing", async () => {
    delete process.env.CURSOR_API_KEY;
    const { getCursorBridgeStatus, isCursorBridgeEnabled } = await import("./cursor-bridge");
    expect(isCursorBridgeEnabled()).toBe(false);
    expect(getCursorBridgeStatus().reason).toContain("CURSOR_API_KEY");
  });

  it("enables when CURSOR_API_KEY is set", async () => {
    process.env.CURSOR_API_KEY = "cursor_test_key";
    const { isCursorBridgeEnabled } = await import("./cursor-bridge");
    expect(isCursorBridgeEnabled()).toBe(true);
  });
});
