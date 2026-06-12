import { loadDiscordGuildState } from "./bootstrap";

/** Discord user IDs allowed to use the private operator-command channel. */
export function getAuthorizedOperatorDiscordIds(): string[] {
  const owner =
    process.env.DISCORD_OWNER_USER_ID?.trim() || process.env.DISCORD_ADMIN_USER_ID?.trim();
  const extra = process.env.DISCORD_OPERATOR_USER_IDS?.trim();
  const ids = new Set<string>();
  if (owner) ids.add(owner);
  if (extra) {
    for (const part of extra.split(/[,\s]+/)) {
      const id = part.trim();
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

export function isAuthorizedDiscordOperator(discordUserId: string | undefined): boolean {
  if (!discordUserId) return false;
  const allowed = getAuthorizedOperatorDiscordIds();
  if (allowed.length === 0) return false;
  return allowed.includes(discordUserId);
}

export function resolveOperatorCommandChannelId(): string | undefined {
  return loadDiscordGuildState()?.channels?.operatorCommand;
}

/** Default owner prompt lane — prefers #cursor when configured. */
export function resolveDefaultOperatorPromptChannelKey(): "cursor" | "operatorCommand" {
  const env = process.env.DISCORD_OPERATOR_PROMPT_CHANNEL?.trim().toLowerCase();
  if (env === "operator-command" || env === "operatorcommand") return "operatorCommand";
  const state = loadDiscordGuildState();
  if (!env || env === "cursor") {
    if (state?.channels?.cursor) return "cursor";
  }
  return "operatorCommand";
}

export function resolveDefaultOperatorPromptChannelId(): string | undefined {
  const state = loadDiscordGuildState();
  if (!state?.channels) return undefined;
  const key = resolveDefaultOperatorPromptChannelKey();
  return state.channels[key];
}

export function resolveDefaultOperatorPromptWebhook(): string | undefined {
  const state = loadDiscordGuildState();
  if (!state?.webhooks) return undefined;
  const key = resolveDefaultOperatorPromptChannelKey();
  return state.webhooks[key];
}
