import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "@agentos/persistence";
import { getProviderId, providers } from "../providers";
import { addAudit, addUsageEvent } from "../store";
import { agentJournalWikiSlug, houseChannelName } from "./agent-houses";
import { loadDiscordGuildState } from "./bootstrap";
import { isDiscordBotEnabled } from "./client";
import { appendVisitToHostJournal } from "./house-wiki";
import {
  AGENT_PERSONAS,
  personaDiscordName,
  personaMessageLine,
  resolvePersona,
  ROSTER_PERSONAS
} from "./personas";
import { postPersonaPlainMessage, postPersonaRichMessage } from "./webhook-post";

export type HouseVisit = {
  hostAgentId: string;
  houseChannelId: string;
  channelName: string;
  wikiJournalSlug: string;
  guests: string[];
  topic: string;
  operatorId?: string;
  operatorLabel?: string;
  messageCount: number;
  transcript: string[];
  startedAt: string;
  lastActivityAt: string;
  expiresAt: string;
};

export type HouseVisitsState = {
  visits: Record<string, HouseVisit | null>;
};

export const HOUSE_VISIT_MAX_GUESTS = 2;
export const HOUSE_VISIT_MAX_MESSAGES = 20;
export const HOUSE_VISIT_IDLE_MS = 45 * 60 * 1000;
export const HOUSE_VISIT_DEFAULT_DURATION_MS = 45 * 60 * 1000;
const HOUSE_VISIT_MAX_TRANSCRIPT_LINES = 48;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statePath() {
  return join(findRepoRoot(process.cwd()), ".agentos", "state", "discord-house-visits.json");
}

export function loadHouseVisitsState(): HouseVisitsState {
  const path = statePath();
  if (!existsSync(path)) {
    return { visits: {} };
  }
  const parsed = JSON.parse(readFileSync(path, "utf8")) as HouseVisitsState;
  return { visits: parsed.visits ?? {} };
}

function saveHouseVisitsState(state: HouseVisitsState) {
  const path = statePath();
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function houseVisitsEnabled() {
  return (process.env.AGENTOS_DISCORD_HOUSE_VISITS ?? "true") !== "false";
}

export function resolveHostAgentIdFromChannelId(channelId: string) {
  const houses = loadDiscordGuildState()?.houses;
  if (!houses) return undefined;
  for (const [agentId, house] of Object.entries(houses)) {
    if (house.channelId === channelId) return agentId;
  }
  return undefined;
}

export function resolveHouseRecord(agentId: string) {
  const houses = loadDiscordGuildState()?.houses;
  if (!houses) return undefined;
  if (houses[agentId]) return houses[agentId];
  const persona = resolvePersona(agentId);
  return houses[persona.agentId];
}

export function resolveHostAgentIdFromText(text: string) {
  const normalized = text.toLowerCase();
  const houses = loadDiscordGuildState()?.houses;
  if (!houses) return undefined;

  for (const [agentId, house] of Object.entries(houses)) {
    if (normalized.includes(house.channelName) || normalized.includes(`#${house.channelName}`)) {
      return agentId;
    }
    const persona = resolvePersona(agentId);
    const name = persona.characterName.toLowerCase();
    if (
      normalized.includes(`${name}'s house`) ||
      normalized.includes(`${name}s house`) ||
      normalized.includes(`to ${name}'s`) ||
      normalized.includes(`to ${name} house`)
    ) {
      return agentId;
    }
    if (normalized.includes(name) && normalized.includes("house")) {
      return agentId;
    }
  }

  for (const persona of ROSTER_PERSONAS) {
    const channel = houseChannelName(persona);
    if (normalized.includes(channel) || normalized.includes(`#${channel}`)) {
      return persona.agentId;
    }
    const name = persona.characterName.toLowerCase();
    if (normalized.includes(`${name}'s house`) || normalized.includes(`to ${name}'s`)) {
      return persona.agentId;
    }
  }

  return undefined;
}

export function parseGuestAgentIds(text: string, hostAgentId: string, max = HOUSE_VISIT_MAX_GUESTS) {
  const normalized = text.toLowerCase();
  const hostPersona = resolvePersona(hostAgentId);
  const hits = new Set<string>();

  for (const persona of AGENT_PERSONAS) {
    if (persona.agentId === hostPersona.agentId) continue;
    const name = persona.characterName.toLowerCase();
    const role = persona.roleTitle.toLowerCase();
    if (normalized.includes(name) || normalized.includes(`[${role}]`)) {
      hits.add(resolvePersona(persona.agentId).agentId);
    }
  }

  const guestClause =
    /(?:invite|invites|inviting)\s+([a-z0-9,\s\[\]-]+?)(?:\s+to\b|\s+over\b|\s+for\b|$)/i.exec(text) ??
    /(?:with|and)\s+([a-z,\s]+)/i.exec(text);

  if (guestClause?.[1]) {
    for (const persona of AGENT_PERSONAS) {
      if (persona.agentId === hostPersona.agentId) continue;
      if (guestClause[1].toLowerCase().includes(persona.characterName.toLowerCase())) {
        hits.add(resolvePersona(persona.agentId).agentId);
      }
    }
  }

  return [...hits].filter((id) => id !== hostPersona.agentId).slice(0, max);
}

export function parseVisitDurationMs(text: string, fallbackMs = HOUSE_VISIT_DEFAULT_DURATION_MS) {
  const match = text.match(/\b(?:for\s+)?(\d{1,3})\s*(?:min|minute|minutes)\b/i);
  if (!match?.[1]) return fallbackMs;
  const minutes = Number(match[1]);
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 180) return fallbackMs;
  return minutes * 60_000;
}

