"use client";

import {
  AGENT_RICH_QUICK_ACTIONS,
  buildAgentDestination,
  buildRichQuickActionButtons,
  type AgentRichMessage,
  type AgentRichMessageScope,
  type AgentRichQuickActionType,
  type PendingApprovalScope
} from "@agentos/shared";
import { ReactiveCard } from "../motion/ReactiveCard";

type AgentRichMessageCardProps = {
  message: AgentRichMessage;
  avatarUrl?: string;
  pendingApprovals?: PendingApprovalScope[];
  busyActionType?: AgentRichQuickActionType;
  onExecuteAction?: (
    actionType: AgentRichQuickActionType,
    scope?: AgentRichMessageScope
  ) => void | Promise<void>;
};

export function AgentRichMessageCard({
  message,
  avatarUrl,
  pendingApprovals = [],
  busyActionType,
  onExecuteAction
}: AgentRichMessageCardProps) {
  const profile = message.profile;
  const destination = buildAgentDestination(profile.displayName, message.recipient);
  const status = message.status?.label ?? "Awaiting response";
  const routing = message.status?.routing ?? "AgentOS Local";
  const previewAvatar = avatarUrl ?? message.avatarUrl;
  const actionButtons = buildRichQuickActionButtons(message.scope, { pendingApprovals });

  return (
    <ReactiveCard style={{ padding: "1rem", display: "grid", gap: "0.85rem" }}>
      <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
        <div
          aria-hidden="true"
          style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "0.75rem",
            border: "1px solid var(--forge-border)",
            background: previewAvatar
              ? `center / cover no-repeat url(${previewAvatar})`
              : "linear-gradient(135deg, rgba(241,196,15,0.35), rgba(0,245,255,0.18))",
            flexShrink: 0
          }}
        />
        <div style={{ minWidth: 0 }}>
          <p className="forge-mono" style={{ margin: 0, color: "var(--forge-accent)", fontSize: "0.72rem" }}>
            {profile.fullLabel}
          </p>
          <strong style={{ fontSize: "1.15rem" }}>{profile.displayName}</strong>
          <p style={{ margin: "0.15rem 0 0", color: "var(--forge-muted)", fontSize: "0.85rem" }}>
            {profile.jobTitle} • {profile.role}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {profile.capabilities.map((capability) => (
          <span key={capability} className="forge-chip">
            {capability}
          </span>
        ))}
      </div>

      <div
        style={{
          borderLeft: "3px solid var(--forge-accent)",
          paddingLeft: "0.75rem",
          display: "grid",
          gap: "0.35rem"
        }}
      >
        <p className="forge-mono" style={{ margin: 0, fontSize: "0.72rem", color: "var(--forge-soft)" }}>
          Destination: {destination}
        </p>
        <p style={{ margin: 0, lineHeight: 1.5 }}>&ldquo;{message.message}&rdquo;</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.5rem" }}>
        <div className="forge-panel" style={{ padding: "0.65rem" }}>
          <p className="forge-mono" style={{ margin: 0, fontSize: "0.68rem", color: "var(--forge-soft)" }}>
            Status
          </p>
          <strong>{status}</strong>
        </div>
        <div className="forge-panel" style={{ padding: "0.65rem" }}>
          <p className="forge-mono" style={{ margin: 0, fontSize: "0.68rem", color: "var(--forge-soft)" }}>
            Routing
          </p>
          <strong>{routing}</strong>
        </div>
      </div>

      <div>
        <p className="forge-mono" style={{ margin: "0 0 0.45rem", fontSize: "0.68rem", color: "var(--forge-soft)" }}>
          Available Responses
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {AGENT_RICH_QUICK_ACTIONS.map((action) => {
            const button = actionButtons.find((item) => item.actionType === action.type);
            const disabled = button?.disabled ?? true;
            const busy = busyActionType === action.type;
            return (
              <button
                key={action.type}
                type="button"
                className="forge-chip forge-chip-active"
                title={disabled ? button?.disabledReason ?? action.description : action.description}
                disabled={disabled || busy || !onExecuteAction}
                onClick={() => void onExecuteAction?.(action.type, message.scope)}
                style={{
                  cursor: disabled || !onExecuteAction ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.55 : 1
                }}
              >
                {busy ? "…" : action.emoji} {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </ReactiveCard>
  );
}
