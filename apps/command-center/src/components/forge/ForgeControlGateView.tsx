"use client";

import { AgentRichMessageCard, ScrollReveal, type ForgeApprovalItem } from "@agentos/ui";
import {
  buildAshAdminRichMessage,
  type AgentRichMessage,
  type AgentRichMessageScope,
  type AgentRichQuickActionType,
  type ApprovalRecord,
  type PendingApprovalScope
} from "@agentos/shared";
import "./forge-control-gate.css";

type ForgeControlGateViewProps = {
  approvals: ForgeApprovalItem[];
  richMessage?: AgentRichMessage;
  richScope?: AgentRichMessageScope;
  pendingApprovals?: ApprovalRecord[];
  operatorName?: string;
  onAllowOnce?: (id: string) => void;
  onAllowMission?: (id: string) => void;
  onDeny?: (id: string) => void;
  onApproveAll?: () => void;
  onRichAction?: (actionType: AgentRichQuickActionType, scope?: AgentRichMessageScope) => void | Promise<void>;
  busyId?: string;
  busyBulk?: boolean;
  busyRichAction?: AgentRichQuickActionType;
};

function riskKey(risk: string): "low" | "medium" | "high" {
  const r = (risk ?? "").toLowerCase();
  if (r.includes("high") || r.includes("crit") || r.includes("danger")) return "high";
  if (r.includes("med") || r.includes("warn") || r.includes("elevat")) return "medium";
  return "low";
}

function Kpi({
  label,
  value,
  sub,
  accent = false
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`fgate-kpi${accent ? " fgate-kpi--accent" : ""}`}>
      <div className="fgate-kpi-label">{label}</div>
      <div className="fgate-kpi-value">{value}</div>
      {sub ? <div className="fgate-kpi-sub">{sub}</div> : null}
    </div>
  );
}

export function ForgeControlGateView({
  approvals,
  richMessage,
  richScope,
  pendingApprovals = [],
  operatorName = "Operator",
  onAllowOnce,
  onAllowMission,
  onDeny,
  onApproveAll,
  onRichAction,
  busyId,
  busyBulk,
  busyRichAction
}: ForgeControlGateViewProps) {
  const primaryApproval = pendingApprovals[0];
  const cardMessage =
    richMessage ??
    (primaryApproval
      ? {
          ...buildAshAdminRichMessage(operatorName, primaryApproval.inputSummary),
          scope: richScope ?? {
            approvalRequestId: primaryApproval.id,
            missionId: primaryApproval.missionId,
            runId: primaryApproval.runId,
            correlationId: primaryApproval.correlationId
          },
          status: { label: "Awaiting response", routing: "Control Gate" }
        }
      : undefined);

  const pendingScope: PendingApprovalScope[] = pendingApprovals.map((approval) => ({
    id: approval.id,
    missionId: approval.missionId,
    runId: approval.runId,
    status: approval.status
  }));

  const count = approvals.length;
  const highRisk = approvals.filter((a) => riskKey(a.riskLevel) === "high").length;
  const agentsWaiting = new Set(approvals.map((a) => a.requestingAgent)).size;

  return (
    <div className="fgate">
      <div className="fgate-kpis">
        <Kpi label="Awaiting you" value={count} sub="all surfaces" accent />
        <Kpi label="High risk" value={highRisk} sub={highRisk ? "needs care" : "none pending"} />
        <Kpi label="Agents waiting" value={agentsWaiting} sub="requesting consent" />
        <Kpi label="Signed in" value={operatorName} sub="approvals attributed here" />
      </div>

      {cardMessage ? (
        <ScrollReveal staggerIndex={0}>
          <div className="fgate-context">
            <p className="fgate-context-kicker">From your admin agent</p>
            <AgentRichMessageCard
              message={cardMessage}
              pendingApprovals={pendingScope}
              busyActionType={busyRichAction}
              onExecuteAction={onRichAction}
            />
          </div>
        </ScrollReveal>
      ) : null}

      <div className="fgate-section-head">
        <div className="fgate-meta">
          <span className="fgate-meta-num">01/</span>
          <span className="fgate-meta-label">Awaiting your review</span>
          <span className="fgate-meta-rail" />
          <span className="fgate-meta-right">{count ? `${count} pending` : "caught up"}</span>
        </div>
        <div className="fgate-section-row">
          <h2 className="fgate-h" dangerouslySetInnerHTML={{ __html: count ? "Open <em>gates.</em>" : "All <em>caught up.</em>" }} />
          {count > 1 && onApproveAll ? (
            <button type="button" className="fgate-approve-all" disabled={busyBulk} onClick={onApproveAll}>
              {busyBulk ? "Approving…" : "Approve all once"}
            </button>
          ) : null}
        </div>
      </div>

      {count === 0 ? (
        <div className="fgate-empty">
          <div className="fgate-empty-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="fgate-empty-h">No approvals awaiting.</div>
          <div className="fgate-empty-p">New gates surface here in real time as agents request consent. Nothing runs a write, push, shell, refund, or send without you.</div>
        </div>
      ) : (
        <div className="fgate-list">
          {approvals.map((item, index) => {
            const busy = Boolean(busyId && busyId.includes(item.id));
            const risk = riskKey(item.riskLevel);
            return (
              <ScrollReveal key={item.id} staggerIndex={index + 1} staggerMs={60}>
                <div className={`fgate-card${busy ? " fgate-card--busy" : ""}`}>
                  <div className="fgate-card-main">
                    <div className="fgate-card-top">
                      <span className="fgate-badge">
                        <span className="fgate-badge-dot" />
                        Awaiting
                      </span>
                      <span className={`fgate-risk fgate-risk--${risk}`}>{item.riskLevel || "risk"}</span>
                      <span className="fgate-id">
                        {item.id}
                        {item.requestingAgent ? ` · ${item.requestingAgent}` : ""}
                      </span>
                    </div>
                    <div className="fgate-scope">
                      <span className="fgate-verb">{item.requestedAction || "action"}</span>
                      {item.affectedScope ? (
                        <>
                          (<span className="fgate-target">{item.affectedScope}</span>)
                        </>
                      ) : null}
                    </div>
                    {item.reason ? <div className="fgate-reason">{item.reason}</div> : null}
                    {item.runId ? <div className="fgate-run">run {item.runId}</div> : null}
                  </div>
                  <div className="fgate-actions">
                    <button type="button" className="fgate-btn" disabled={busy} onClick={() => onAllowOnce?.(item.id)}>
                      Approve once
                    </button>
                    <button type="button" className="fgate-btn fgate-btn--secondary" disabled={busy} onClick={() => onAllowMission?.(item.id)}>
                      For mission
                    </button>
                    <button type="button" className="fgate-btn fgate-btn--danger" disabled={busy} onClick={() => onDeny?.(item.id)}>
                      Deny
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
