import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "@agentos/persistence";
import { AGENTOS_EMOJI_SET, AGENTOS_GUILD_ICON, pngDataUri } from "./artwork";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
import { buildActionRows } from "./components";
import { buildAgentEmbed } from "./embeds";
import {
  AGENTOS_ROOT_COMMAND,
  CATEGORY_BRIEFING,
  CATEGORY_LOUNGE,
  CATEGORY_OPS,
  CATEGORY_START,
  STREAMLINED_LAYOUT,
  type AgentOsChannelKey,
  type AgentOsRoleKey
} from "./layout";
import { ROSTER_PERSONAS, personaDiscordName } from "./personas";
import { kickInactiveBots } from "./bots";
import { cleanupLegacyRoles, ensurePersonaRoles } from "./roles";
import { DiscordRestClient, webhookUrl, type DiscordChannel } from "./rest";

export type DiscordGuildState = {
  guildId: string;
  guildName: string;
  applicationId: string;
  categories: {
    start: string;
    ops: string;
    briefing: string;
    lounge: string;
  };
  channels: Record<AgentOsChannelKey, string>;
  roles: Partial<Record<AgentOsRoleKey, string>>;
  personas: Record<string, { roleId: string; discordName: string; characterName: string }>;
  webhooks: Partial<
    Record<
      | "status"
      | "approvals"
      | "missions"
      | "opsFeed"
      | "general"
      | "roundTable"
      | "chatRoom1"
      | "chatRoom2"
      | "chatRoom3",
      string
    >
  >;
  emojis: Record<string, string>;
  removedRoles?: string[];
  kickedBots?: { keepBotId: string; removed: string[]; skipped: string[] };
  bootstrappedAt: string;
  layoutVersion: number;
};

const LAYOUT_VERSION = 5;

function statePath() {
  return join(findRepoRoot(process.cwd()), ".agentos", "state", "discord-guild.json");
}

export function loadDiscordGuildState(): DiscordGuildState | null {
  const path = statePath();
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as DiscordGuildState;
}

