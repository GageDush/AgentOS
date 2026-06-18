import { loadDiscordGuildState } from "./bootstrap";
import type { AgentOsChannelKey } from "./layout";
import { DiscordRestClient } from "./rest";

export function isDiscordBotEnabled() {
  return (process.env.FEATURE_DISCORD ?? "false") === "true" && Boolean(process.env.DISCORD_BOT_TOKEN?.trim());
}

export function getDiscordRestClient() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!token || !guildId) return null;
  return new DiscordRestClient(token, guildId);
}

export function resolveAgentOsChannelId(key: AgentOsChannelKey) {
  const state = loadDiscordGuildState();
  return state?.channels?.[key];
}

export function resolveAgentHouseChannelId(agentId: string) {
  const state = loadDiscordGuildState();
  return state?.houses?.[agentId]?.channelId;
}

export function resolveAgentHouse(agentId: string) {
  const state = loadDiscordGuildState();
  return state?.houses?.[agentId];
}
