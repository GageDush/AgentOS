"use client";

import { AgentRichMessageCard, SandboxApprovalCenter, ScrollReveal, type ForgeApprovalItem } from "@agentos/ui";
import {
  buildAshAdminRichMessage,
  type AgentRichMessage,
  type AgentRichMessageScope,
  type AgentRichQuickActionType,
  type ApprovalRecord,
  type PendingApprovalScope
} from "@agentos/shared";

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

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {cardMessage ? (
        <ScrollReveal staggerIndex={0}>
          <AgentRichMessageCard
            message={cardMessage}
            pendingApprovals={pendingScope}
            busyActionType={busyRichAction}
            onExecuteAction={onRichAction}
          />
        </ScrollReveal>
      ) : null}
      <ScrollReveal staggerIndex={1} staggerMs={70}>
        <SandboxApprovalCenter
          approvals={approvals}
          onAllowOnce={onAllowOnce}
          onAllowMission={onAllowMission}
          onDeny={onDeny}
          onApproveAll={onApproveAll}
          busyId={busyId}
          busyBulk={busyBulk}
        />
      </ScrollReveal>
    </div>
  );
}
