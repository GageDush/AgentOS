import {
  AGENT_RICH_QUICK_ACTIONS,
  buildAgentDiscordEmbed,
  CURSOR_CARD_REACTIONS,
  FREE_TEXT_REPLY_EMOJI,
  type AgentQuickAction,
  type AgentRichMessageScope,
  type DiscordCardReactionSpec
} from "@agentos/shared";
import { buildAgentRichMessageInput } from "./agent-profiles";
import { getDiscordRestClient } from "./client";
import { buildRichQuickActionRows } from "./rich-action-buttons";
import { listPendingApprovals } from "../store";
import { registerDiscordMessage, type DiscordCardChannel } from "./registry";
import { personaDiscordName, resolvePersona } from "./personas";
import { resolveHttpAgentAvatarUrl } from "./agent-avatars";
import { postWebhookPayload } from "./webhook-post";

export type RichCardDeliveryInput = {
  agentId?: string;
  recipient: string;
  message: string;
  status?: { label: string; routing?: string };
  scope?: AgentRichMessageScope;
  avatarUrl?: string;
  timestamp?: string | Date;
  includeQuickActions?: boolean;
  quickActions?: AgentQuickAction[];
  cardChannel?: DiscordCardChannel;
  reactionCommands?: DiscordCardReactionSpec[];
  attachReactions?: boolean;
  responseId?: string;
  operationalStatus?: string;
  operatorRole?: string;
  clearanceLevel?: string;
  registryKind?: "approval" | "rich-card" | "generic";
  entityId?: string;
};

async function attachReactionEmojis(
  channelId: string,
  messageId: string,
  emojis: string[]
) {
  const client = getDiscordRestClient();
  if (!client) return;
  const unique = [...new Set(emojis)];
  for (const emoji of unique) {
    try {
      await client.addReaction(channelId, messageId, emoji);
    } catch {
      // Duplicate or missing permission — best effort.
    }
  }
}

export function reactionEmojiList(input: RichCardDeliveryInput) {
  const emojis: string[] = [];
  if (input.reactionCommands?.length) {
    emojis.push(...input.reactionCommands.map((item) => item.emoji));
  } else if (input.includeQuickActions !== false) {
    const actions = input.quickActions ?? AGENT_RICH_QUICK_ACTIONS;
    emojis.push(...actions.map((action) => action.emoji));
  }
  emojis.push(FREE_TEXT_REPLY_EMOJI);
  return emojis;
}

export async function deliverRichAgentCard(webhookUrl: string, input: RichCardDeliveryInput) {
  const persona = resolvePersona(input.agentId);
  const avatarUrl = input.avatarUrl ?? resolveHttpAgentAvatarUrl(persona.agentId);
  const richMessage = buildAgentRichMessageInput({
    agentId: input.agentId,
    recipient: input.recipient,
    message: input.message,
    status: input.status,
    scope: input.scope,
    avatarUrl,
    timestamp: input.timestamp,
    responseId: input.responseId,
    operationalStatus: input.operationalStatus,
    operatorRole: input.operatorRole,
    clearanceLevel: input.clearanceLevel,
    quickActions: input.quickActions
  });
  const payload = buildAgentDiscordEmbed(richMessage);
  const components =
    input.includeQuickActions === false
      ? undefined
      : buildRichQuickActionRows(input.scope, listPendingApprovals());

  const message = await postWebhookPayload(webhookUrl, {
    username: personaDiscordName(persona),
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    ...payload,
    ...(components?.length ? { components } : {})
  });

  const reactionMap = Object.fromEntries(
    (input.reactionCommands ?? []).map((item) => [item.emoji, item.command])
  );

  registerDiscordMessage(message.id, {
    channelId: message.channel_id,
    kind: input.registryKind ?? "rich-card",
    entityId: input.entityId,
    embedSnapshot: payload.embeds[0],
    componentsSnapshot: components,
    richScope: input.scope,
    cardChannel: input.cardChannel,
    reactionCommands: Object.keys(reactionMap).length ? reactionMap : undefined
  });

  if (input.attachReactions !== false) {
    await attachReactionEmojis(message.channel_id, message.id, reactionEmojiList(input));
  }

  return message;
}

export const defaultCursorRichCard = {
  cardChannel: "cursor" as const,
  reactionCommands: CURSOR_CARD_REACTIONS,
  includeQuickActions: false as const
};
