import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "@agentos/persistence";
import { getProviderId, providers } from "../providers";
import { addAudit, addUsageEvent } from "../store";
import { loadDiscordGuildState } from "./bootstrap";
import { isDiscordBotEnabled } from "./client";
import type { AgentOsChannelKey } from "./layout";
import {
  AGENT_PERSONAS,
  personaDiscordName,
  personaMessageLine,
  resolvePersona
} from "./personas";
import { postPersonaPlainMessage, postPersonaRichMessage } from "./webhook-post";

export type ChatRoomNumber = 1 | 2 | 3;

export type ChatRoomChannelKey = "chatRoom1" | "chatRoom2" | "chatRoom3";

export type ChatRoomReservation = {
  room: ChatRoomNumber;
  channelKey: ChatRoomChannelKey;
  reservedBy: string;
  reservedByLabel: string;
  topic: string;
  participants: string[];
  operatorId?: string;
  operatorLabel?: string;
  messageCount: number;
  /** Conversation lines for round-table summary on release. */
  transcript?: string[];
  reservedAt: string;
  lastActivityAt: string;
};

export type ChatRoomsState = {
  rooms: Record<ChatRoomNumber, ChatRoomReservation | null>;
};

const ROOM_CHANNEL_KEYS: Record<ChatRoomNumber, ChatRoomChannelKey> = {
  1: "chatRoom1",
  2: "chatRoom2",
  3: "chatRoom3"
};

const CHANNEL_KEY_TO_ROOM: Record<ChatRoomChannelKey, ChatRoomNumber> = {
  chatRoom1: 1,
  chatRoom2: 2,
  chatRoom3: 3
};

export const CHAT_ROOM_MAX_MESSAGES = 24;
export const CHAT_ROOM_IDLE_MS = 30 * 60 * 1000;
export const CHAT_ROOM_MAX_PARTICIPANTS = 3;
const CHAT_ROOM_MAX_TRANSCRIPT_LINES = 48;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statePath() {
  return join(findRepoRoot(process.cwd()), ".agentos", "state", "discord-chat-rooms.json");
}

export function loadChatRoomsState(): ChatRoomsState {
  const path = statePath();
  if (!existsSync(path)) {
    return { rooms: { 1: null, 2: null, 3: null } };
  }
  const parsed = JSON.parse(readFileSync(path, "utf8")) as ChatRoomsState;
  return {
    rooms: {
      1: parsed.rooms?.[1] ?? null,
      2: parsed.rooms?.[2] ?? null,
      3: parsed.rooms?.[3] ?? null
    }
  };
}

