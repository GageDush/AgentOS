import type { ActionButtonSpec } from "./components";
import { buildActionRows, disableAllComponents } from "./components";
import { loadDiscordGuildState } from "./bootstrap";
import { buildAgentEmbed, withSeenState, type AgentEmbedInput } from "./embeds";
import { getDiscordRestClient, isDiscordBotEnabled, resolveAgentOsChannelId } from "./client";
import type { AgentOsChannelKey } from "./layout";
import { markDiscordMessageSeen, registerDiscordMessage, type DiscordMessageRecord } from "./registry";
import { personaDiscordName, resolvePersona } from "./personas";
import { SEEN_EMOJI } from "./theme";
import { postPersonaWebhookMessage } from "./webhook-post";

export type AgentMessageInput = AgentEmbedInput & {
  channel?: AgentOsChannelKey;
  channelId?: string;
  kind?: DiscordMessageRecord["kind"];
  entityId?: string;
  actions?: ActionButtonSpec[];
};

type FeedWebhookKey =
  | "status"
  | "approvals"
  | "missions"
  | "opsFeed"
  | "general"
  | "roundTable"
  | "chatRoom1"
  | "chatRoom2"
  | "chatRoom3";

function resolveFeedWebhook(channel?: AgentOsChannelKey) {
  const state = loadDiscordGuildState();
  if (!state?.webhooks || !channel) return undefined;
  const key = channel as FeedWebhookKey;
  return state.webhooks[key];
}

export async function sendAgentMessage(input: AgentMessageInput) {
  if (!isDiscordBotEnabled()) {
    return { ok: false as const, mode: "mock" as const };
  }

  const channelId = input.channelId ?? (input.channel ? resolveAgentOsChannelId(input.channel) : undefined);
  if (!channelId) {
    return { ok: false as const, mode: "no-channel" as const };
  }

  const webhook = resolveFeedWebhook(input.channel);
  const persona = resolvePersona(input.agentId);
  const embed = buildAgentEmbed({ ...input, agentName: personaDiscordName(persona) });
  const components = input.actions?.length ? buildActionRows(input.actions) : undefined;

  if (webhook) {
    const message = await postPersonaWebhookMessage(webhook, input);
    registerDiscordMessage(message.id, {
      channelId: message.channel_id,
      kind: input.kind ?? "generic",
      entityId: input.entityId,
      embedSnapshot: embed,
      componentsSnapshot: components
    });
    return { ok: true as const, mode: "webhook" as const, messageId: message.id, channelId: message.channel_id };
  }

  const client = getDiscordRestClient();
  if (!client) {
    return { ok: false as const, mode: "unconfigured" as const };
  }

  const message = await client.createMessage(channelId, {
    embeds: [embed],
    ...(components ? { components } : {})
  });

  registerDiscordMessage(message.id, {
    channelId,
    kind: input.kind ?? "generic",
    entityId: input.entityId,
    embedSnapshot: embed,
    componentsSnapshot: components
  });

  return {
    ok: true as const,
    mode: "sent" as const,
    messageId: message.id,
    channelId
  };
}

export async function syncSeenToMessage(channelId: string, messageId: string, seenBy: string) {
  const client = getDiscordRestClient();
  if (!client) return { ok: false as const };

  const record = markDiscordMessageSeen(messageId, seenBy);
  const embed = record?.embedSnapshot
    ? withSeenState(record.embedSnapshot as ReturnType<typeof buildAgentEmbed>, seenBy, record.seenAt)
    : buildAgentEmbed({
        title: "Operator response received",
        description: "AgentOS has synced your selection.",
        seenBy,
        seenAt: record?.seenAt
      });

  const components = disableAllComponents(record?.componentsSnapshot);

  await client.editMessage(channelId, messageId, {
    embeds: [embed],
    ...(components.length ? { components } : {})
  });

  try {
    await client.addReaction(channelId, messageId, SEEN_EMOJI);
  } catch {
    // Reaction may already exist or lack permissions.
  }

  return { ok: true as const, seenAt: record?.seenAt, seenBy };
}

export async function markHumanReplySeen(channelId: string, messageId: string, seenBy: string) {
  const client = getDiscordRestClient();
  if (!client) return { ok: false as const };
  try {
    await client.addReaction(channelId, messageId, SEEN_EMOJI);
  } catch {
    return { ok: false as const };
  }
  return { ok: true as const, seenBy };
}

export function embedInteractionResponse(
  input: AgentEmbedInput & { actions?: ActionButtonSpec[]; ephemeral?: boolean }
) {
  const persona = resolvePersona(input.agentId);
  const embed = buildAgentEmbed({ ...input, agentName: personaDiscordName(persona) });
  const components = input.actions?.length ? buildActionRows(input.actions) : undefined;
  return {
    type: 4,
    data: {
      embeds: [embed],
      ...(components ? { components } : {}),
      ...(input.ephemeral ? { flags: 64 } : {})
    }
  };
}

export function embedUpdateResponse(
  input: AgentEmbedInput & {
    actions?: ActionButtonSpec[];
    seenBy?: string;
    seenAt?: string;
    disableActions?: boolean;
  },
  existingComponents?: Array<{ type: 1; components: Array<Record<string, unknown>> }>
) {
  const persona = resolvePersona(input.agentId);
  const embed = input.seenBy
    ? withSeenState(buildAgentEmbed({ ...input, agentName: personaDiscordName(persona) }), input.seenBy, input.seenAt)
    : buildAgentEmbed({ ...input, agentName: personaDiscordName(persona) });

  const components = input.disableActions
    ? disableAllComponents(existingComponents)
    : input.actions?.length
      ? buildActionRows(input.actions)
      : existingComponents;

  return {
    type: 7,
    data: {
      embeds: [embed],
      ...(components?.length ? { components } : { components: [] })
    }
  };
}