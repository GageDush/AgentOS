import { resolveApprovalDecision, executeRichQuickAction } from "@agentos/runtime";
import type { AgentRichMessageScope } from "@agentos/shared";
import type { ApprovalRecord } from "@agentos/shared";
import { getTask, listPendingApprovals, store } from "../store";
import { parseCustomId } from "./components";
import { buildActionRows } from "./components";
import { buildAgentEmbed } from "./embeds";
import type { DeferredInteractionWork } from "./interaction-respond";
import { embedInteractionResponse, embedUpdateResponse, syncSeenToMessage } from "./messenger";
import { postSystemPulse } from "./notify";
import { personaDiscordName, resolvePersona } from "./personas";
import {
  richActionScopeFromButton,
  richActionTypeFromDiscordAction
} from "./rich-action-buttons";

type ButtonInteraction = {
  custom_id: string;
  component_type?: number;
};

type InteractionMessage = {
  id: string;
  channel_id: string;
  embeds?: Array<Record<string, unknown>>;
  components?: Array<{ type: 1; components: Array<Record<string, unknown>> }>;
};

export async function handleButtonPress(
  data: ButtonInteraction,
  operatorLabel: string,
  operatorId: string,
  message?: InteractionMessage,
  applicationId?: string,
  interactionToken?: string
) {
  const parsed = parseCustomId(data.custom_id);
  if (!parsed) {
    return embedInteractionResponse({
      title: "Unknown control",
      description: "This interface button is not registered with AgentOS.",
      tone: "danger",
      ephemeral: true
    });
  }

  const { action, targetId } = parsed;
  const channelId = message?.channel_id;
  const messageId = message?.id;

  if (action === "refresh_status") {
    if (!applicationId || !interactionToken) {
      return embedInteractionResponse({
        agentId: "admin-agent",
        title: "Pulse unavailable",
        description: "Interaction context was missing. Try `/agentos status` instead.",
        tone: "warning",
        ephemeral: true
      });
    }

    const welcomeActions = [
      { action: "refresh_status", label: "Run pulse", style: "primary" as const, emoji: "🛰️" },
      { action: "ack", label: "Mark seen", style: "secondary" as const, emoji: "👁️" }
    ];

    return {
      deferred: true as const,
      applicationId,
      token: interactionToken,
      run: async () => {
        await postSystemPulse();
        const pending = listPendingApprovals().length;
        const running = store.missionRuns.filter((item) => item.status === "running").length;
        const embedTitle =
          typeof message?.embeds?.[0]?.title === "string"
            ? message.embeds[0].title.replace(/^▸\s*/, "")
            : "System pulse";
        const isWelcome = embedTitle.includes("Welcome to AgentOS HQ");
        const persona = resolvePersona("admin-agent");
        const embed = buildAgentEmbed({
          agentId: "admin-agent",
          agentName: personaDiscordName(persona),
          title: isWelcome ? "Welcome to AgentOS HQ" : embedTitle,
          description: isWelcome
            ? `Pulse sent to \`#status\`. Triggered by ${operatorLabel}.`
            : `Live telemetry refreshed by ${operatorLabel}.`,
          tone: "success",
          fields: [
            { name: "Pending approvals", value: `${pending}`, inline: true },
            { name: "Running missions", value: `${running}`, inline: true },
            { name: "Agents online", value: `${store.agents.length}`, inline: true }
          ],
          footerHint: isWelcome ? "Neural link ready" : "Pulse synced"
        });

        const actions = isWelcome
          ? welcomeActions
          : [
              { action: "refresh_status", label: "Refresh pulse", style: "primary" as const, emoji: "🛰️" },
              { action: "ack", label: "Mark seen", style: "secondary" as const, emoji: "👁️" }
            ];

        return {
          embeds: [embed],
          components: buildActionRows(actions)
        };
      }
    } satisfies DeferredInteractionWork;
  }

  if (action === "approve_once" && targetId) {
    const result = await resolveApprovalDecision(targetId, "approved", "once", operatorId);
    if (channelId && messageId) {
      await syncSeenToMessage(channelId, messageId, operatorLabel);
    }
    return embedUpdateResponse(
      {
        agentId: "admin-agent",
        title: "Control gate approved",
        description: result.summary,
        fields: [{ name: "Approval", value: `\`${targetId}\``, inline: false }],
        tone: "success",
        seenBy: operatorLabel,
        disableActions: true
      },
      message?.components
    );
  }

  if (action === "approve_mission" && targetId) {
    const result = await resolveApprovalDecision(targetId, "approved", "mission", operatorId);
    if (channelId && messageId) {
      await syncSeenToMessage(channelId, messageId, operatorLabel);
    }
    return embedUpdateResponse(
      {
        agentId: "release-manager",
        title: "Mission scope approved",
        description: result.summary,
        fields: [{ name: "Approval", value: `\`${targetId}\``, inline: false }],
        tone: "success",
        seenBy: operatorLabel,
        disableActions: true
      },
      message?.components
    );
  }

  if (action === "deny" && targetId) {
    const result = await resolveApprovalDecision(targetId, "denied", undefined, operatorId);
    if (channelId && messageId) {
      await syncSeenToMessage(channelId, messageId, operatorLabel);
    }
    return embedUpdateResponse(
      {
        agentId: "security-auditor",
        title: "Control gate denied",
        description: result.summary,
        fields: [{ name: "Approval", value: `\`${targetId}\``, inline: false }],
        tone: "danger",
        seenBy: operatorLabel,
        disableActions: true
      },
      message?.components
    );
  }

  if (action === "task_details" && targetId) {
    const task = getTask(targetId);
    if (!task) {
      return embedInteractionResponse({
        title: "Task not found",
        description: `No task exists for \`${targetId}\`.`,
        tone: "warning",
        ephemeral: true
      });
    }
    if (channelId && messageId) {
      await syncSeenToMessage(channelId, messageId, operatorLabel);
    }
    return embedUpdateResponse(
      {
        agentId: "builder-agent",
        title: task.title,
        description: task.description,
        fields: [
          { name: "Status", value: task.status, inline: true },
          { name: "Task ID", value: `\`${task.id}\``, inline: true }
        ],
        tone: "info",
        seenBy: operatorLabel,
        disableActions: true
      },
      message?.components
    );
  }

  if (action === "ack" && channelId && messageId) {
    await syncSeenToMessage(channelId, messageId, operatorLabel);
    return embedUpdateResponse(
      {
        title: "Acknowledged",
        description: "AgentOS marked this transmission as received.",
        tone: "success",
        seenBy: operatorLabel,
        disableActions: true
      },
      message?.components
    );
  }

  const richActionType = richActionTypeFromDiscordAction(action);
  if (richActionType) {
    const scope = enrichRichActionScope(richActionScopeFromButton(action, targetId));
    const result = await executeRichQuickAction({
      actionType: richActionType,
      operatorId,
      scope
    });
    if (channelId && messageId) {
      await syncSeenToMessage(channelId, messageId, operatorLabel);
    }
    return embedUpdateResponse(
      {
        agentId: "admin-agent",
        title: richActionType === "deny" ? "Control gate denied" : "Rich action handled",
        description: result.summary,
        fields: scope.approvalRequestId
          ? [{ name: "Approval", value: `\`${scope.approvalRequestId}\``, inline: false }]
          : undefined,
        tone: result.ok ? (richActionType === "deny" ? "danger" : "success") : "warning",
        seenBy: operatorLabel,
        disableActions: true
      },
      message?.components
    );
  }

  return embedInteractionResponse({
    title: "Unsupported action",
    description: `Action \`${action}\` is not wired yet.`,
    tone: "warning",
    ephemeral: true
  });
}

function enrichRichActionScope(scope: AgentRichMessageScope): AgentRichMessageScope {
  if (!scope.approvalRequestId) {
    return scope;
  }
  const approval = store.approvals.find((item) => item.id === scope.approvalRequestId);
  if (!approval) {
    return scope;
  }
  return {
    ...scope,
    missionId: scope.missionId ?? approval.missionId,
    runId: scope.runId ?? approval.runId,
    correlationId: scope.correlationId ?? approval.correlationId
  };
}

export function approvalActionButtons(approval: ApprovalRecord) {
  return [
    { action: "approve_once", targetId: approval.id, label: "Approve once", style: "success" as const, emoji: "✅" },
    { action: "approve_mission", targetId: approval.id, label: "Approve mission", style: "primary" as const, emoji: "🛡️" },
    { action: "deny", targetId: approval.id, label: "Deny", style: "danger" as const, emoji: "⛔" },
    { action: "ack", targetId: approval.id, label: "Acknowledge", style: "secondary" as const, emoji: "👁️" }
  ];
}
