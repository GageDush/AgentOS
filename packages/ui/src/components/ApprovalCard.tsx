"use client";

import type { ForgeApprovalItem } from "../adapters/types";
import { MagneticButton } from "../motion/MagneticButton";
import { ReactiveCard } from "../motion/ReactiveCard";

type ApprovalCardProps = {
  approval: ForgeApprovalItem;
  onAllowOnce?: (id: string) => void;
  onAllowMission?: (id: string) => void;
  onDeny?: (id: string) => void;
  busy?: boolean;
};

export function ApprovalCard({ approval, onAllowOnce, onAllowMission, onDeny, busy }: ApprovalCardProps) {
  return (
    <ReactiveCard className="forge-approval-card">
      <div className="forge-approval-head">
        <div>
          <p className="forge-mono" style={{ margin: 0, color: "var(--forge-accent)", fontSize: "0.68rem" }}>
            Sandbox Approval
          </p>
          <strong>{approval.requestingAgent}</strong>
        </div>
        <span className="forge-chip forge-chip-active">{approval.riskLevel}</span>
      </div>
      <p className="forge-approval-command">{approval.requestedAction}</p>
      {approval.reason ? <p className="forge-approval-meta">{approval.reason}</p> : null}
      {approval.affectedScope ? (
        <p className="forge-mono" style={{ margin: "0 0 0.75rem", fontSize: "0.68rem", color: "var(--forge-soft)" }}>
          Scope: {approval.affectedScope}
        </p>
      ) : null}
      <div className="forge-approval-actions">
        <MagneticButton variant="primary" disabled={busy} onClick={() => onAllowOnce?.(approval.id)}>
          Allow Once
        </MagneticButton>
        <MagneticButton disabled={busy} onClick={() => onAllowMission?.(approval.id)}>
          Allow for Mission
        </MagneticButton>
        <MagneticButton variant="danger" disabled={busy} onClick={() => onDeny?.(approval.id)}>
          Deny
        </MagneticButton>
      </div>
    </ReactiveCard>
  );
}
