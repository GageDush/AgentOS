import { store } from "../store";
import { loadDiscordGuildState, patchDiscordGuildState } from "./bootstrap";
import { getDiscordRestClient } from "./client";
import { buildAgentEmbed } from "./embeds";
import {
  resolveDefaultOperatorPromptChannelId,
  resolveDefaultOperatorPromptWebhook
} from "./operator-auth";
import { personaDiscordName, resolvePersona } from "./personas";
import { editWebhookMessage, postPersonaWebhookMessage, postWebhookPayload } from "./webhook-post";
import { resolveHttpAgentAvatarUrl } from "./agent-avatars";

export const OPERATOR_LANE_STATUS_TITLE = "Operator lane status";

const READY_TOPIC = "🟢 Ready — send commands or questions";
const BUSY_TOPIC_PREFIX = "🟡 Busy — Cursor processing";

let activeTask: string | null = null;
let activeSince: string | null = null;
let syncInFlight: Promise<void> | undefined;

export function operatorLaneTaskLabel(content: string): string {
  const text = content.trim().replace(/^[!/]+/, "").trim();
  const lower = text.toLowerCase();
  if (!text) return "command";
  if (lower.startsWith("mission ")) return "mission";
  if (["approve", "deny", "pause", "resume", "retry", "qa", "security", "release"].some((v) => lower === v || lower.startsWith(`${v} `))) {
    return lower.split(/\s+/)[0] ?? "control";
  }
  return "chat";
}

export function isOperatorLaneBypassCommand(content: string): boolean {
  const lower = content.trim().replace(/^[!/]+/, "").trim().toLowerCase();
  return lower === "status" || lower.startsWith("status ");
}

export function getOperatorLaneStatus() {
  const runningRuns = store.missionRuns.filter((run) => run.status === "running").length;
  const busy = activeTask !== null || runningRuns > 0;
  return {
    ready: !busy,
    activeTask,
    activeSince,
    runningRuns,
    topic: busy ? formatBusyTopic(activeTask, runningRuns) : READY_TOPIC
  };
}

export function isOperatorLaneBusy(): boolean {
  return !getOperatorLaneStatus().ready;
}

function formatBusyTopic(task: string | null, runningRuns: number): string {
  if (task) {
    return `${BUSY_TOPIC_PREFIX} (${task}) — please wait`;
  }
  if (runningRuns > 0) {
    return `${BUSY_TOPIC_PREFIX} (${runningRuns} run${runningRuns === 1 ? "" : "s"}) — please wait`;
  }
  return `${BUSY_TOPIC_PREFIX} — please wait`;
}

function buildStatusEmbed() {
  const status = getOperatorLaneStatus();
  const tone = status.ready ? "success" : "warning";
  const headline = status.ready ? "🟢 Ready" : "🟡 Busy — please wait";
  const description = status.ready
    ? "Safe to send commands and questions. Cursor is idle on this lane."
    : "Hold new commands until the current work finishes. `status` still works while busy.";

  const fields = [
    {
      name: "Lane",
      value: status.activeTask ? `Processing **${status.activeTask}**` : "Idle",
      inline: true
    },
    {
      name: "Running runs",
      value: String(status.runningRuns),
      inline: true
    }
  ];

  if (status.activeSince) {
    fields.push({
      name: "Since",
      value: `<t:${Math.floor(new Date(status.activeSince).getTime() / 1000)}:R>`,
      inline: true
    });
  }

  return buildAgentEmbed({
    agentId: "admin-agent",
    title: OPERATOR_LANE_STATUS_TITLE,
    description: `${headline}\n\n${description}`,
    fields,
    tone,
    lane: "Cursor",
    footerHint: status.ready ? "Ready for input" : "Cursor busy",
    showPortrait: true
  });
}

function operatorPromptWebhook() {
  return resolveDefaultOperatorPromptWebhook();
}