function saveChatRoomsState(state: ChatRoomsState) {
  const path = statePath();
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function roomChannelKey(room: ChatRoomNumber): ChatRoomChannelKey {
  return ROOM_CHANNEL_KEYS[room];
}

export function channelKeyToRoom(key: ChatRoomChannelKey): ChatRoomNumber {
  return CHANNEL_KEY_TO_ROOM[key];
}

export function isChatRoomChannelKey(key: AgentOsChannelKey): key is ChatRoomChannelKey {
  return key === "chatRoom1" || key === "chatRoom2" || key === "chatRoom3";
}

export function parseChatRoomNumber(text: string): ChatRoomNumber | null {
  const normalized = text.toLowerCase();
  const patterns = [
    /(?:reserve|taking|take|using|use|book|grab)\s+(?:chat\s+)?room\s*#?\s*([123])\b/,
    /(?:i(?:'ll| will))\s+(?:reserve|take|use)\s+(?:chat\s+)?room\s*#?\s*([123])\b/,
    /(?:chat\s+)?room\s*#?\s*([123])\b(?:\s+(?:reserved|booked|taken))?/,
    /\broom\s*#?\s*([123])\b/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const room = Number(match[1]) as ChatRoomNumber;
      if (room >= 1 && room <= 3) return room;
    }
  }
  return null;
}

export function isReleaseRoomMessage(text: string, room?: ChatRoomNumber): boolean {
  const normalized = text.toLowerCase().trim();
  const generic = /^(?:release|free|clear|done with)\s+(?:chat\s+)?room(?:\s*#?\s*([123]))?\b/.test(normalized);
  if (!generic) return false;
  if (!room) return true;
  const match = normalized.match(/(?:chat\s+)?room\s*#?\s*([123])/);
  if (!match?.[1]) return true;
  return Number(match[1]) === room;
}

export function parseParticipantAgentIds(text: string, reservingAgentId: string): string[] {
  const normalized = text.toLowerCase();
  const hits = new Set<string>([reservingAgentId]);

  for (const persona of AGENT_PERSONAS) {
    const name = persona.characterName.toLowerCase();
    const role = persona.roleTitle.toLowerCase();
    if (normalized.includes(name) || normalized.includes(`[${role}]`)) {
      hits.add(persona.agentId);
    }
  }

  const withPeers = /(?:with|and|join(?:ing)?)\s+([a-z,\s]+)/i.exec(text);
  if (withPeers?.[1]) {
    for (const persona of AGENT_PERSONAS) {
      if (withPeers[1].toLowerCase().includes(persona.characterName.toLowerCase())) {
        hits.add(persona.agentId);
      }
    }
  }

  const list = [...hits].slice(0, CHAT_ROOM_MAX_PARTICIPANTS);
  if (list.length === 1 && reservingAgentId === "admin-agent") {
    return ["admin-agent", "builder-agent"].slice(0, CHAT_ROOM_MAX_PARTICIPANTS);
  }
  if (list.length === 1) {
    return [reservingAgentId, "admin-agent"].slice(0, CHAT_ROOM_MAX_PARTICIPANTS);
  }
  return list;
}

export function parseRoomReservationIntent(text: string): { room: ChatRoomNumber } | null {
  const room = parseChatRoomNumber(text);
  if (!room) return null;
  const normalized = text.toLowerCase();
  const reserveVerb =
    /\b(reserve|taking|take|using|use|book|grab|i'll|i will|let's|lets)\b/.test(normalized) ||
    /\broom\s*#?\s*[123]\b/.test(normalized);
  if (!reserveVerb) return null;
  return { room };
}

function resolveRoomWebhook(channelKey: ChatRoomChannelKey) {
  const state = loadDiscordGuildState();
  return state?.webhooks?.[channelKey];
}

function participantsSummary(agentIds: string[]) {
  return agentIds.map((id) => personaDiscordName(resolvePersona(id))).join(", ");
}

function appendTranscriptLines(reservation: ChatRoomReservation, lines: string[]) {
  const existing = reservation.transcript ?? [];
  reservation.transcript = [...existing, ...lines].slice(-CHAT_ROOM_MAX_TRANSCRIPT_LINES);
}

function resolveRoundTableWebhook() {
  return loadDiscordGuildState()?.webhooks?.roundTable;
}

export function formatChatRoomSummaryHeader(room: ChatRoomNumber, reason: string) {
  return `Chat room ${room} summary (${reason})`;
}

export async function postChatRoomSummaryToRoundTable(
  reservation: ChatRoomReservation,
  reason: string
) {
  const webhook = resolveRoundTableWebhook();
  if (!webhook || !isDiscordBotEnabled()) {
    return { ok: false as const, reason: "no-round-table-webhook" as const };
  }

  const header = formatChatRoomSummaryHeader(reservation.room, reason);
  const transcriptText = (reservation.transcript ?? []).join("\n").trim();
  const participants = participantsSummary(reservation.participants);

  if (!transcriptText && reservation.messageCount === 0) {
    await postPersonaRichMessage(webhook, {
      agentId: "admin-agent",
      recipient: reservation.operatorLabel?.replace(/^@/, "").trim() || "Operator",
      message: `${header} — Participants: ${participants}. Topic: ${reservation.topic}. No messages were exchanged before the room closed.`,
      status: { label: "Chat room summary", routing: "AgentOS Local" }
    });
    return { ok: true as const, summarized: false as const };
  }

  const provider = providers[getProviderId()];
  const llmPrompt = [
    "You are summarizing a focused AgentOS chat-room side conversation for the round-table channel.",
    `Room: ${reservation.room}`,
    `Topic: ${reservation.topic}`,
    `Participants: ${participants}`,
    `Closed because: ${reason}`,
    transcriptText ? `Transcript:\n${transcriptText}` : "No transcript lines were captured.",
    "Write 2-4 sentences covering key points, decisions, and any open questions.",
    "Do not prefix with a persona name or brackets — that will be added separately.",
    "Do not mention Discord channel names."
  ].join("\n\n");

  const result = await provider.chat({
    prompt: llmPrompt,
    agentId: "admin-agent",
    saveMemory: false
  });

  addUsageEvent({
    provider: result.provider,
    model: result.model,
    promptTokens: Math.ceil(llmPrompt.length / 4),
    completionTokens: Math.ceil(result.response.length / 4),
    totalTokens: Math.ceil((llmPrompt.length + result.response.length) / 4),
    estimatedCostUsd: 0,
    agentId: "admin-agent",
    runId: `discord-chat-room-summary-${reservation.room}-${Date.now()}`
  });

  await postPersonaRichMessage(webhook, {
    agentId: "admin-agent",
    recipient: reservation.operatorLabel?.replace(/^@/, "").trim() || "Operator",
    message: `${header}\nParticipants: ${participants}\n${result.response.trim()}`,
    status: { label: "Chat room summary", routing: "AgentOS Local" }
  });

  addAudit(
    "discord.chat-room.summary",
    reservation.operatorId ?? reservation.reservedBy,
    `Posted chat room ${reservation.room} summary to round-table (${reason}).`
  );

  return { ok: true as const, summarized: true as const };
}

function expireIdleRooms(state: ChatRoomsState): ChatRoomsState {
  return state;
}

async function releaseIdleRoomsIfNeeded(state: ChatRoomsState) {
  const now = Date.now();
  for (const room of [1, 2, 3] as ChatRoomNumber[]) {
    const reservation = state.rooms[room];
    if (!reservation) continue;
    const idleMs = now - new Date(reservation.lastActivityAt).getTime();
    if (idleMs >= CHAT_ROOM_IDLE_MS) {
      await releaseChatRoom(room, `idle timeout (${CHAT_ROOM_IDLE_MS / 60_000} min)`, "system");
    }
  }
}

async function loadChatRoomsStateFresh() {
  const state = loadChatRoomsState();
  await releaseIdleRoomsIfNeeded(state);
  return loadChatRoomsState();
}

export async function releaseChatRoom(
  room: ChatRoomNumber,
  reason: string,
  operatorId = "system",
  options?: { skipSummary?: boolean }
) {
  const state = loadChatRoomsState();
  const reservation = state.rooms[room];
  if (!reservation) {
    return { ok: false as const, reason: "not-reserved" as const };
  }

  if (!options?.skipSummary) {
    await postChatRoomSummaryToRoundTable(reservation, reason);
  }

  state.rooms[room] = null;
  saveChatRoomsState(state);

  const webhook = resolveRoomWebhook(reservation.channelKey);
  if (webhook && isDiscordBotEnabled()) {
    await postPersonaPlainMessage(
      webhook,
      "admin-agent",
      `Room ${room} released — ${reason}. Summary posted to \`#round-table\`. Available for a new reservation.`
    );
  }

  addAudit("discord.chat-room.released", operatorId, `Chat room ${room} released (${reason}).`);
  return { ok: true as const, room };
}

export async function reserveChatRoom(input: {
  room: ChatRoomNumber;
  reservedBy: string;
  topic: string;
  participants?: string[];
  operatorId?: string;
  operatorLabel?: string;
}) {
  if (!isDiscordBotEnabled()) {
    return { ok: false as const, reason: "disabled" as const };
  }

  const state = await loadChatRoomsStateFresh();
  if (state.rooms[input.room]) {
    return { ok: false as const, reason: "already-reserved" as const };
  }

  const channelKey = roomChannelKey(input.room);
  const webhook = resolveRoomWebhook(channelKey);
  if (!webhook) {
    return { ok: false as const, reason: "no-webhook" as const };
  }

  const persona = resolvePersona(input.reservedBy);
  const participants = (input.participants ?? parseParticipantAgentIds(input.topic, input.reservedBy)).slice(
    0,
    CHAT_ROOM_MAX_PARTICIPANTS
  );

  const now = new Date().toISOString();
  const reservation: ChatRoomReservation = {
    room: input.room,
    channelKey,
    reservedBy: input.reservedBy,
    reservedByLabel: personaDiscordName(persona),
    topic: input.topic.slice(0, 500),
    participants,
    operatorId: input.operatorId,
    operatorLabel: input.operatorLabel,
    messageCount: 0,
    transcript: [],
    reservedAt: now,
    lastActivityAt: now
  };

  state.rooms[input.room] = reservation;
  saveChatRoomsState(state);

  const opener = input.operatorLabel
    ? `${reservation.reservedByLabel} reserved chat room ${input.room} (via ${input.operatorLabel}).`
    : `${reservation.reservedByLabel} reserved chat room ${input.room}.`;

  await postPersonaPlainMessage(
    webhook,
    input.reservedBy,
    `${opener} Topic: ${reservation.topic}. Participants: ${participantsSummary(participants)}.`
  );

  addAudit(
    "discord.chat-room.reserved",
    input.operatorId ?? input.reservedBy,
    `Chat room ${input.room} reserved by ${reservation.reservedByLabel}.`
  );

  return { ok: true as const, reservation };
}

export async function tryReserveFromRoundTableMessage(
  text: string,
  agentId: string,
  topicContext: string,
  operatorId?: string,
  operatorLabel?: string
) {
  const intent = parseRoomReservationIntent(text);
  if (!intent) return { reserved: false as const };

  const participants = parseParticipantAgentIds(`${text} ${topicContext}`, agentId);
  const result = await reserveChatRoom({
    room: intent.room,
    reservedBy: agentId,
    topic: topicContext || text,
    participants,
    operatorId,
    operatorLabel
  });

  return { reserved: result.ok, room: intent.room, reason: result.ok ? undefined : result.reason };
}

export async function runChatRoomConversation(
  channelKey: ChatRoomChannelKey,
  prompt: string,
  operatorId: string,
  operatorLabel: string
) {
  if (!isDiscordBotEnabled()) {
    return { ok: false as const, reason: "disabled" as const };
  }

  const room = channelKeyToRoom(channelKey);
  const state = await loadChatRoomsStateFresh();
  const reservation = state.rooms[room];
  if (!reservation) {
    return { ok: false as const, reason: "not-reserved" as const };
  }

  const webhook = resolveRoomWebhook(channelKey);
  if (!webhook) {
    return { ok: false as const, reason: "no-webhook" as const };
  }

  if (isReleaseRoomMessage(prompt, room)) {
    await releaseChatRoom(room, `released by ${operatorLabel}`, operatorId);
    return { ok: true as const, released: true as const };
  }

  const provider = providers[getProviderId()];
  const turnLines: string[] = [`Operator (${operatorLabel}): ${prompt.slice(0, 500)}`];
  const posts: Array<{ agentId: string; messageId: string }> = [];

  for (const agentId of reservation.participants) {
    const persona = resolvePersona(agentId);
    const peers = participantsSummary(reservation.participants.filter((id) => id !== agentId));
    const llmPrompt = [
      `You are ${personaDiscordName(persona)} in AgentOS chat room ${room} — a focused side conversation.`,
      `Other participants: ${peers || "none"}.`,
      `Room topic: ${reservation.topic}`,
      `Operator (${operatorLabel}) said: "${prompt}"`,
      reservation.transcript?.length
        ? `Discussion so far:\n${reservation.transcript.join("\n")}`
        : "No replies yet in this room.",
      "Reply in 1-2 conversational sentences in character. Stay on the room topic.",
      "Do not prefix your reply with your name or brackets."
    ].join("\n\n");

    const result = await provider.chat({
      prompt: llmPrompt,
      agentId,
      saveMemory: false
    });

    const line = personaMessageLine(persona, result.response.trim());
    turnLines.push(line);

    const message = await postPersonaRichMessage(webhook, {
      agentId,
      recipient: operatorLabel.replace(/^@/, "").trim() || "Operator",
      message: result.response.trim(),
      status: { label: `Chat room ${room}`, routing: "AgentOS Local" },
      includeQuickActions: false
    });
    posts.push({ agentId, messageId: message.id });

    addUsageEvent({
      provider: result.provider,
      model: result.model,
      promptTokens: Math.ceil(llmPrompt.length / 4),
      completionTokens: Math.ceil(result.response.length / 4),
      totalTokens: Math.ceil((llmPrompt.length + result.response.length) / 4),
      estimatedCostUsd: 0,
      agentId,
      runId: `discord-chat-room-${room}-${Date.now()}`
    });

    await sleep(750);
  }

  reservation.messageCount += 1;
  reservation.lastActivityAt = new Date().toISOString();
  appendTranscriptLines(reservation, turnLines);
  state.rooms[room] = reservation;
  saveChatRoomsState(state);

  addAudit("discord.chat-room.message", operatorId, `Chat room ${room} conversation by ${operatorLabel}.`);

  if (reservation.messageCount >= CHAT_ROOM_MAX_MESSAGES) {
    await releaseChatRoom(room, `message limit (${CHAT_ROOM_MAX_MESSAGES}) reached`, operatorId);
    return { ok: true as const, posts: posts.length, released: true as const };
  }

  return { ok: true as const, posts: posts.length, released: false as const };
}

export function getActiveChatRoomReservation(room: ChatRoomNumber) {
  const state = expireIdleRooms(loadChatRoomsState());
  return state.rooms[room];
}
