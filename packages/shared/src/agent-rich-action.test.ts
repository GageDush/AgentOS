import { describe, expect, it } from "vitest";
import {
  buildRichQuickActionButtons,
  decodeRichQuickActionTargetId,
  encodeRichQuickActionTargetId,
  requiresApprovalScope,
  validateRichQuickActionScope
} from "./agent-rich-action";

describe("agent rich quick actions", () => {
  const pending = [
    {
      id: "approval-terminal-run",
      missionId: "mission-seed-local-checks",
      runId: "mission-run-seed",
      status: "pending"
    }
  ];

  it("blocks approve without scoped pending approval", () => {
    const result = validateRichQuickActionScope("approve", {}, { pendingApprovals: pending });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("scoped pending approval");
    }
  });

  it("resolves approve against a pending approval id", () => {
    const result = validateRichQuickActionScope(
      "approve",
      { approvalRequestId: "approval-terminal-run" },
      { pendingApprovals: pending }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scope.approvalRequestId).toBe("approval-terminal-run");
      expect(result.scope.runId).toBe("mission-run-seed");
    }
  });

  it("builds disabled buttons when scope is missing", () => {
    const buttons = buildRichQuickActionButtons(undefined, { pendingApprovals: pending });
    expect(buttons.find((button) => button.actionType === "approve")?.disabled).toBe(true);
    expect(buttons.find((button) => button.actionType === "deny")?.disabled).toBe(true);
  });

  it("builds enabled approve/deny buttons for scoped cards", () => {
    const buttons = buildRichQuickActionButtons(
      { approvalRequestId: "approval-terminal-run" },
      { pendingApprovals: pending }
    );
    expect(buttons.find((button) => button.actionType === "approve")?.disabled).toBe(false);
    expect(buttons.find((button) => button.actionType === "deny")?.disabled).toBe(false);
  });

  it("encodes and decodes run scope targets", () => {
    const encoded = encodeRichQuickActionTargetId({
      missionId: "mission-seed-local-checks",
      runId: "mission-run-seed"
    });
    expect(decodeRichQuickActionTargetId(encoded)).toEqual({
      missionId: "mission-seed-local-checks",
      runId: "mission-run-seed"
    });
  });

  it("marks approval actions as scope-sensitive", () => {
    expect(requiresApprovalScope("approve")).toBe(true);
    expect(requiresApprovalScope("agent_responding")).toBe(false);
  });
});
