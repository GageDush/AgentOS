import {
  KEEP_MEMBER_ROLE_NAMES,
  PERSONA_ROLE_KEYS,
  PERSONA_ROLE_LEGACY,
  personaDiscordName,
  resolvePersona,
  type AgentPersonaRoleKey
} from "./personas";
import { ROLE_SPECS, type AgentOsRoleKey } from "./layout";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "@agentos/persistence";
import { DiscordRestClient, webhookUrl, type DiscordRole } from "./rest";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function keepRoleNames() {
  const names = new Set<string>([...KEEP_MEMBER_ROLE_NAMES]);
  for (const key of Object.keys(ROLE_SPECS) as AgentOsRoleKey[]) {
    names.add(ROLE_SPECS[key].name);
  }
  return names;
}

export async function ensurePersonaRoles(client: DiscordRestClient, roles: DiscordRole[]) {
  const roleIds: Partial<Record<AgentOsRoleKey, string>> = {};
  const personaProfiles: Record<string, { roleId: string; discordName: string; characterName: string }> = {};

  for (const key of Object.keys(ROLE_SPECS) as AgentOsRoleKey[]) {
    const spec = ROLE_SPECS[key];
    const legacyNames =
      key in PERSONA_ROLE_KEYS
        ? [spec.name, ...PERSONA_ROLE_LEGACY[key as AgentPersonaRoleKey]]
        : [spec.name];

    const existing = roles.find(
      (role) => role.name === spec.name || legacyNames.some((name) => name === role.name)
    );
    if (existing) {
      await client.patchRole(existing.id, {
        name: spec.name,
        color: spec.color,
        hoist: spec.hoist,
        mentionable: false
      });
      roleIds[key] = existing.id;
    } else {
      const created = await client.createRole({
        name: spec.name,
        color: spec.color,
        hoist: spec.hoist,
        mentionable: false
      });
      roleIds[key] = created.id;
    }

    if (key in PERSONA_ROLE_KEYS) {
      const persona = resolvePersona(PERSONA_ROLE_KEYS[key as AgentPersonaRoleKey]);
      personaProfiles[persona.agentId] = {
        roleId: roleIds[key]!,
        discordName: personaDiscordName(persona),
        characterName: persona.characterName
      };
    }
  }

  return { roleIds, personaProfiles };
}

export async function cleanupLegacyRoles(client: DiscordRestClient, roles: DiscordRole[]) {
  const keepNames = keepRoleNames();
  const removed: string[] = [];

  for (const role of roles) {
    if (role.managed) continue;
    if (role.name === "@everyone") continue;
    if (keepNames.has(role.name)) continue;

    try {
      await client.deleteRole(role.id);
      removed.push(role.name);
      await sleep(200);
    } catch {
      // Role may be assigned above bot or protected.
    }
  }

  return removed;
}

function guildStatePath() {
  return join(findRepoRoot(process.cwd()), ".agentos", "state", "discord-guild.json");
}

function loadGuildStateFile() {
  const path = guildStatePath();
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

async function ensureChatWebhook(client: DiscordRestClient, generalChannelId?: string) {
  if (!generalChannelId) return undefined;
  const hooks = await client.listWebhooks(generalChannelId);
  const existing = hooks.find((hook) => hook.name === "agentos-chat");
  if (existing) return webhookUrl(existing);
  const created = await client.createWebhook(generalChannelId, "agentos-chat");
  return webhookUrl(created);
}

export async function syncDiscordRoles() {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!token || !guildId) {
    throw new Error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.");
  }

  const client = new DiscordRestClient(token, guildId);
  const roles = await client.listRoles();
  const ensured = await ensurePersonaRoles(client, roles);
  const removed = await cleanupLegacyRoles(client, await client.listRoles());

  const existing = loadGuildStateFile();
  const channels = existing?.channels as { general?: string } | undefined;
  const webhooks = (existing?.webhooks as Record<string, string> | undefined) ?? {};
  const generalWebhook = webhooks.general ?? (await ensureChatWebhook(client, channels?.general));

  if (existing) {
    const path = guildStatePath();
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(
      path,
      `${JSON.stringify(
        {
          ...existing,
          roles: ensured.roleIds,
          personas: ensured.personaProfiles,
          removedRoles: removed,
          ...(generalWebhook ? { webhooks: { ...webhooks, general: generalWebhook } } : {})
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  return {
    roles: ensured.roleIds,
    personas: ensured.personaProfiles,
    removed,
    ...(generalWebhook ? { generalWebhook: true } : {})
  };
}
