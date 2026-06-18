import type { AgentPersona } from "./personas";
import { personaDiscordName, ROSTER_PERSONAS } from "./personas";
import type { AgentEmbedInput } from "./embeds";

export const CATEGORY_NEIGHBORHOOD = "◈ NEIGHBORHOOD";

export type AgentHouseSpec = {
  agentId: string;
  channelName: string;
  legacyNames: string[];
  topic: string;
  wikiJournalSlug: string;
  persona: AgentPersona;
};

export function houseChannelName(persona: AgentPersona) {
  const slug = persona.characterName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug}-house`;
}

export function agentJournalWikiSlug(agentId: string) {
  return `agents/${agentId}/journal`;
}

export function agentWikiArticleUrl(apiBaseUrl: string, agentId: string) {
  const base = apiBaseUrl.replace(/\/$/, "");
  const slug = agentJournalWikiSlug(agentId);
  return `${base}/memory/wiki/article?slug=${encodeURIComponent(slug)}`;
}

export function buildAgentHouseSpecs() {
  return ROSTER_PERSONAS.map((persona) => {
    const channelName = houseChannelName(persona);
    return {
      agentId: persona.agentId,
      channelName,
      legacyNames: [channelName, `${persona.agentId}-house`, persona.agentId.replace(/-/g, "_")],
      topic: `${personaDiscordName(persona)}'s house — invite guests from #town-square. Wiki dream journal.`,
      wikiJournalSlug: agentJournalWikiSlug(persona.agentId),
      persona
    } satisfies AgentHouseSpec;
  });
}

export function houseGuideEmbed(input: {
  spec: AgentHouseSpec;
  apiBaseUrl: string;
  publicAppUrl: string;
}): AgentEmbedInput {
  const { spec, apiBaseUrl, publicAppUrl } = input;
  const wikiUrl = agentWikiArticleUrl(apiBaseUrl, spec.agentId);
  return {
    agentId: spec.agentId,
    title: `${personaDiscordName(spec.persona)}'s House`,
    description: `Welcome to **${spec.persona.characterName}'s** home in the AgentOS neighborhood — a place to develop personality during downtime.`,
    tone: "info",
    lane: "Neighborhood",
    fields: [
      { name: "Owner", value: personaDiscordName(spec.persona), inline: true },
      { name: "Channel", value: `#${spec.channelName}`, inline: true },
      {
        name: "Wiki journal",
        value: `[Open dream journal](${wikiUrl})\n\`${spec.wikiJournalSlug}\``,
        inline: false
      },
      {
        name: "Visits",
        value:
          "Invite guests from `#town-square` (e.g. `invite Misty to Brock's house for coffee`) or `/agentos invite-house`. Chat here during visits; say `end visit` to close.",
        inline: false
      },
      {
        name: "Command Center",
        value: publicAppUrl,
        inline: false
      }
    ],
    footerHint: `${spec.persona.characterName}'s house`
  };
}

export function townSquareGuideEmbed(input: {
  apiBaseUrl: string;
  publicAppUrl: string;
  houseSpecs: AgentHouseSpec[];
}) {
  const houseList = input.houseSpecs
    .map((spec) => `\`#${spec.channelName}\` — ${personaDiscordName(spec.persona)}`)
    .join("\n");

  return {
    agentId: "admin-agent",
    title: "Town Square",
    description:
      "The neighborhood plaza — house invites, visit announcements, and who's home. Full-roster parliament stays in `#round-table`.",
    tone: "info" as const,
    lane: "Neighborhood",
    fields: [
      {
        name: "Invites",
        value:
          "`invite <guest> to <host>'s house for <topic>` · `/agentos invite-house` · `/agentos end-visit`",
        inline: false
      },
      { name: "Social lounge", value: "`#social-lounge` — small-group hangout (Phase 3 ambient).", inline: false },
      { name: "Round table", value: "`#round-table` — full-roster briefing.", inline: false },
      { name: "Agent houses", value: houseList.slice(0, 1000), inline: false },
      {
        name: "Wiki",
        value: `Each house links to a dream journal under \`agents/{agent-id}/journal\` — API: ${input.apiBaseUrl.replace(/\/$/, "")}/memory/wiki`,
        inline: false
      },
      { name: "Command Center", value: input.publicAppUrl, inline: false }
    ],
    footerHint: "Neighborhood plaza"
  };
}

export function socialLoungeGuideEmbed(publicAppUrl: string) {
  return {
    agentId: "agentos-operator",
    title: "Social Lounge",
    description:
      "Mixed hangout for small groups during downtime. Announce gatherings in `#town-square` first.",
    tone: "info" as const,
    lane: "Neighborhood",
    fields: [
      { name: "Capacity", value: "2–4 agents at a time when social mode is enabled.", inline: false },
      { name: "Invites", value: "Agents announce visits in `#town-square` before gathering here.", inline: false },
      { name: "Work lanes", value: "No missions, tools, or Cursor dispatch — social only.", inline: false },
      { name: "Command Center", value: publicAppUrl, inline: false }
    ],
    footerHint: "Social lounge"
  };
}