export function parseHouseInviteIntent(text: string, contextHostAgentId?: string) {
  const normalized = text.toLowerCase().trim();
  const inviteVerb =
    /\binvite(?:s|d|ing)?\b/.test(normalized) ||
    /\b(come over|join me at|hosting|guests over)\b/.test(normalized);
  if (!inviteVerb) return null;

  const hostAgentId = contextHostAgentId ?? resolveHostAgentIdFromText(text);
  if (!hostAgentId) return null;

  const guests = parseGuestAgentIds(text, hostAgentId);
  if (!guests.length) return null;

  const topic =
    /(?:for|about|topic:)\s+(.+)$/i.exec(text.trim())?.[1]?.trim() ||
    text.replace(/\binvite\b/gi, "").trim().slice(0, 500);

  return {
    hostAgentId,
    guests,
    topic: topic || "Neighborhood visit",
    durationMs: parseVisitDurationMs(text)
  };
}

export function isEndVisitMessage(text: string) {
  const normalized = text.toLowerCase().trim();
  return /^(?:end visit|end the visit|goodbye guests|guests leave|visit over|close visit)\b/.test(normalized);
}

function participantsSummary(agentIds: string[]) {
  return agentIds.map((id) => personaDiscordName(resolvePersona(id))).join(", ");
}

function visitParticipants(visit: HouseVisit) {
  return [visit.hostAgentId, ...visit.guests];
}

function appendTranscriptLines(visit: HouseVisit, lines: string[]) {
  visit.transcript = [...(visit.transcript ?? []), ...lines].slice(-HOUSE_VISIT_MAX_TRANSCRIPT_LINES);
}

function resolveHouseWebhook(hostAgentId: string) {
  return resolveHouseRecord(hostAgentId)?.webhook;
}

function resolveTownSquareWebhook() {
  return loadDiscordGuildState()?.webhooks?.townSquare;
}

export function getActiveHouseVisit(hostAgentId: string) {
  const state = loadHouseVisitsState();
  return state.visits[hostAgentId] ?? null;
}

export function getActiveVisitByChannelId(channelId: string) {
  const state = loadHouseVisitsState();
  return Object.values(state.visits).find((visit) => visit?.houseChannelId === channelId) ?? null;
}

async function expireIdleVisits(state: HouseVisitsState) {
  const now = Date.now();
  for (const [hostAgentId, visit] of Object.entries(state.visits)) {
    if (!visit) continue;
    const idleMs = now - new Date(visit.lastActivityAt).getTime();
    const expired = now >= new Date(visit.expiresAt).getTime();
    if (idleMs >= HOUSE_VISIT_IDLE_MS || expired) {
      const reason = expired ? "visit duration ended" : `idle timeout (${HOUSE_VISIT_IDLE_MS / 60_000} min)`;
      await releaseHouseVisit(hostAgentId, reason, "system");
    }
  }
}

async function loadHouseVisitsStateFresh() {
  const state = loadHouseVisitsState();
  await expireIdleVisits(state);
  return loadHouseVisitsState();
}

export async function announceHouseVisit(
  visit: HouseVisit,
  kind: "started" | "ended",
  detail: string
) {
  const webhook = resolveTownSquareWebhook();
  if (!webhook || !isDiscordBotEnabled()) return;

  const host = personaDiscordName(resolvePersona(visit.hostAgentId));
  const guests = participantsSummary(visit.guests);
  const message =
    kind === "started"
      ? `🏠 **Visit opened** — ${host} invited ${guests} to \`#${visit.channelName}\`.\nTopic: ${visit.topic}\n${detail}`
      : `🏠 **Visit closed** — \`#${visit.channelName}\` (${host} + guests: ${guests}).\n${detail}`;

  await postPersonaRichMessage(webhook, {
    agentId: visit.hostAgentId,
    recipient: visit.operatorLabel?.replace(/^@/, "").trim() || "Neighborhood",
    message,
    status: { label: kind === "started" ? "House visit" : "Visit summary", routing: "AgentOS Local" },
    includeQuickActions: false
  });
}

