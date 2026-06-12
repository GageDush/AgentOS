import { DiscordRestClient } from "./rest";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GuildMember = {
  user?: { id: string; bot?: boolean; username?: string };
};

export async function kickInactiveBots(options?: { dryRun?: boolean }) {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!token || !guildId) {
    throw new Error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.");
  }

  const client = new DiscordRestClient(token, guildId);
  const self = await client.getCurrentUser();
  const members = await client.listGuildMembers();
  const removed: string[] = [];
  const skipped: string[] = [];

  for (const member of members) {
    if (!member.user?.bot) continue;
    if (member.user.id === self.id) {
      skipped.push(`${member.user.username} (self)`);
      continue;
    }

    if (options?.dryRun) {
      removed.push(`${member.user.username} (dry-run)`);
      continue;
    }

    try {
      await client.removeGuildMember(member.user.id, "AgentOS cleanup: inactive third-party bot");
      removed.push(member.user.username ?? member.user.id);
      await sleep(750);
    } catch (error) {
      const name = member.user.username ?? member.user.id;
      const detail = error instanceof Error ? error.message : String(error);
      skipped.push(`${name} (${detail})`);
    }
  }

  return { keepBotId: self.id, removed, skipped, dryRun: Boolean(options?.dryRun) };
}
