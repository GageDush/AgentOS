"use client";

import { AgentRichMessageCard, SandboxApprovalCenter, type ForgeApprovalItem } from "@agentos/ui";
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
  onRichAction?: (actionType: AgentRichQuickActionType, scope?: AgentRichMessageScope) => void | Promise<void>;
  busyId?: string;
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
  onRichAction,
  busyId,
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
        <AgentRichMessageCard
          message={cardMessage}
          pendingApprovals={pendingScope}
          busyActionType={busyRichAction}
          onExecuteAction={onRichAction}
        />
      ) : null}
      <SandboxApprovalCenter
        approvals={approvals}
        onAllowOnce={onAllowOnce}
        onAllowMission={onAllowMission}
        onDeny={onDeny}
        busyId={busyId}
      />
    </div>
  );
}
