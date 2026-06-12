import { getProviderId, providers } from "../providers";
import { addAudit, addUsageEvent } from "../store";
import { loadDiscordGuildState } from "./bootstrap";
import { getDiscordRestClient, isDiscordBotEnabled, resolveAgentOsChannelId } from "./client";
import { buildAgentEmbed } from "./embeds";
import { embedInteractionResponse } from "./messenger";
import { postPersonaRichMessage, postPersonaWebhookMessage } from "./webhook-post";
import {
  isChatRoomChannelKey,
  parseRoomReservationIntent,
  reserveChatRoom,
  runChatRoomConversation
} from "./chat-rooms";
import type { AgentOsChannelKey } from "./layout";
import { runRoundTableBriefing } from "./round-table";
import { SEEN_EMOJI } from "./theme";
import { getAuthorizedOperatorDiscordIds, isAuthorizedDiscordOperator } from "./operator-auth";
import { handleOperatorCommandMessage } from "./operator-commands";
import {
  isOperatorLaneBypassCommand,
  isOperatorLaneBusy,
  operatorLaneTaskLabel,
  replyOperatorLaneBusyNotice,
  withOperatorLaneBusy
} from "./operator-lane-status";
import { handleCursorChannelMessage, resolveCursorChannelId } from "./cursor-channel";

export async function runOperatorChat(prompt: string, operatorId: string, operatorLabel: string) {
  const provider = providers[getProviderId()];
  const result = await provider.chat({
    prompt,
    agentId: "admin-agent",
    saveMemory: true
  });

  addAudit("llm.chat.completed", operatorId, `Discord chat by ${operatorLabel}.`);
  const promptTokens = Math.ceil(prompt.length / 4);
  const completionTokens = Math.ceil(result.response.length / 4);
  addUsageEvent({
    provider: result.provider,
    model: result.model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostUsd: 0,
    agentId: "admin-agent",
    runId: `discord-chat-${Date.now()}`
  });

  return result;
}

export async function replyDiscordChatEmbed(
  channelId: string,
  prompt: string,
  response: string,
  operatorLabel: string,
  provider: string,
  model: string
) {
  const webhook = loadDiscordGuildState()?.webhooks?.general;
  if (!webhook) return { ok: false as const };

  await postPersonaRichMessage(webhook, {
    agentId: "admin-agent",
    recipient: operatorLabel,
    message: [
      response.slice(0, 3200),
      "",
      `**Your prompt:** ${prompt.slice(0, 500)}`,
      `**Provider:** \`${provider}\` · **Model:** \`${model}\``
    ].join("\n"),
    status: { label: "Response ready", routing: `${provider} · ${model}` },
    cardChannel: "general",
    operationalStatus: "ONLINE",
    operatorRole: "HUMAN OPERATOR",
    includeQuickActions: true
  });
  return { ok: true as const };
}

export async function markPromptSeen(channelId: string, messageId: string) {
  const client = getDiscordRestClient();
  if (!client || !isDiscordBotEnabled()) return;
  try {
    await client.addReaction(channelId, messageId, SEEN_EMOJI);
  } catch {
    // ignore duplicate reactions
  }
}

