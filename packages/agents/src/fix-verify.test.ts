import { describe, expect, it } from "vitest";
import { runFixVerifyLoop } from "./fix-verify";

describe("fix-verify", () => {
  it("passes on first successful test", async () => {
    const result = await runFixVerifyLoop(async () => ({ ok: true, exitCode: 0 }), { maxRetries: 2 });
    expect(result.ok).toBe(true);
    expect(result.needsAttention).toBe(false);
    expect(result.attempts).toHaveLength(1);
  });

  it("marks needs_attention after retries exhausted", async () => {
    const result = await runFixVerifyLoop(async () => ({ ok: false, exitCode: 1 }), { maxRetries: 1 });
    expect(result.ok).toBe(false);
    expect(result.needsAttention).toBe(true);
    expect(result.attempts.length).toBeGreaterThan(1);
  });
});
