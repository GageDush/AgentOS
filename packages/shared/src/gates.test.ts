import { describe, expect, it } from "vitest";
import { summarizeGateResults, type GateResult } from "./gates";

describe("gates", () => {
  it("summarizes gate results", () => {
    const results: GateResult[] = [
      { gateId: "qa", status: "pass", summary: "ok" },
      { gateId: "security", status: "fail", summary: "semgrep" }
    ];
    expect(summarizeGateResults(results)).toEqual({ passed: 1, failed: 1, total: 2 });
  });
});
