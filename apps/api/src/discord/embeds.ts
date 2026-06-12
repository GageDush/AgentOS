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
  seenBy?: string;
  seenAt?: string;
  thumbnailUrl?: string;
  timestamp?: string | Date;
  /** When true, show the agent portrait as an embed thumbnail. */
  showPortrait?: boolean;
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

export function buildAgentEmbed(input: AgentEmbedInput) {
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