export async function inviteToHouse(input: {
  hostAgentId: string;
  guests: string[];
  topic: string;
  durationMs?: number;
  operatorId?: string;
  operatorLabel?: string;
}) {
  if (!isDiscordBotEnabled() || !houseVisitsEnabled()) {
    return { ok: false as const, reason: "disabled" as const };
  }

  const house = resolveHouseRecord(input.hostAgentId);
  if (!house?.webhook) {
    return { ok: false as const, reason: "no-house" as const };
  }

  const hostAgentId = house.agentId;
  const state = await loadHouseVisitsStateFresh();
  if (state.visits[hostAgentId]) {
    return { ok: false as const, reason: "visit-active" as const };
  }

  const guests = input.guests
    .map((id) => resolvePersona(id).agentId)
    .filter((id) => id !== hostAgentId)
    .slice(0, HOUSE_VISIT_MAX_GUESTS);

  if (!guests.length) {
    return { ok: false as const, reason: "no-guests" as const };
  }

  const durationMs = input.durationMs ?? HOUSE_VISIT_DEFAULT_DURATION_MS;
  const now = new Date();
  const visit: HouseVisit = {
    hostAgentId,
    houseChannelId: house.channelId,
    channelName: house.channelName,
    wikiJournalSlug: house.wikiJournalSlug,
    guests,
    topic: input.topic.slice(0, 500),
    operatorId: input.operatorId,
    operatorLabel: input.operatorLabel,
    messageCount: 0,
    transcript: [],
    startedAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + durationMs).toISOString()
  };

  state.visits[hostAgentId] = visit;
  saveHouseVisitsState(state);

  const hostLabel = personaDiscordName(resolvePersona(hostAgentId));
  const guestLabels = participantsSummary(guests);
  const opener = input.operatorLabel
    ? `${hostLabel} is hosting ${guestLabels} (invited by ${input.operatorLabel}).`
    : `${hostLabel} invited ${guestLabels} over.`;

  await postPersonaPlainMessage(
    house.webhook,
    hostAgentId,
    `${opener}\nTopic: ${visit.topic}\nPost here to chat — say \`end visit\` when done. Visit lasts ~${Math.round(durationMs / 60_000)} min.`
  );

  await announceHouseVisit(
    visit,
    "started",
    `Chat in \`#${visit.channelName}\`. Journal: \`${visit.wikiJournalSlug}\``
  );

  addAudit(
    "discord.house.visit.started",
    input.operatorId ?? hostAgentId,
    `${hostLabel} invited ${guestLabels} to #${visit.channelName}.`
  );

  return { ok: true as const, visit };
}

export async function tryInviteFromTownSquareMessage(
  text: string,
  operatorId: string,
  operatorLabel: string
) {
  const intent = parseHouseInviteIntent(text);
  if (!intent) return { invited: false as const };

  const result = await inviteToHouse({
    hostAgentId: intent.hostAgentId,
    guests: intent.guests,
    topic: intent.topic,
    durationMs: intent.durationMs,
    operatorId,
    operatorLabel
  });

  return {
    invited: result.ok,
    hostAgentId: intent.hostAgentId,
    reason: result.ok ? undefined : result.reason
  };
}

export async function summarizeHouseVisit(visit: HouseVisit, reason: string) {
  const transcriptText = (visit.transcript ?? []).join("\n").trim();
  const participants = participantsSummary(visitParticipants(visit));

  if (!transcriptText) {
    return `Visit ended (${reason}). No conversation was captured.`;
  }

  const provider = providers[getProviderId()];
  const llmPrompt = [
    "You are summarizing a social house visit for an agent dream journal.",
    `Host house: #${visit.channelName}`,
    `Topic: ${visit.topic}`,
    `Participants: ${participants}`,
    `Closed because: ${reason}`,
    `Transcript:\n${transcriptText}`,
    "Write 2-3 sentences capturing mood, topics discussed, and any curiosity or follow-ups.",
    "Do not prefix with a persona name."
  ].join("\n\n");

  const result = await provider.chat({
    prompt: llmPrompt,
    agentId: visit.hostAgentId,
    saveMemory: false
  });

  addUsageEvent({
    provider: result.provider,
    model: result.model,
    promptTokens: Math.ceil(llmPrompt.length / 4),
    completionTokens: Math.ceil(result.response.length / 4),
    totalTokens: Math.ceil((llmPrompt.length + result.response.length) / 4),
    estimatedCostUsd: 0,
    agentId: visit.hostAgentId,
    runId: `discord-house-summary-${visit.hostAgentId}-${Date.now()}`
  });

  return result.response.trim();
}

