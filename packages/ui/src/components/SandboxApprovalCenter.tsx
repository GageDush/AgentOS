"use client";

import type { ForgeApprovalItem } from "../adapters/types";
import { MagneticButton } from "../motion/MagneticButton";
import { ApprovalCard } from "./ApprovalCard";
import { TerminalWindow } from "./TerminalWindow";

type SandboxApprovalCenterProps = {
  approvals: ForgeApprovalItem[];
  onAllowOnce?: (id: string) => void;
  onAllowMission?: (id: string) => void;
  onDeny?: (id: string) => void;
  onApproveAll?: () => void;
  busyId?: string;
  busyBulk?: boolean;
};

export function SandboxApprovalCenter({
  approvals,
  onAllowOnce,
  onAllowMission,
  onDeny,
  onApproveAll,
  busyId,
  busyBulk
}: SandboxApprovalCenterProps) {
  const bulkDisabled = busyBulk || Boolean(busyId);

  return (
    <TerminalWindow
      title="Sandbox Approval Center"
      subtitle="Elevated commands awaiting operator decision"
      actions={
        approvals.length > 1 && onApproveAll ? (
          <MagneticButton variant="primary" disabled={bulkDisabled} onClick={onApproveAll}>
            {busyBulk ? "Approving…" : `Approve all (${approvals.length})`}
          </MagneticButton>
        ) : null
      }
    >
      {approvals.length === 0 ? (
        <p style={{ color: "var(--forge-muted)", margin: 0 }}>No pending approvals.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {approvals.length > 1 && onApproveAll ? (
            <p style={{ color: "var(--forge-soft)", margin: 0, fontSize: "0.78rem" }}>
              Clear stale dashboard approvals in one step. Active runs still blocked on approval are requeued.
            </p>
          ) : null}
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onAllowOnce={onAllowOnce}
              onAllowMission={onAllowMission}
              onDeny={onDeny}
              busy={busyBulk || busyId === approval.id}
            />
          ))}
        </div>
      )}
    </TerminalWindow>
  );
}
