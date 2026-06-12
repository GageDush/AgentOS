import {
  AGENT_RICH_QUICK_ACTIONS,
  AGENT_RICH_QUICK_ACTION_BY_TYPE,
  type AgentQuickAction,
  type AgentRichMessageScope,
  type AgentRichQuickActionType
} from "./agent-rich-message";

export type PendingApprovalScope = {
  id: string;
  missionId?: string;
  runId?: string;
  status: string;
};

export type RichQuickActionScopeContext = {
  pendingApprovals: PendingApprovalScope[];
};

export type ResolvedRichQuickActionScope =
  | { ok: true; scope: AgentRichMessageScope }
  | { ok: false; reason: string };

export type RichQuickActionButtonSpec = {
  actionType: AgentRichQuickActionType;
  discordAction: string;
  label: string;
  emoji: string;
  style: "primary" | "secondary" | "success" | "danger";
  targetId?: string;
  disabled: boolean;
  disabledReason?: string;
};

const DISCORD_ACTION_BY_TYPE: Record<AgentRichQuickActionType, string> = {
  approve: "rich_approve",
  deny: "rich_deny",
  request_more_information: "rich_more_info",
  agent_received_response: "rich_received",
  agent_responding: "rich_responding",
  agent_completed_task: "rich_completed"
};

export const RICH_QUICK_ACTION_TO_RUNTIME_QUICK_ACTION = {
  approve: "approve",
  deny: "deny",
  request_more_information: "details"
} as const satisfies Partial<Record<AgentRichQuickActionType, string>>;

export function richQuickActionDiscordAction(actionType: AgentRichQuickActionType) {
  return DISCORD_ACTION_BY_TYPE[actionType];
}

export function requiresApprovalScope(actionType: AgentRichQuickActionType) {
  return actionType === "approve" || actionType === "deny";
}

export function requiresRunScope(actionType: AgentRichQuickActionType) {
  return (
    actionType === "agent_received_response" ||
    actionType === "agent_responding" ||
    actionType === "agent_completed_task"
  );
}

export function encodeRichQuickActionTargetId(scope: AgentRichMessageScope) {
  const parts = [scope.missionId ?? "", scope.runId ?? "", scope.approvalRequestId ?? ""];
  return parts.join("|");
}

export function decodeRichQuickActionTargetId(targetId?: string): AgentRichMessageScope {
  if (!targetId) return {};
  const [missionId, runId, approvalRequestId] = targetId.split("|");
  return {
    ...(missionId ? { missionId } : {}),
    ...(runId ? { runId } : {}),
    ...(approvalRequestId ? { approvalRequestId } : {})
  };
}

export function resolveRichQuickActionScope(
  scope: AgentRichMessageScope,
  context: RichQuickActionScopeContext
): ResolvedRichQuickActionScope {
  if (scope.approvalRequestId) {
    const approval = context.pendingApprovals.find(
      (item) => item.id === scope.approvalRequestId && item.status === "pending"
    );
    if (!approval) {
      return { ok: false, reason: "Approval request is not pending or was not found in scope." };
    }
    return {
      ok: true,
      scope: {
        approvalRequestId: approval.id,
        missionId: approval.missionId ?? scope.missionId,
        runId: approval.runId ?? scope.runId,
        correlationId: scope.correlationId
      }
    };
  }

  if (scope.runId) {
    const approval = context.pendingApprovals.find(
      (item) => item.runId === scope.runId && item.status === "pending"
    );
    if (approval) {
      return {
        ok: true,
        scope: {
          approvalRequestId: approval.id,
          missionId: approval.missionId ?? scope.missionId,
          runId: approval.runId ?? scope.runId,
          correlationId: scope.correlationId
        }
      };
    }
  }

  if (scope.missionId) {
    const approval = context.pendingApprovals.find(
      (item) => item.missionId === scope.missionId && item.status === "pending"
    );
    if (approval) {
      return {
        ok: true,
        scope: {
          approvalRequestId: approval.id,
          missionId: approval.missionId ?? scope.missionId,
          runId: approval.runId ?? scope.runId,
          correlationId: scope.correlationId
        }
      };
    }
  }

  return { ok: true, scope };
}

export function validateRichQuickActionScope(
  actionType: AgentRichQuickActionType,
  scope: AgentRichMessageScope,
  context: RichQuickActionScopeContext
): ResolvedRichQuickActionScope {
  const resolved = resolveRichQuickActionScope(scope, context);
  const baseScope = resolved.ok ? resolved.scope : scope;

  if (requiresApprovalScope(actionType)) {
    if (!resolved.ok) return resolved;
    if (!resolved.scope.approvalRequestId) {
      return {
        ok: false,
        reason: "Approve and deny require a scoped pending approval — global approval is blocked."
      };
    }
    return resolved;
  }

  if (requiresRunScope(actionType)) {
    if (!baseScope.runId && !scope.runId) {
      return { ok: false, reason: "This action requires an active mission run scope." };
    }
    return {
      ok: true,
      scope: {
        ...baseScope,
        runId: baseScope.runId ?? scope.runId,
        missionId: baseScope.missionId ?? scope.missionId,
        correlationId: baseScope.correlationId ?? scope.correlationId
      }
    };
  }

  if (actionType === "request_more_information") {
    if (!baseScope.missionId && !scope.missionId && !baseScope.runId && !scope.runId) {
      return { ok: false, reason: "More information requests require mission or run scope." };
    }
    return {
      ok: true,
      scope: {
        ...baseScope,
        missionId: baseScope.missionId ?? scope.missionId,
        runId: baseScope.runId ?? scope.runId,
        correlationId: baseScope.correlationId ?? scope.correlationId
      }
    };
  }

  return resolved;
}

function buttonStyleForAction(actionType: AgentRichQuickActionType): RichQuickActionButtonSpec["style"] {
  if (actionType === "approve") return "success";
  if (actionType === "deny") return "danger";
  if (actionType === "request_more_information") return "primary";
  return "secondary";
}

export function buildRichQuickActionButtons(
  scope: AgentRichMessageScope | undefined,
  context: RichQuickActionScopeContext,
  actions: AgentQuickAction[] = AGENT_RICH_QUICK_ACTIONS
): RichQuickActionButtonSpec[] {
  return actions.map((action) => {
    const validation = scope
      ? validateRichQuickActionScope(action.type, scope, context)
      : { ok: false as const, reason: "No control scope attached to this card." };

    const targetScope = validation.ok ? validation.scope : scope ?? {};
    const targetId =
      action.type === "approve" || action.type === "deny"
        ? targetScope.approvalRequestId
        : encodeRichQuickActionTargetId(targetScope);

    return {
      actionType: action.type,
      discordAction: richQuickActionDiscordAction(action.type),
      label: action.label,
      emoji: action.emoji,
      style: buttonStyleForAction(action.type),
      targetId,
      disabled: !validation.ok || !targetId,
      disabledReason: validation.ok ? undefined : validation.reason
    };
  });
}

export function richQuickActionFromEmoji(emoji: string) {
  return AGENT_RICH_QUICK_ACTIONS.find((action) => action.emoji === emoji)?.type;
}

export function richQuickActionLabel(actionType: AgentRichQuickActionType) {
  return AGENT_RICH_QUICK_ACTION_BY_TYPE[actionType].label;
}
