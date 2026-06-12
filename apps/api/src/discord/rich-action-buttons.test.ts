import { describe, expect, it } from "vitest";
import { buildRichQuickActionRows, richActionScopeFromButton } from "./rich-action-buttons";

describe("rich-action-buttons", () => {
  it("builds rows from scope", () => {
    const rows = buildRichQuickActionRows({ runId: "run-1", missionId: "m-1" }, []);
    expect(Array.isArray(rows)).toBe(true);
  });

  it("decodes approve scope", () => {
    const scope = richActionScopeFromButton("rich_approve", "approval-1");
    expect(scope.approvalRequestId).toBe("approval-1");
  });
});
