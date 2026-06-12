import { executeRichQuickAction } from "@agentos/runtime";
import {
  CURSOR_CARD_REACTIONS,
  FREE_TEXT_REPLY_EMOJI,
  richQuickActionFromEmoji,
  type AgentRichMessageScope
} from "@agentos/shared";
import { getDiscordRestClient } from "./client";
import { loadDiscordRegistry, markDiscordMessageSeen } from "./registry";
import { isAuthorizedDiscordOperator } from "./operator-auth";
import { deliverRichAgentCard, defaultCursorRichCard } from "./rich-card-delivery";
import { loadDiscordGuildState } from "./bootstrap";
import { handleCursorChannelMessage } from "./cursor-channel";

type ReactionEmoji = {
  name?: string;
  id?: string;
};

function emojiKey(emoji: ReactionEmoji) {
  if (emoji.id) return emoji.name ?? "";
  return emoji.name ?? "";
}

function cursorWebhook() {
  return loadDiscordGuildState()?.webhooks?.cursor;
}

async function replyCursorAck(channelId: string, operatorLabel: string) {
  const webhook = cursorWebhook();
  if (!webhook) return;
  await deliverRichAgentCard(webhook, {
    agentId: "agentos-operator",
    recipient: operatorLabel,
    message: "Acknowledged. Send another prompt anytime, or react for quick commands.",
    status: { label: "Acknowledged", routing: "Cursor bridge" },
    operationalStatus: "ONLINE",
    ...defaultCursorRichCard
  });
}

export async function handleDiscordReactionAdd(
  channelId: string,
  messageId: string,
  emoji: ReactionEmoji,
  userId: string,
  userLabel: string
) {
  if (!userId) return { handled: false as const };

  const record = loadDiscordRegistry().messages[messageId];
  if (!record) return { handled: false as const };

  const key = emojiKey(emoji);
  if (!key) return { handled: false as const };

  if (record.cardChannel === "cursor" || record.cardChannel === "operator") {
    if (!isAuthorizedDiscordOperator(userId)) {
      return { handled: true as const, unauthorized: true as const };
    }
  }

  if (key === FREE_TEXT_REPLY_EMOJI) {
    const client = getDiscordRestClient();
    if (client) {
      try {
        await client.createMessage(channelId, {
          content: `<@${userId}> Type your reply as a normal message in this channel — free text is always on.`
        });
      } catch {
        // Best effort hint.
      }
    }
    return { handled: true as const, hint: true as const };
  }

  const cursorCommand =
    record.reactionCommands?.[key] ??
    CURSOR_CARD_REACTIONS.find((item) => item.emoji === key)?.command;

  if (record.cardChannel === "cursor" && cursorCommand) {
    if (cursorCommand === "ack") {
      markDiscordMessageSeen(messageId, userLabel);
      await replyCursorAck(channelId, userLabel);
      return { handled: true as const, cursor: cursorCommand };
    }
    if (cursorCommand === "prompt") {
      return { handled: true as const, cursor: cursorCommand };
    }
    await handleCursorChannelMessage(channelId, cursorCommand, userId, userLabel);
    return { handled: true as const, cursor: cursorCommand };
  }

  const actionType = richQuickActionFromEmoji(key);
  if (!actionType) return { handled: false as const };

  const scope: AgentRichMessageScope = record.richScope ?? {};
  const operatorId = `discord-${userId}`;
  const result = await executeRichQuickAction({
    actionType,
    operatorId,
    scope
  });

  markDiscordMessageSeen(messageId, userLabel);

  const webhook =
    record.cardChannel === "operator"
      ? loadDiscordGuildState()?.webhooks?.operatorCommand
      : record.cardChannel === "general"
        ? loadDiscordGuildState()?.webhooks?.general
        : record.cardChannel === "approvals"
          ? loadDiscordGuildState()?.webhooks?.approvals
          : undefined;

  if (webhook) {
    await deliverRichAgentCard(webhook, {
      agentId: "admin-agent",
      recipient: userLabel,
      message: result.summary,
      status: {
        label: actionType === "deny" ? "Denied" : "Action handled",
        routing: scope.runId ? `run ${scope.runId}` : "AgentOS"
      },
      scope,
      cardChannel: record.cardChannel,
      includeQuickActions: Boolean(scope.approvalRequestId || scope.runId)
    });
  }

  return { handled: true as const, actionType, ok: result.ok };
}
