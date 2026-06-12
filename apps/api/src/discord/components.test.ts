import { describe, expect, it } from "vitest";
import { buildActionRows, encodeCustomId, parseCustomId } from "./components";

describe("discord components", () => {
  it("round-trips custom ids", () => {
    const id = encodeCustomId("approve_once", "approval-123");
    expect(parseCustomId(id)).toEqual({ action: "approve_once", targetId: "approval-123" });
  });

  it("builds button rows with emoji labels", () => {
    const rows = buildActionRows([
      { action: "ack", label: "Seen", style: "secondary", emoji: "👁️" },
      { action: "deny", targetId: "a1", label: "Deny", style: "danger" }
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
  });
});