export async function handleDiscordChatCommand(
  message: string,
  operatorLabel: string,
  operatorId: string
) {
  if (!message.trim()) {
    return embedInteractionResponse({
      title: "Empty message",
      description: "Send a message to chat with AgentOS.",
      tone: "warning",
      ephemeral: true
    });
  }

  try {
    const result = await runOperatorChat(message, operatorId, operatorLabel);
    return embedInteractionResponse({
      agentId: "admin-agent",
      title: "AgentOS",
      description: result.response.slice(0, 3900),
      tone: "info",
      fields: [
        { name: "Provider", value: result.provider, inline: true },
        { name: "Model", value: result.model, inline: true }
      ],
      ephemeral: false
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Chat failed.";
    return embedInteractionResponse({
      title: "Chat failed",
      description: detail,
      tone: "danger",
      ephemeral: true
    });
  }
}

function resolveChannelKeyById(channelId: string): AgentOsChannelKey | undefined {
  const state = loadDiscordGuildState();
  if (!state?.channels) return undefined;
  return (Object.entries(state.channels) as Array<[AgentOsChannelKey, string]>).find(
    ([, id]) => id === channelId
  )?.[0];
}

export async function handleDiscordChannelMessage(
  channelId: string,
  messageId: string,
  content: string,
  authorId: string,
  authorLabel: string
) {
  const channelKey = resolveChannelKeyById(channelId);
  if (channelKey && isChatRoomChannelKey(channelKey) && content.trim()) {
    const operatorId = `discord-${authorId}`;
    try {
      const result = await runChatRoomConversation(channelKey, content, operatorId, authorLabel);
      await markPromptSeen(channelId, messageId);
      if (!result.ok && result.reason === "not-reserved") {
        const client = getDiscordRestClient();
        if (client) {
          await client.createMessage(channelId, {
            embeds: [
              buildAgentEmbed({
                agentId: "admin-agent",
                title: "Chat room not active",
                description:
                  "This room is available. Reserve it from `#round-table` (e.g. \"reserve chat room 1\") or `/agentos reserve-room`.",
                tone: "warning"
              })
            ]
          });
        }
      }
      return { handled: true as const, chatRoom: result.ok };
    } catch (error) {
      const client = getDiscordRestClient();
      if (client) {
        await client.createMessage(channelId, {
          embeds: [
            buildAgentEmbed({
              agentId: "admin-agent",
              title: "Chat room failed",
              description: error instanceof Error ? error.message : "Unknown error.",
              tone: "danger"
            })
          ]
        });
      }
      return { handled: true as const, error: true };
    }
  }

  const roundTableChannelId = resolveAgentOsChannelId("roundTable");
  if (roundTableChannelId && channelId === roundTableChannelId && content.trim()) {
    const operatorId = `discord-${authorId}`;
    try {
      const directReserve = parseRoomReservationIntent(content);
      if (directReserve) {
        const reserved = await reserveChatRoom({
          room: directReserve.room,
          reservedBy: "admin-agent",
          topic: content,
          operatorId,
          operatorLabel: authorLabel
        });
        await markPromptSeen(channelId, messageId);
        if (!reserved.ok) {
          const client = getDiscordRestClient();
          if (client) {
            await client.createMessage(channelId, {
              embeds: [
                buildAgentEmbed({
                  agentId: "admin-agent",
                  title: "Reservation failed",
                  description: `Could not reserve chat room ${directReserve.room} (${reserved.reason}).`,
                  tone: "warning"
                })
              ]
            });
          }
        }
        return { handled: true as const, reserved: reserved.ok };
      }

      const result = await runRoundTableBriefing(content, operatorId, authorLabel);
      await markPromptSeen(channelId, messageId);
      return { handled: true as const, briefing: result.ok };
    } catch (error) {
      const client = getDiscordRestClient();
      if (client) {
        await client.createMessage(channelId, {
          embeds: [
            buildAgentEmbed({
              agentId: "admin-agent",
              title: "Briefing failed",
              description: error instanceof Error ? error.message : "Unknown error.",
              tone: "danger"
            })
          ]
        });
      }
      return { handled: true as const, error: true };
    }
  }

  const cursorChannelId = resolveCursorChannelId();
  if (cursorChannelId && channelId === cursorChannelId && content.trim()) {
    if (!isAuthorizedDiscordOperator(authorId)) {
      const client = getDiscordRestClient();
      if (client) {
        await client.createMessage(channelId, {
          embeds: [
            buildAgentEmbed({
              agentId: "agentos-operator",
              title: "Unauthorized",
              description: "This channel is restricted to the configured operator owner.",
              tone: "warning"
            })
          ]
        });
      }
      return { handled: true as const, unauthorized: true as const };
    }
    if (!isOperatorLaneBypassCommand(content) && isOperatorLaneBusy()) {
      await replyOperatorLaneBusyNotice(channelId);
      await markPromptSeen(channelId, messageId);
      return { handled: true as const, cursor: true as const, busy: true as const };
    }
    await withOperatorLaneBusy(channelId, "cursor", () =>
      handleCursorChannelMessage(channelId, content, authorId, authorLabel)
    );
    await markPromptSeen(channelId, messageId);
    return { handled: true as const, cursor: true as const };
  }

  const operatorCommandChannelId = resolveAgentOsChannelId("operatorCommand");
  if (operatorCommandChannelId && channelId === operatorCommandChannelId && content.trim()) {
    if (!isAuthorizedDiscordOperator(authorId)) {
      const client = getDiscordRestClient();
      if (client) {
        await client.createMessage(channelId, {
          embeds: [
            buildAgentEmbed({
              agentId: "admin-agent",
              title: "Unauthorized",
              description:
                getAuthorizedOperatorDiscordIds().length === 0
                  ? "Set `DISCORD_OWNER_USER_ID` in `.env` and run `pnpm discord:setup-operator-channel`."
                  : "This channel is restricted to the configured operator owner.",
              tone: "warning"
            })
          ]
        });
      }
      return { handled: true as const, unauthorized: true as const };
    }
    const operatorId = `discord-${authorId}`;
    if (!isOperatorLaneBypassCommand(content) && isOperatorLaneBusy()) {
      await replyOperatorLaneBusyNotice(channelId);
      await markPromptSeen(channelId, messageId);
      return { handled: true as const, operatorCommand: true as const, busy: true as const };
    }
    await withOperatorLaneBusy(channelId, operatorLaneTaskLabel(content), () =>
      handleOperatorCommandMessage(channelId, content, operatorId, authorLabel)
    );
    await markPromptSeen(channelId, messageId);
    return { handled: true as const, operatorCommand: true as const };
  }

  const chatChannelId = resolveAgentOsChannelId("general");
  if (!chatChannelId || channelId !== chatChannelId) return { handled: false as const };
  if (!content.trim()) return { handled: false as const };

  const operatorId = `discord-${authorId}`;
  try {
    const result = await runOperatorChat(content, operatorId, authorLabel);
    await replyDiscordChatEmbed(channelId, content, result.response, authorLabel, result.provider, result.model);
    await markPromptSeen(channelId, messageId);
    return { handled: true as const };
  } catch (error) {
    const client = getDiscordRestClient();
    if (client) {
      await client.createMessage(channelId, {
        embeds: [
          buildAgentEmbed({
            agentId: "admin-agent",
            title: "Chat failed",
            description: error instanceof Error ? error.message : "Unknown error.",
            tone: "danger"
          })
        ]
      });
    }
    return { handled: true as const, error: true };
  }
}