async function upsertStatusWebhookMessage(channelId: string, embed: ReturnType<typeof buildAgentEmbed>) {
  const webhook = operatorPromptWebhook();
  const client = getDiscordRestClient();
  const persona = resolvePersona("admin-agent");
  const avatarUrl = resolveHttpAgentAvatarUrl("admin-agent");
  const payload = {
    username: personaDiscordName(persona),
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    embeds: [embed]
  };

  const messageId = client ? await resolveStatusMessageId(channelId, client) : loadDiscordGuildState()?.operatorLaneStatusMessageId;

  if (webhook && messageId) {
    try {
      await editWebhookMessage(webhook, messageId, payload);
      return messageId;
    } catch {
      patchDiscordGuildState({ operatorLaneStatusMessageId: undefined });
    }
  }

  if (webhook) {
    const created = await postWebhookPayload(webhook, payload);
    patchDiscordGuildState({ operatorLaneStatusMessageId: created.id });
    if (client) {
      try {
        await client.pinMessage(channelId, created.id);
      } catch {
        // Pin is optional.
      }
    }
    return created.id;
  }

  if (!client) return undefined;
  if (messageId) {
    try {
      await client.editMessage(channelId, messageId, { embeds: [embed] });
      return messageId;
    } catch {
      patchDiscordGuildState({ operatorLaneStatusMessageId: undefined });
    }
  }

  const created = await client.createMessage(channelId, { embeds: [embed] });
  patchDiscordGuildState({ operatorLaneStatusMessageId: created.id });
  try {
    await client.pinMessage(channelId, created.id);
  } catch {
    // Pin is optional.
  }
  return created.id;
}

export async function syncOperatorLaneIndicator(channelId?: string) {
  const resolvedChannelId = channelId ?? resolveDefaultOperatorPromptChannelId();
  if (!resolvedChannelId) return;

  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = (async () => {
    const client = getDiscordRestClient();
    if (!client) return;

    const status = getOperatorLaneStatus();
    const topic = (status.ready ? READY_TOPIC : status.topic).slice(0, 1024);

    try {
      await client.patchChannel(resolvedChannelId, { topic });
    } catch {
      // Channel topic is best-effort visibility.
    }

    const embed = buildStatusEmbed();
    await upsertStatusWebhookMessage(resolvedChannelId, embed);
  })();

  try {
    await syncInFlight;
  } finally {
    syncInFlight = undefined;
  }
}

async function resolveStatusMessageId(
  channelId: string,
  client: NonNullable<ReturnType<typeof getDiscordRestClient>>
) {
  const stored = loadDiscordGuildState()?.operatorLaneStatusMessageId;
  if (stored) return stored;

  const pins = await client.getPinnedMessages(channelId).catch(() => []);
  const match = pins.find((message) => {
    const embed = message.embeds?.[0];
    return embed?.title?.includes(OPERATOR_LANE_STATUS_TITLE);
  });
  if (match?.id) {
    patchDiscordGuildState({ operatorLaneStatusMessageId: match.id });
    return match.id;
  }
  return undefined;
}

export async function ensureOperatorLaneIndicator(channelId?: string) {
  await syncOperatorLaneIndicator(channelId);
}

export async function replyOperatorLaneBusyNotice(channelId: string) {
  const status = getOperatorLaneStatus();
  const webhook = operatorPromptWebhook();

  const detail = status.activeTask
    ? `Cursor is handling **${status.activeTask}** on this lane.`
    : status.runningRuns > 0
      ? `Cursor is busy with **${status.runningRuns}** active run${status.runningRuns === 1 ? "" : "s"}.`
      : "Cursor is busy on this lane.";

  const input = {
    agentId: "admin-agent",
    title: "Please wait",
    description: `${detail}\n\nCheck the pinned **${OPERATOR_LANE_STATUS_TITLE}** embed or channel topic. Send \`status\` anytime.`,
    tone: "warning" as const,
    footerHint: "Lane busy",
    showPortrait: true
  };

  if (webhook) {
    await postPersonaWebhookMessage(webhook, input);
    return;
  }

  const client = getDiscordRestClient();
  if (!client) return;
  await client.createMessage(channelId, { embeds: [buildAgentEmbed(input)] });
}

export async function withOperatorLaneBusy<T>(
  _channelId: string,
  taskLabel: string,
  work: () => Promise<T>
): Promise<T> {
  activeTask = taskLabel;
  activeSince = new Date().toISOString();
  await syncOperatorLaneIndicator();
  try {
    return await work();
  } finally {
    activeTask = null;
    activeSince = null;
    await syncOperatorLaneIndicator();
  }
}

export function formatOperatorLaneStatusLine(): string {
  const status = getOperatorLaneStatus();
  if (status.ready) {
    return "Operator lane: **ready** (safe to send commands and questions)";
  }
  const parts = ["Operator lane: **busy** — please wait"];
  if (status.activeTask) parts.push(`active: \`${status.activeTask}\``);
  if (status.runningRuns > 0) parts.push(`running runs: **${status.runningRuns}**`);
  return parts.join(" · ");
}
