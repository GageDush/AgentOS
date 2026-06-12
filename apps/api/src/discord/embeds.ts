import { resolveHttpAgentAvatarUrl } from "./agent-avatars";
import { AGENTOS_EMBED_THEME, AWAITING_EMOJI, SEEN_EMOJI, agentAccentColor, agentDisplayName } from "./theme";

export type AgentEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type AgentEmbedTone = "default" | "success" | "warning" | "danger" | "info";

export type AgentEmbedInput = {
  agentId?: string;
  agentName?: string;
  title: string;
  description?: string;
  fields?: AgentEmbedField[];
  tone?: AgentEmbedTone;
  footerHint?: string;
  /** Shown in placard author line, e.g. "Ops Feed". */
  lane?: string;
  seenBy?: string;
  seenAt?: string;
  thumbnailUrl?: string;
  timestamp?: string | Date;
  /** When true, show the agent portrait as an embed thumbnail. */
  showPortrait?: boolean;
  /** Use legacy compact embed instead of the HQ placard layout. */
  legacyEmbed?: boolean;
};

function toneColor(tone: AgentEmbedTone, agentId?: string) {
  switch (tone) {
    case "success":
      return AGENTOS_EMBED_THEME.matrixGreen;
    case "warning":
      return AGENTOS_EMBED_THEME.neonAmber;
    case "danger":
      return AGENTOS_EMBED_THEME.alertRed;
    case "info":
      return AGENTOS_EMBED_THEME.neonViolet;
    default:
      return agentAccentColor(agentId);
  }
}

function truncateSignalValue(value: string, max = 32) {
  const clean = value.replace(/`/g, "").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, 14)}…${clean.slice(-10)}`;
}

function placardHeadline(input: Pick<AgentEmbedInput, "title" | "tone">) {
  if (input.tone === "danger") return "⚠️ GATE ALERT";
  if (input.tone === "warning") return "🟡 OPS NOTICE";
  if (input.tone === "success") return "✅ OPS CLEAR";
  const title = input.title.toLowerCase();
  if (title.includes("gate failed") || title.includes("gate alert")) return "⚠️ GATE ALERT";
  if (title.includes("token")) return "📊 TOKEN SIGNAL";
  if (title.includes("pulse") || title.includes("status")) return "🛰️ STATUS SIGNAL";
  if (title.includes("audit") || title.includes("ops")) return "🛡️ OPS SIGNAL";
  return `🛡️ ${input.title.toUpperCase()}`;
}

function formatPlacardFields(fields?: AgentEmbedField[]) {
  if (!fields?.length) return [];
  const lookup = new Map(fields.map((field) => [field.name.toLowerCase(), field]));
  const formatted: AgentEmbedField[] = [];

  const event = lookup.get("event");
  const actor = lookup.get("actor");
  const mission = lookup.get("mission");

  if (event) {
    formatted.push({
      name: "📡 EVENT",
      value: `\`${truncateSignalValue(event.value, 36)}\``,
      inline: true
    });
  }
  if (actor) {
    formatted.push({
      name: "👤 ACTOR",
      value: `\`${truncateSignalValue(actor.value, 20)}\``,
      inline: true
    });
  }
  if (mission) {
    formatted.push({
      name: "🎯 MISSION",
      value: `\`${truncateSignalValue(mission.value, 40)}\``,
      inline: false
    });
  }

  for (const field of fields) {
    const key = field.name.toLowerCase();
    if (key === "event" || key === "actor" || key === "mission") continue;
    formatted.push({
      name: field.name.toUpperCase(),
      value: field.value,
      inline: field.inline ?? false
    });
  }

  return formatted;
}

function buildPlacardFooter(input: Pick<AgentEmbedInput, "footerHint" | "title" | "seenBy" | "seenAt">) {
  if (input.seenBy) {
    const stamp = input.seenAt ? ` • ${new Date(input.seenAt).toISOString()}` : "";
    return { text: `${SEEN_EMOJI} Seen by ${input.seenBy}${stamp}` };
  }
  const signal = truncateSignalValue(input.title, 24).toUpperCase();
  return {
    text: `SECURE. COORDINATE. DEPLOY. • ${signal} • AgentOS`
  };
}

function buildFooter(input: Pick<AgentEmbedInput, "footerHint" | "seenBy" | "seenAt">) {
  if (input.seenBy) {
    const stamp = input.seenAt ? ` • ${new Date(input.seenAt).toISOString()}` : "";
    return {
      text: `${SEEN_EMOJI} Seen by ${input.seenBy}${stamp}`,
      icon_url: undefined
    };
  }
  return {
    text: `${AWAITING_EMOJI} ${input.footerHint ?? "AgentOS"} • Neural Link`,
    icon_url: undefined
  };
}

export function buildAgentPlacardEmbed(input: AgentEmbedInput) {
  const avatarUrl = input.thumbnailUrl ?? resolveHttpAgentAvatarUrl(input.agentId);
  const lane = input.lane ?? input.footerHint ?? "Operations";
  const description = input.description?.trim();

  return {
    color: toneColor(input.tone ?? "default", input.agentId),
    author: {
      name: `AgentOS HQ • ${lane}`,
      ...(avatarUrl ? { icon_url: avatarUrl } : {})
    },
    title: placardHeadline(input),
    description: description || undefined,
    fields: formatPlacardFields(input.fields),
    thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
    footer: buildPlacardFooter(input),
    timestamp: input.timestamp
      ? typeof input.timestamp === "string"
        ? input.timestamp
        : input.timestamp.toISOString()
      : new Date().toISOString()
  };
}

export function buildAgentEmbed(input: AgentEmbedInput) {
  if (!input.legacyEmbed) {
    return buildAgentPlacardEmbed(input);
  }

  const avatarUrl = input.thumbnailUrl ?? resolveHttpAgentAvatarUrl(input.agentId);

  return {
    color: toneColor(input.tone ?? "default", input.agentId),
    author: {
      name: agentDisplayName(input.agentId, input.agentName),
      ...(avatarUrl ? { icon_url: avatarUrl } : {})
    },
    title: input.title,
    description: input.description?.trim() || undefined,
    fields: (input.fields ?? []).map((field) => ({
      name: field.name,
      value: field.value,
      inline: field.inline ?? false
    })),
    thumbnail:
      input.showPortrait && avatarUrl
        ? { url: avatarUrl }
        : undefined,
    footer: buildFooter(input),
    timestamp: input.timestamp
      ? typeof input.timestamp === "string"
        ? input.timestamp
        : input.timestamp.toISOString()
      : new Date().toISOString()
  };
}

export function withSeenState(
  embed: ReturnType<typeof buildAgentEmbed>,
  seenBy: string,
  seenAt = new Date().toISOString()
) {
  return {
    ...embed,
    color: AGENTOS_EMBED_THEME.neonViolet,
    footer: {
      text: `${SEEN_EMOJI} Seen by ${seenBy} • ${seenAt}`
    }
  };
}
