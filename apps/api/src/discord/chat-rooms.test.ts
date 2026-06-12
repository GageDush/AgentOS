import { describe, expect, it } from "vitest";
import {
  formatChatRoomSummaryHeader,
  isReleaseRoomMessage,
  parseChatRoomNumber,
  parseParticipantAgentIds,
  parseRoomReservationIntent
} from "./chat-rooms";

describe("parseChatRoomNumber", () => {
  it("parses explicit reserve phrases", () => {
    expect(parseChatRoomNumber("reserve chat room 1")).toBe(1);
    expect(parseChatRoomNumber("I'll take chat room 2")).toBe(2);
    expect(parseChatRoomNumber("using chat room 3")).toBe(3);
    expect(parseChatRoomNumber("room 2")).toBe(2);
  });

  it("returns null when no room number", () => {
    expect(parseChatRoomNumber("hello round table")).toBeNull();
  });
});

describe("parseRoomReservationIntent", () => {
  it("detects reservation intent", () => {
    expect(parseRoomReservationIntent("I'll reserve chat room 1 for API design")).toEqual({ room: 1 });
    expect(parseRoomReservationIntent("taking room 3 with Misty")).toEqual({ room: 3 });
  });

  it("ignores bare numbers without reserve context", () => {
    expect(parseRoomReservationIntent("we have 3 options")).toBeNull();
  });
});

describe("parseParticipantAgentIds", () => {
  it("includes reserving agent and named peers", () => {
    const ids = parseParticipantAgentIds("reserve room 1 with Brock and Misty", "admin-agent");
    expect(ids).toContain("admin-agent");
    expect(ids).toContain("builder-agent");
    expect(ids).toContain("qa-agent");
    expect(ids.length).toBeLessThanOrEqual(3);
  });
});

describe("isReleaseRoomMessage", () => {
  it("detects release phrases", () => {
    expect(isReleaseRoomMessage("release room")).toBe(true);
    expect(isReleaseRoomMessage("release chat room 2", 2)).toBe(true);
    expect(isReleaseRoomMessage("release chat room 2", 1)).toBe(false);
  });
});

describe("formatChatRoomSummaryHeader", () => {
  it("formats round-table summary header", () => {
    expect(formatChatRoomSummaryHeader(2, "released by Gage")).toBe(
      "Chat room 2 summary (released by Gage)"
    );
  });
});
