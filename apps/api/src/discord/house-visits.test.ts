import { describe, expect, it } from "vitest";
import {
  isEndVisitMessage,
  parseGuestAgentIds,
  parseHouseInviteIntent,
  parseVisitDurationMs
} from "./house-visits";

describe("house visit parsing", () => {
  it("parses town-square style invites", () => {
    const intent = parseHouseInviteIntent("invite Misty to Brock's house for coffee and QA stories");
    expect(intent).toBeTruthy();
    expect(intent?.hostAgentId).toBeTruthy();
    expect(intent?.guests).toContain("qa-agent");
    expect(intent?.topic.toLowerCase()).toContain("coffee");
  });

  it("parses channel-context invites with host from house", () => {
    const intent = parseHouseInviteIntent("invite Ash over for strategy chat", "code-implementer");
    expect(intent?.hostAgentId).toBe("code-implementer");
    expect(intent?.guests).toContain("admin-agent");
  });

  it("parses guest names without host collision", () => {
    const guests = parseGuestAgentIds("invite Misty and Ash to Brock's house", "builder-agent");
    expect(guests).toContain("qa-agent");
    expect(guests).toContain("admin-agent");
    expect(guests).not.toContain("builder-agent");
    expect(guests.length).toBeLessThanOrEqual(2);
  });

  it("parses visit duration minutes", () => {
    expect(parseVisitDurationMs("invite guest for 30 minutes")).toBe(30 * 60_000);
    expect(parseVisitDurationMs("no duration")).toBeGreaterThan(0);
  });

  it("detects end visit phrases", () => {
    expect(isEndVisitMessage("end visit")).toBe(true);
    expect(isEndVisitMessage("hello there")).toBe(false);
  });
});
