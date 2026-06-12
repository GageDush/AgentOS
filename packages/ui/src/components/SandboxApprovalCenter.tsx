"use client";

import type { ForgeApprovalItem } from "../adapters/types";
import { ApprovalCard } from "./ApprovalCard";
import { TerminalWindow } from "./TerminalWindow";

type SandboxApprovalCenterProps = {
  approvals: ForgeApprovalItem[];
  onAllowOnce?: (id: string) => void;
  onAllowMission?: (id: string) => void;
  onDeny?: (id: string) => void;
  busyId?: string;
};

export function SandboxApprovalCenter({
  approvals,
  onAllowOnce,
  onAllowMission,
  onDeny,
  busyId
}: SandboxApprovalCenterProps) {
  return (
    <TerminalWindow title="Sandbox Approval Center" subtitle="Elevated commands awaiting operator decision">
      {approvals.length === 0 ? (
        <p style={{ color: "var(--forge-muted)", margin: 0 }}>No pending approvals.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onAllowOnce={onAllowOnce}
              onAllowMission={onAllowMission}
              onDeny={onDeny}
              busy={busyId === approval.id}
            />
          ))}
        </div>
      )}
    </TerminalWindow>
  );
}
