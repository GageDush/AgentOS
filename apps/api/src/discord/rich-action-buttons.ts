import type { ActionButtonSpec } from "./components";
import {
  buildRichQuickActionButtons,
  decodeRichQuickActionTargetId,
  richQuickActionDiscordAction,
  type AgentRichMessageScope
} from "@agentos/shared";
import type { ApprovalRecord } from "@agentos/shared";
import { buildActionRows } from "./components";

export function richActionScopeContext(approvals: ApprovalRecord[]) {
  return {
    pendingApprovals: approvals
      .filter((approval) => approval.status === "pending")
      .map((approval) => ({
        id: approval.id,
        missionId: approval.missionId,
        runId: approval.runId,
        status: approval.status
      }))
  };
}

export function buildRichQuickActionRows(
  scope: AgentRichMessageScope | undefined,
  approvals: ApprovalRecord[]
) {
  const buttons: ActionButtonSpec[] = buildRichQuickActionButtons(scope, richActionScopeContext(approvals)).map(
    (button) => ({
      action: button.discordAction,
      targetId: button.targetId,
      label: button.label,
      style: button.style,
      emoji: button.emoji,
      disabled: button.disabled
    })
  );
  return buildActionRows(buttons);
}

export function richActionScopeFromButton(action: string, targetId?: string): AgentRichMessageScope {
  if (action === "rich_approve" || action === "rich_deny") {
    return { approvalRequestId: targetId };
  }
  return decodeRichQuickActionTargetId(targetId);
}

export function richActionTypeFromDiscordAction(action: string) {
  switch (action) {
    case richQuickActionDiscordAction("approve"):
      return "approve" as const;
    case richQuickActionDiscordAction("deny"):
      return "deny" as const;
    case richQuickActionDiscordAction("request_more_information"):
      return "request_more_information" as const;
    case richQuickActionDiscordAction("agent_received_response"):
      return "agent_received_response" as const;
    case richQuickActionDiscordAction("agent_responding"):
      return "agent_responding" as const;
    case richQuickActionDiscordAction("agent_completed_task"):
      return "agent_completed_task" as const;
    default:
      return undefined;
  }
}
