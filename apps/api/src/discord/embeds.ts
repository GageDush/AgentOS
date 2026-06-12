import { AGENTOS_EMBED_THEME, AWAITING_EMOJI, DIVIDER, SEEN_EMOJI, agentAccentColor, agentDisplayName } from "./theme";

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
      text: `${SEEN_EMOJI} Agent synced • seen by ${input.seenBy}${stamp}`,
      icon_url: undefined
    };
  }
  return {
    text: `${AWAITING_EMOJI} ${input.footerHint ?? "Awaiting operator response"} • AgentOS Neural Link`
  };
}

export function buildAgentEmbed(input: AgentEmbedInput) {
  const descriptionParts = [
    `╭${DIVIDER}╮`,
    input.description?.trim(),
    `╰${DIVIDER}╯`
  ].filter(Boolean);

  return {
    color: toneColor(input.tone ?? "default", input.agentId),
    author: {
      name: agentDisplayName(input.agentId, input.agentName)
    },
    title: `▸ ${input.title}`,
    description: descriptionParts.join("\n"),
    fields: (input.fields ?? []).map((field) => ({
      name: `┃ ${field.name}`,
      value: field.value,
      inline: field.inline ?? false
    })),
    thumbnail: input.thumbnailUrl ? { url: input.thumbnailUrl } : undefined,
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
      text: `${SEEN_EMOJI} Agent synced • seen by ${seenBy} • ${seenAt}`
    }
  };
}
