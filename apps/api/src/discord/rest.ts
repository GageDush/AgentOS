const DISCORD_API = "https://discord.com/api/v10";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
  topic?: string | null;
};

export type DiscordRole = {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  permissions: string;
  managed: boolean;
  position: number;
};

export type DiscordWebhook = {
  id: string;
  token: string;
  name: string;
  channel_id: string;
};

export type GuildMember = {
  user?: { id: string; bot?: boolean; username?: string };
};

export class DiscordRestClient {
  constructor(
    private readonly token: string,
    private readonly guildId: string
  ) {}

  private headers(json = true) {
    return {
      Authorization: `Bot ${this.token}`,
      ...(json ? { "Content-Type": "application/json" } : {})
    };
  }

  private async request<T>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
    const response = await fetch(`${DISCORD_API}${path}`, {
      method,
      headers: this.headers(body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (response.status === 429 && attempt < 5) {
      const retry = (await response.json().catch(() => ({ retry_after: 1 }))) as { retry_after?: number };
      await sleep(Math.ceil((retry.retry_after ?? 1) * 1000) + 250);
      return this.request<T>(method, path, body, attempt + 1);
    }
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Discord ${method} ${path} failed (${response.status}): ${detail}`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  getGuild() {
    return this.request<Record<string, unknown>>("GET", `/guilds/${this.guildId}`);
  }

  patchGuild(body: Record<string, unknown>) {
    return this.request("PATCH", `/guilds/${this.guildId}`, body);
  }

  listChannels() {
    return this.request<DiscordChannel[]>("GET", `/guilds/${this.guildId}/channels`);
  }

  createChannel(body: Record<string, unknown>) {
    return this.request<DiscordChannel>("POST", `/guilds/${this.guildId}/channels`, body);
  }

  patchChannel(channelId: string, body: Record<string, unknown>) {
    return this.request<DiscordChannel>("PATCH", `/channels/${channelId}`, body);
  }

  listRoles() {
    return this.request<DiscordRole[]>("GET", `/guilds/${this.guildId}/roles`);
  }

  createRole(body: Record<string, unknown>) {
    return this.request<DiscordRole>("POST", `/guilds/${this.guildId}/roles`, body);
  }

  patchRole(roleId: string, body: Record<string, unknown>) {
    return this.request<DiscordRole>("PATCH", `/guilds/${this.guildId}/roles/${roleId}`, body);
  }

  createWebhook(channelId: string, name: string) {
    return this.request<DiscordWebhook>("POST", `/channels/${channelId}/webhooks`, { name });
  }

  listWebhooks(channelId: string) {
    return this.request<DiscordWebhook[]>("GET", `/channels/${channelId}/webhooks`);
  }

  createMessage(channelId: string, body: Record<string, unknown>) {
    return this.request<{ id: string; channel_id: string }>("POST", `/channels/${channelId}/messages`, body);
  }

  createForumThread(channelId: string, name: string, message: Record<string, unknown>) {
    return this.request<{ id: string; message?: { id: string } }>("POST", `/channels/${channelId}/threads`, {
      name: name.slice(0, 100),
      auto_archive_duration: 10080,
      message
    });
  }

  editMessage(channelId: string, messageId: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/channels/${channelId}/messages/${messageId}`, body);
  }

  addReaction(channelId: string, messageId: string, emoji: string) {
    const encoded = encodeURIComponent(emoji);
    return this.request("PUT", `/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`);
  }

  putGuildCommands(applicationId: string, commands: Record<string, unknown>[]) {
    return this.request("PUT", `/applications/${applicationId}/guilds/${this.guildId}/commands`, commands);
  }

  putGlobalCommands(applicationId: string, commands: Record<string, unknown>[]) {
    return this.request("PUT", `/applications/${applicationId}/commands`, commands);
  }

  getApplication() {
    return this.request<{ id: string; name: string }>("GET", "/oauth2/applications/@me");
  }

  getCurrentUser() {
    return this.request<{ id: string; username: string; bot?: boolean }>("GET", "/users/@me");
  }

  listGuildMembers(limit = 1000) {
    return this.request<GuildMember[]>("GET", `/guilds/${this.guildId}/members?limit=${limit}`);
  }

  removeGuildMember(userId: string, reason?: string) {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    return this.request("DELETE", `/guilds/${this.guildId}/members/${userId}${query}`);
  }

  deleteChannel(channelId: string) {
    return this.request("DELETE", `/channels/${channelId}`);
  }

  listEmojis() {
    return this.request<Array<{ id: string; name: string; managed: boolean }>>("GET", `/guilds/${this.guildId}/emojis`);
  }

  deleteEmoji(emojiId: string) {
    return this.request("DELETE", `/guilds/${this.guildId}/emojis/${emojiId}`);
  }

  deleteRole(roleId: string) {
    return this.request("DELETE", `/guilds/${this.guildId}/roles/${roleId}`);
  }

  createEmoji(name: string, image: string) {
    return this.request("POST", `/guilds/${this.guildId}/emojis`, { name, image });
  }
}

export function webhookUrl(webhook: DiscordWebhook) {
  return `https://discord.com/api/v10/webhooks/${webhook.id}/${webhook.token}`;
}
