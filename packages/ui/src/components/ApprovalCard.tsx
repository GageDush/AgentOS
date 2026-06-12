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
    <ReactiveCard style={{ padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <p className="forge-mono" style={{ margin: 0, color: "var(--forge-accent)" }}>
            Sandbox Approval
          </p>
          <strong>{approval.requestingAgent}</strong>
        </div>
        <span className="forge-chip forge-chip-active">{approval.riskLevel}</span>
      </div>
      <p style={{ margin: "0 0 0.5rem", fontFamily: "var(--forge-mono)", fontSize: "0.82rem" }}>{approval.requestedAction}</p>
      {approval.reason ? <p style={{ margin: "0 0 0.5rem", color: "var(--forge-muted)", fontSize: "0.82rem" }}>{approval.reason}</p> : null}
      {approval.affectedScope ? (
        <p className="forge-mono" style={{ margin: "0 0 0.75rem", fontSize: "0.68rem", color: "var(--forge-soft)" }}>
          Scope: {approval.affectedScope}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