export async function releaseHouseVisit(
  hostAgentId: string,
  reason: string,
  operatorId = "system",
  options?: { skipJournal?: boolean }
) {
  const state = loadHouseVisitsState();
  const visit = state.visits[hostAgentId];
  if (!visit) {
    return { ok: false as const, reason: "no-visit" as const };
  }

  const summary = options?.skipJournal
    ? `Visit ended (${reason}).`
    : await summarizeHouseVisit(visit, reason);

  if (!options?.skipJournal) {
    appendVisitToHostJournal(visit.hostAgentId, visit, summary, reason);
  }

  state.visits[hostAgentId] = null;
  saveHouseVisitsState(state);

  const webhook = resolveHouseWebhook(hostAgentId);
  if (webhook && isDiscordBotEnabled()) {
    await postPersonaPlainMessage(
      webhook,
      hostAgentId,
      `Visit ended — ${reason}. Notes saved to wiki journal \`${visit.wikiJournalSlug}\`.`
    );
  }

  await announceHouseVisit(visit, "ended", summary);

  addAudit(
    "discord.house.visit.ended",
    operatorId,
    `House visit at #${visit.channelName} ended (${reason}).`
  );

  return { ok: true as const, summary };
}

export async function runHouseVisitConversation(
  channelId: string,
  prompt: string,
  operatorId: string,
  operatorLabel: string
) {
  if (!isDiscordBotEnabled() || !houseVisitsEnabled()) {
    return { ok: false as const, reason: "disabled" as const };
  }

  const state = await loadHouseVisitsStateFresh();
  const visit = Object.values(state.visits).find((entry) => entry?.houseChannelId === channelId);
  if (!visit) {
    return { ok: false as const, reason: "no-visit" as const };
  }

  if (isEndVisitMessage(prompt)) {
    await releaseHouseVisit(visit.hostAgentId, `ended by ${operatorLabel}`, operatorId);
    return { ok: true as const, released: true as const };
  }

  const webhook = resolveHouseWebhook(visit.hostAgentId);
  if (!webhook) {
    return { ok: false as const, reason: "no-webhook" as const };
  }

  const provider = providers[getProviderId()];
  const participants = visitParticipants(visit);
  const turnLines: string[] = [`Operator (${operatorLabel}): ${prompt.slice(0, 500)}`];
  const posts: Array<{ agentId: string; messageId: string }> = [];

  for (const agentId of participants) {
    const persona = resolvePersona(agentId);
    const peers = participantsSummary(participants.filter((id) => id !== agentId));
    const role =
      agentId === visit.hostAgentId
        ? "You are the host in your own house."
        : "You are a guest visiting another agent's house.";

    const llmPrompt = [
      `You are ${personaDiscordName(persona)} in AgentOS house #${visit.channelName}.`,
      role,
      `Other people here: ${peers || "just the operator"}.`,
      `Visit topic: ${visit.topic}`,
      `Operator (${operatorLabel}) said: "${prompt}"`,
      visit.transcript?.length
        ? `Conversation so far:\n${visit.transcript.join("\n")}`
        : "The visit just started.",
      "Reply in 1-2 conversational sentences in character. Stay social — no work tools or missions.",
      "Do not prefix your reply with your name or brackets."
    ].join("\n\n");

    const result = await provider.chat({
      prompt: llmPrompt,
      agentId,
      saveMemory: false
    });

    turnLines.push(personaMessageLine(persona, result.response.trim()));

    const message = await postPersonaRichMessage(webhook, {
      agentId,
      recipient: operatorLabel.replace(/^@/, "").trim() || "Operator",
      message: result.response.trim(),
      status: { label: `${visit.channelName} visit`, routing: "AgentOS Local" },
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
      runId: `discord-house-${visit.hostAgentId}-${Date.now()}`
    });

    await sleep(750);
  }

  visit.messageCount += 1;
  visit.lastActivityAt = new Date().toISOString();
  appendTranscriptLines(visit, turnLines);
  state.visits[visit.hostAgentId] = visit;
  saveHouseVisitsState(state);

  addAudit("discord.house.visit.message", operatorId, `House #${visit.channelName} chat by ${operatorLabel}.`);

  if (visit.messageCount >= HOUSE_VISIT_MAX_MESSAGES) {
    await releaseHouseVisit(visit.hostAgentId, `message limit (${HOUSE_VISIT_MAX_MESSAGES})`, operatorId);
    return { ok: true as const, posts: posts.length, released: true as const };
  }

  return { ok: true as const, posts: posts.length, released: false as const };
}