function saveState(state: DiscordGuildState) {
  const path = statePath();
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function resolveByNames<T extends { name: string; id: string; type?: number }>(
  items: T[],
  names: string[],
  type?: number
) {
  const normalized = new Map(items.map((item) => [item.name.toLowerCase(), item]));
  for (const name of names) {
    const hit = normalized.get(name.toLowerCase());
    if (hit && (type === undefined || hit.type === type)) return hit;
  }
  if (type !== undefined) {
    return items.find((item) => item.type === type && names.some((name) => item.name.toLowerCase() === name.toLowerCase()));
  }
  return undefined;
}

async function ensureCategory(client: DiscordRestClient, channels: DiscordChannel[], name: string) {
  const existing = channels.find((channel) => channel.type === 4 && channel.name === name);
  if (existing) return existing.id;
  const created = await client.createChannel({ name, type: 4 });
  return created.id;
}

async function ensureStreamlinedChannel(
  client: DiscordRestClient,
  channels: DiscordChannel[],
  key: AgentOsChannelKey,
  categoryIds: Record<"start" | "ops" | "briefing" | "lounge", string>
) {
  const spec = STREAMLINED_LAYOUT[key];
  const categoryId =
    spec.category === CATEGORY_START
      ? categoryIds.start
      : spec.category === CATEGORY_OPS
        ? categoryIds.ops
        : spec.category === CATEGORY_BRIEFING
          ? categoryIds.briefing
          : categoryIds.lounge;

  const existing = resolveByNames(channels, [spec.name, ...spec.legacyNames], spec.type);
  if (existing) {
    await client.patchChannel(existing.id, {
      name: spec.name,
      parent_id: categoryId,
      ...(spec.type !== 2 ? { topic: spec.topic } : {})
    });
    return existing.id;
  }

  const created = await client.createChannel({
    name: spec.name,
    type: spec.type,
    parent_id: categoryId,
    ...(spec.type !== 2 ? { topic: spec.topic } : {})
  });
  return created.id;
}

async function ensureWebhook(client: DiscordRestClient, channelId: string, name: string) {
  const hooks = await client.listWebhooks(channelId);
  const existing = hooks.find((hook) => hook.name === name);
  if (existing) return webhookUrl(existing);
  const created = await client.createWebhook(channelId, name);
  return webhookUrl(created);
}

async function refreshArtwork(client: DiscordRestClient) {
  await client.patchGuild({ icon: AGENTOS_GUILD_ICON() });
  const existing = await client.listEmojis();
  for (const emoji of existing.filter((item) => !item.managed)) {
    await client.deleteEmoji(emoji.id);
    await sleep(350);
  }
  const emojiIds: Record<string, string> = {};
  for (const spec of AGENTOS_EMOJI_SET) {
    const created = (await client.createEmoji(
      spec.name,
      pngDataUri(128, spec.glyph, spec.accent)
    )) as { id: string; name: string };
    emojiIds[created.name] = created.id;
    await sleep(350);
  }
  return emojiIds;
}

function hubEmbed(publicAppUrl: string, apiBaseUrl: string) {
  return buildAgentEmbed({
    agentId: "admin-agent",
    title: "Welcome to AgentOS HQ",
    description: "Four zones. Ops, briefing, and chat — all routed through AgentOS.",
    tone: "info",
    fields: [
      { name: "Start", value: "`#welcome` `#rules` `#announcements`", inline: false },
      { name: "Ops", value: "`#status` `#approvals` `#missions` `#ops-feed`", inline: false },
      {
        name: "Briefing",
        value: "`#round-table` — full roster · `#chat-room-1` `#chat-room-2` `#chat-room-3` — focused 1–3 agent side chats",
        inline: false
      },
      { name: "Chat", value: "`#general` for operator LLM chat · `/agentos chat` · `/agentos briefing`", inline: false },
      { name: "Agent roster", value: ROSTER_PERSONAS.map((p) => personaDiscordName(p)).join("\n"), inline: false },
      { name: "Command Center", value: publicAppUrl, inline: false },
      { name: "API", value: apiBaseUrl, inline: false }
    ],
    footerHint: "Neural link ready"
  });
}

function roundTableEmbed() {
  return buildAgentEmbed({
    agentId: "admin-agent",
    title: "Round-table briefing",
    description: "All agents meet here in character to socialize, ask each other questions, and develop personality.",
    tone: "info",
    fields: [
      { name: "How it works", value: "Post a topic or question — each agent replies as their profile (e.g. `[Admin] Ash: ...`).", inline: false },
      {
        name: "Chat rooms",
        value: "Agents can reserve `#chat-room-1`–`3` from here (e.g. \"I'll take chat room 2 with Brock\"). Side chats stay focused on 1–3 agents.",
        inline: false
      },
      { name: "Slash", value: "`/agentos briefing topic:...` · `/agentos reserve-room room:1 topic:...`", inline: false },
      { name: "Roster", value: ROSTER_PERSONAS.map((p) => personaDiscordName(p)).join("\n"), inline: false }
    ],
    footerHint: "Briefing room open"
  });
}

function statusEmbed(publicAppUrl: string) {
  return buildAgentEmbed({
    agentId: "admin-agent",
    title: "System pulse",
    description: "Live AgentOS telemetry posts here. Use buttons to refresh or mark seen.",
    tone: "info",
    fields: [{ name: "Command Center", value: publicAppUrl, inline: false }],
    footerHint: "Pulse channel"
  });
}

export async function restructureDiscordGuild(options?: { dryRun?: boolean }) {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  const applicationId = process.env.DISCORD_APPLICATION_ID?.trim();
  if (!token || !guildId) {
    throw new Error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.");
  }

  const client = new DiscordRestClient(token, guildId);
  const guild = await client.getGuild();
  let channels = await client.listChannels();
  const roles = await client.listRoles();
  const resolvedApplicationId = applicationId || (await client.getApplication()).id;

  if (options?.dryRun) {
    return {
      dryRun: true,
      guildId,
      guildName: String(guild.name ?? "unknown"),
      currentChannels: channels.length,
      targetChannels: Object.keys(STREAMLINED_LAYOUT).length,
      targetCategories: 4
    };
  }

  const categoryIds = {
    start: await ensureCategory(client, channels, CATEGORY_START),
    ops: await ensureCategory(client, channels, CATEGORY_OPS),
    briefing: await ensureCategory(client, channels, CATEGORY_BRIEFING),
    lounge: await ensureCategory(client, channels, CATEGORY_LOUNGE)
  };

  channels = await client.listChannels();
  const channelIds = {} as Record<AgentOsChannelKey, string>;
  for (const key of Object.keys(STREAMLINED_LAYOUT) as AgentOsChannelKey[]) {
    channelIds[key] = await ensureStreamlinedChannel(client, channels, key, categoryIds);
  }

  const keepIds = new Set<string>([
    ...Object.values(categoryIds),
    ...Object.values(channelIds)
  ]);

  for (const channel of channels) {
    if (keepIds.has(channel.id)) continue;
    try {
      await client.deleteChannel(channel.id);
      await sleep(150);
    } catch {
      // Some system channels may resist deletion; continue cleanup.
    }
  }

  const { roleIds, personaProfiles } = await ensurePersonaRoles(client, roles);
  const removedRoles = await cleanupLegacyRoles(client, await client.listRoles());
  const kickedBots = await kickInactiveBots();

  const webhooks = {
    status: await ensureWebhook(client, channelIds.status, "agentos-status"),
    approvals: await ensureWebhook(client, channelIds.approvals, "agentos-approvals"),
    missions: await ensureWebhook(client, channelIds.missions, "agentos-missions"),
    opsFeed: await ensureWebhook(client, channelIds.opsFeed, "agentos-ops-feed"),
    general: await ensureWebhook(client, channelIds.general, "agentos-chat"),
    roundTable: await ensureWebhook(client, channelIds.roundTable, "agentos-round-table"),
    chatRoom1: await ensureWebhook(client, channelIds.chatRoom1, "agentos-chat-room-1"),
    chatRoom2: await ensureWebhook(client, channelIds.chatRoom2, "agentos-chat-room-2"),
    chatRoom3: await ensureWebhook(client, channelIds.chatRoom3, "agentos-chat-room-3")
  };

  const emojis = await refreshArtwork(client);
  await client.putGlobalCommands(resolvedApplicationId, []);
  await client.putGuildCommands(resolvedApplicationId, [AGENTOS_ROOT_COMMAND]);

  const publicAppUrl = process.env.AGENTOS_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const apiBaseUrl = process.env.AGENTOS_API_BASE_URL?.trim() || `http://127.0.0.1:${process.env.AGENTOS_API_PORT ?? 8787}`;

  await client.patchGuild({
    name: "AgentOS HQ",
    description: "AgentOS command plane — ops, round-table briefing, approvals, and mobile control.",
    icon: AGENTOS_GUILD_ICON(),
    rules_channel_id: channelIds.rules,
    system_channel_id: channelIds.status,
    widget_channel_id: channelIds.status,
    public_updates_channel_id: channelIds.announcements,
    afk_channel_id: channelIds.voice,
    afk_timeout: 300
  });

  await client.createMessage(channelIds.welcome, {
    embeds: [hubEmbed(publicAppUrl, apiBaseUrl)],
    components: buildActionRows([
      { action: "refresh_status", label: "Run pulse", style: "primary", emoji: "🛰️" },
      { action: "ack", label: "Mark seen", style: "secondary", emoji: "👁️" }
    ])
  });
  await client.createMessage(channelIds.status, {
    embeds: [statusEmbed(publicAppUrl)],
    components: buildActionRows([
      { action: "refresh_status", label: "Refresh pulse", style: "primary", emoji: "🛰️" },
      { action: "ack", label: "Mark seen", style: "secondary", emoji: "👁️" }
    ])
  });

  await client.createMessage(channelIds.roundTable, {
    embeds: [roundTableEmbed()]
  });

  const state: DiscordGuildState = {
    guildId,
    guildName: "AgentOS HQ",
    applicationId: resolvedApplicationId,
    categories: categoryIds,
    channels: channelIds,
    roles: roleIds,
    personas: personaProfiles,
    webhooks,
    emojis,
    removedRoles,
    kickedBots,
    bootstrappedAt: new Date().toISOString(),
    layoutVersion: LAYOUT_VERSION
  };

  saveState(state);
  return state;
}

export async function syncDiscordCommands() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  const applicationId = process.env.DISCORD_APPLICATION_ID?.trim();
  if (!token || !guildId) {
    throw new Error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.");
  }
  const client = new DiscordRestClient(token, guildId);
  const resolvedApplicationId = applicationId || (await client.getApplication()).id;
  await client.putGlobalCommands(resolvedApplicationId, []);
  await client.putGuildCommands(resolvedApplicationId, [AGENTOS_ROOT_COMMAND]);
  return { applicationId: resolvedApplicationId, command: AGENTOS_ROOT_COMMAND.name };
}

export async function bootstrapDiscordGuild(options?: { dryRun?: boolean }) {
  return restructureDiscordGuild(options);
}

export { syncDiscordRoles } from "./roles";
export { postChannelGuides } from "./channel-guides";
export { kickInactiveBots } from "./bots";
