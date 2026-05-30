import { describe, expect, it } from "vitest";
import { calculateUsageSummary, defaultBudgets, defaultUsageEvents } from "./index";

describe("usage summary", () => {
  it("summarizes seeded mock usage", () => {
    const summary = calculateUsageSummary(defaultUsageEvents, defaultBudgets);
    expect(summary.totalTokens).toBeGreaterThan(0);
    expect(summary.hardStopEnabled).toBe(true);
  });
});
