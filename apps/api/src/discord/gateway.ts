import { isDiscordBotEnabled } from "./client";
import { loadDiscordGuildState } from "./bootstrap";
import { dispatchDiscordInteraction, type DiscordInteraction } from "./interactions";
import { handleDiscordChannelMessage } from "./chat";
import { isAuthorizedDiscordOperator, resolveOperatorCommandChannelId } from "./operator-auth";
import { resolveCursorChannelId } from "./cursor-channel";
import { handleDiscordReactionAdd } from "./reaction-handlers";

const DISCORD_API = "https://discord.com/api/v10";
const GATEWAY_INTENTS = 34305; // GUILDS + GUILD_MESSAGES + GUILD_MESSAGE_REACTIONS + MESSAGE_CONTENT

type GatewayPayload = {
  op: number;
  d?: unknown;
  s?: number | null;
  t?: string | null;
};

type GatewayMessage = {
  id: string;
  channel_id: string;
  content: string;
  author?: { id: string; bot?: boolean; username?: string; global_name?: string | null };
};

type GatewayReaction = {
  user_id: string;
  channel_id: string;
  message_id: string;
  emoji: { name?: string; id?: string };
  member?: { user?: { bot?: boolean } };
};

let socket: WebSocket | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let sessionId: string | undefined;
let resumeGatewayUrl: string | undefined;
let sequence: number | null = null;

function clearTimers() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  heartbeatTimer = undefined;
  reconnectTimer = undefined;
}

function scheduleReconnect(delayMs = 5000) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    void startDiscordGateway();
  }, delayMs);
}

function sendPayload(payload: GatewayPayload) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function handleDispatch(event: string, data: unknown) {
  if (event === "INTERACTION_CREATE") {
    const interaction = data as DiscordInteraction;
    void dispatchDiscordInteraction(interaction, "gateway").catch(() => {
      // Interaction errors are surfaced to Discord via callback when possible.
    });
    return;
  }

  if (event === "MESSAGE_CREATE") {
    const message = data as GatewayMessage;
    if (message.author?.bot) return;
    const content = message.content?.trim() ?? "";
    if (!content || content.startsWith("/") || content.startsWith("!")) return;

    const operatorCommandChannelId = resolveOperatorCommandChannelId();
    const cursorChannelId = resolveCursorChannelId();
    if (
      (operatorCommandChannelId && message.channel_id === operatorCommandChannelId) ||
      (cursorChannelId && message.channel_id === cursorChannelId)
    ) {
      if (!isAuthorizedDiscordOperator(message.author?.id)) return;
    }

    const label = message.author?.global_name || message.author?.username || message.author?.id || "operator";
    void handleDiscordChannelMessage(message.channel_id, message.id, content, message.author?.id ?? "unknown", label);
    return;
  }

  if (event === "MESSAGE_REACTION_ADD") {
    const reaction = data as GatewayReaction;
    if (reaction.member?.user?.bot) return;
    const label = reaction.user_id;
    void handleDiscordReactionAdd(
      reaction.channel_id,
      reaction.message_id,
      reaction.emoji,
      reaction.user_id,
      label
    );
  }
}

function onGatewayMessage(raw: GatewayPayload) {
  if (raw.s) sequence = raw.s;

  switch (raw.op) {
    case 10: {
      const interval = (raw.d as { heartbeat_interval: number }).heartbeat_interval;
      clearTimers();
      heartbeatTimer = setInterval(() => sendPayload({ op: 1, d: sequence }), interval);
      const token = process.env.DISCORD_BOT_TOKEN?.trim();
      if (!token) return;

      if (sessionId && resumeGatewayUrl && sequence) {
        sendPayload({ op: 6, d: { token: `Bot ${token}`, session_id: sessionId, seq: sequence } });
      } else {
        sendPayload({
          op: 2,
          d: {
            token: `Bot ${token}`,
            intents: GATEWAY_INTENTS,
            properties: { os: "linux", browser: "agentos", device: "agentos" }
          }
        });
      }
      break;
    }
    case 11:
      break;
    case 7:
    case 9:
      sessionId = undefined;
      socket?.close();
      scheduleReconnect();
      break;
    case 0:
      if (raw.t === "READY") {
        sessionId = (raw.d as { session_id: string }).session_id;
        resumeGatewayUrl = (raw.d as { resume_gateway_url: string }).resume_gateway_url;
      }
      if (raw.t) handleDispatch(raw.t, raw.d);
      break;
    default:
      break;
  }
}

export async function startDiscordGateway() {
  if (!isDiscordBotEnabled()) return { ok: false, reason: "disabled" };
  if (!loadDiscordGuildState()?.channels?.general && !loadDiscordGuildState()?.channels?.roundTable) {
    return { ok: false, reason: "no-chat-channels" };
  }

  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) return { ok: false, reason: "no-token" };

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return { ok: true, reason: "already-connected" };
  }

  const gateway = await fetch(`${DISCORD_API}/gateway/bot`, {
    headers: { Authorization: `Bot ${token}` }
  });
  if (!gateway.ok) {
    return { ok: false, reason: `gateway-http-${gateway.status}` };
  }
  const body = (await gateway.json()) as { url: string };
  const url = `${body.url}/?v=10&encoding=json`;

  socket = new WebSocket(url);
  socket.addEventListener("message", (event) => {
    try {
      onGatewayMessage(JSON.parse(String(event.data)) as GatewayPayload);
    } catch {
      // ignore malformed frames
    }
  });
  socket.addEventListener("close", () => {
    clearTimers();
    scheduleReconnect(7000);
  });
  socket.addEventListener("error", () => {
    socket?.close();
  });

  return { ok: true, reason: "connecting" };
}

export function stopDiscordGateway() {
  clearTimers();
  sessionId = undefined;
  sequence = null;
  socket?.close();
  socket = undefined;
}
