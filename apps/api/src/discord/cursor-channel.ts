import {

  getCursorBridgeStatus,

  getCursorSessionAgentId,

  isCursorBridgeEnabled,

  resetCursorSession,

  sendCursorPrompt

} from "../cursor-bridge";

import { loadDiscordGuildState } from "./bootstrap";

import { getDiscordRestClient } from "./client";

import { buildAgentEmbed } from "./embeds";

import { deliverRichAgentCard, defaultCursorRichCard } from "./rich-card-delivery";



export function resolveCursorChannelId(): string | undefined {

  return loadDiscordGuildState()?.channels?.cursor;

}



function cursorWebhook() {

  return loadDiscordGuildState()?.webhooks?.cursor;

}



async function replyInCursorChannel(

  channelId: string,

  recipient: string,

  message: string,

  statusLabel: string,

  routing = "Cursor bridge"

) {

  const webhook = cursorWebhook();

  if (webhook) {

    await deliverRichAgentCard(webhook, {

      agentId: "agentos-operator",

      recipient,

      message: message.slice(0, 3900),

      status: { label: statusLabel, routing },

      operationalStatus: isCursorBridgeEnabled() ? "ONLINE" : "OFFLINE",

      operatorRole: "HUMAN OPERATOR",

      clearanceLevel: "LEVEL 4",

      ...defaultCursorRichCard

    });

    return;

  }



  const client = getDiscordRestClient();

  if (!client) return;

  await client.createMessage(channelId, {

    embeds: [buildAgentEmbed({ agentId: "agentos-operator", title: statusLabel, description: message.slice(0, 3900), tone: "info" })]

  });

}



function formatCursorStatus() {

  const status = getCursorBridgeStatus();

  const agentId = status.enabled ? "(per-user session)" : "n/a";

  return [

    `Bridge: **${status.enabled ? "online" : "offline"}**`,

    status.reason ? `Note: ${status.reason}` : "",

    `Repo: \`${status.repoCwd}\``,

    `Model: \`${status.model}\``,

    `Session: ${agentId}`,

    "",

    "Send any prompt to run it in Cursor against this repo. React below or type freely."

  ]

    .filter(Boolean)

    .join("\n");

}



const HELP_TEXT = [

  "**Cursor bridge** — Discord ↔ local Cursor agent on your AgentOS repo.",

  "",

  "Send a normal message to execute a Cursor prompt; replies post here.",

  "",

  "React on cards: ✅ ack · 📊 status · 🔄 reset · ❓ help · 💬 free-text hint",

  "",

  "Or type: `help` · `status` · `reset`"

].join("\n");



export async function handleCursorChannelMessage(

  channelId: string,

  content: string,

  discordUserId: string,

  operatorLabel: string

) {

  const text = content.trim().replace(/^[!/]+/, "").trim();

  const lower = text.toLowerCase();



  if (!text) {

    await replyInCursorChannel(channelId, operatorLabel, "Send a Cursor prompt or react ❓ for help.", "Empty message");

    return { handled: true as const };

  }



  if (lower === "help" || lower === "commands" || lower === "?") {

    await replyInCursorChannel(channelId, operatorLabel, HELP_TEXT, "Cursor bridge");

    return { handled: true as const };

  }



  if (lower === "status" || lower.startsWith("status ")) {

    const sessionId = getCursorSessionAgentId(discordUserId);

    const extra = sessionId ? `\nYour session agent: \`${sessionId}\`` : "\nNo active session yet — your next message starts one.";

    await replyInCursorChannel(channelId, operatorLabel, `${formatCursorStatus()}${extra}`, "Cursor status");

    return { handled: true as const };

  }



  if (lower === "reset" || lower === "new" || lower === "clear") {

    resetCursorSession(discordUserId);

    await replyInCursorChannel(

      channelId,

      operatorLabel,

      "Started a fresh Cursor conversation context. Your next message creates a new agent session.",

      "Session reset"

    );

    return { handled: true as const };

  }



  if (!isCursorBridgeEnabled()) {

    await replyInCursorChannel(

      channelId,

      operatorLabel,

      getCursorBridgeStatus().reason ??

        "Set `CURSOR_API_KEY` in `.env` and restart the API (`pnpm dev:api`).",

      "Cursor bridge offline"

    );

    return { handled: true as const };

  }



  const webhook = cursorWebhook();

  if (webhook) {

    await deliverRichAgentCard(webhook, {

      agentId: "agentos-operator",

      recipient: operatorLabel,

      message: `Running your prompt in \`${getCursorBridgeStatus().repoCwd}\`…`,

      status: { label: "Cursor working", routing: getCursorBridgeStatus().model },

      operationalStatus: "BUSY",

      ...defaultCursorRichCard,

      attachReactions: false

    });

  }



  const result = await sendCursorPrompt(discordUserId, text);



  if (webhook) {

    await deliverRichAgentCard(webhook, {

      agentId: "agentos-operator",

      recipient: operatorLabel,

      message: result.ok

        ? result.response

        : `${result.error ?? "Cursor failed."}${result.response ? `\n\nPartial output:\n${result.response}` : ""}`,

      status: {

        label: result.ok ? "Cursor reply" : "Cursor error",

        routing: result.runId ? `run ${result.runId}` : "Cursor local"

      },

      operationalStatus: result.ok ? "ONLINE" : "DEGRADED",

      ...defaultCursorRichCard

    });

    return { handled: true as const, cursor: result.ok };

  }



  await replyInCursorChannel(

    channelId,

    operatorLabel,

    result.ok ? result.response : (result.error ?? "Unknown error"),

    result.ok ? "Cursor" : "Cursor failed"

  );

  return { handled: true as const, cursor: result.ok };

}



export function isCursorChannel(channelId: string) {

  const cursorChannelId = resolveCursorChannelId();

  return Boolean(cursorChannelId && cursorChannelId === channelId);

}


