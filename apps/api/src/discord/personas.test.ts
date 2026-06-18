import { describe, expect, it } from "vitest";
import { ROUND_TABLE_AGENT_IDS, ROSTER_PERSONAS, roundTableRosterLabel } from "./personas";

describe("round-table roster", () => {
  it("includes every unique persona voice", () => {
    expect(ROUND_TABLE_AGENT_IDS.length).toBe(ROSTER_PERSONAS.length);
    expect(ROUND_TABLE_AGENT_IDS.length).toBeGreaterThanOrEqual(16);
    expect(ROUND_TABLE_AGENT_IDS).toContain("admin-agent");
    expect(ROUND_TABLE_AGENT_IDS).toContain("docs-agent");
    expect(ROUND_TABLE_AGENT_IDS).toContain("agentos-operator");
    expect(ROUND_TABLE_AGENT_IDS).toContain("context-minimizer");
  });

  it("formats roster labels for guides", () => {
    expect(roundTableRosterLabel()).toContain("[Admin] Ash");
    expect(roundTableRosterLabel()).toContain("[Docs] Dawn");
  });
});
