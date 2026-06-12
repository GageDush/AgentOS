import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const envPath = join(root, ".env");
const guildStatePath = join(root, ".agentos", "state", "discord-guild.json");

const env = {};
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
}

const apiPort = env.AGENTOS_API_PORT ?? "8787";
const apiBase = `http://127.0.0.1:${apiPort}`;
const prodApiBase = (env.AGENTOS_API_BASE_URL ?? "https://api.flous.dev").replace(/\/$/, "");
const botToken = env.DISCORD_BOT_TOKEN?.trim();
const guildId = env.DISCORD_GUILD_ID?.trim();
const liveSmoke = env.DISCORD_LIVE_SMOKE === "1" || env.DISCORD_LIVE_SMOKE === "true";

const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

async function discordFetch(path, init = {}) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new Error(`Discord API ${path} HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return response.json();
}

function loadGuildState() {
  if (!existsSync(guildStatePath)) return null;
  return JSON.parse(readFileSync(guildStatePath, "utf8"));
}

await check("core oauth env", async () => {
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.SESSION_SECRET) {
    throw new Error("Missing DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, or SESSION_SECRET");
  }
  return "oauth credentials present";
});

await check("discord application env", async () => {
  const missing = [];
  if (!botToken) missing.push("DISCORD_BOT_TOKEN");
  if (!env.DISCORD_APPLICATION_ID?.trim()) missing.push("DISCORD_APPLICATION_ID");
  if (!guildId) missing.push("DISCORD_GUILD_ID");
  if (!env.DISCORD_PUBLIC_KEY?.trim()) missing.push("DISCORD_PUBLIC_KEY");
  if (missing.length) throw new Error(`Missing ${missing.join(", ")}`);
  return "bot, application, guild, and public key present";
});

await check("api health", async () => {
  const response = await fetch(`${apiBase}/health`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
});

await check("api /discord/mock real-configured", async () => {
  const response = await fetch(`${apiBase}/discord/mock`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  if (body.mode !== "real-configured") throw new Error(`expected real-configured, got ${body.mode}`);
  if (!body.guild?.guildName) throw new Error("guild state missing from /discord/mock");
  return `guild=${body.guild.guildName}`;
});

await check("local oauth redirect", async () => {
  const response = await fetch(`${apiBase}/auth/discord`, { redirect: "manual" });
  if (response.status !== 302) throw new Error(`expected 302, got ${response.status}`);
  const location = response.headers.get("location") ?? "";
  const url = new URL(location);
  if (url.searchParams.get("client_id") !== env.DISCORD_CLIENT_ID) throw new Error("client_id mismatch");
  const redirectUri = url.searchParams.get("redirect_uri");
  if (redirectUri !== env.DISCORD_OAUTH_REDIRECT_URI) {
    throw new Error(`redirect_uri mismatch: ${redirectUri}`);
  }
  return `redirect_uri=${redirectUri}`;
});

await check("prod oauth redirect (tunnel)", async () => {
  let response;
  try {
    response = await fetch(`${prodApiBase}/auth/discord`, { redirect: "manual" });
  } catch {
    return "skipped (prod API unreachable - tunnel optional)";
  }
  if (response.status !== 302) throw new Error(`expected 302 from ${prodApiBase}, got ${response.status}`);
  const location = response.headers.get("location") ?? "";
  if (!location.includes("discord.com/api/oauth2/authorize")) throw new Error("unexpected redirect target");
  const url = new URL(location);
  const prodRedirect = env.DISCORD_OAUTH_REDIRECT_URI_PROD ?? `${prodApiBase}/auth/discord/callback`;
  const redirectUri = url.searchParams.get("redirect_uri");
  if (redirectUri !== prodRedirect) {
    throw new Error(`prod redirect_uri mismatch: got ${redirectUri}, expected ${prodRedirect}`);
  }
  return `prod redirect_uri=${redirectUri}`;
});

await check("bot identity", async () => {
  const body = await discordFetch("/users/@me");
  return `username=${body.username}, id=${body.id}`;
});

await check("bot guild access", async () => {
  const guild = await discordFetch(`/guilds/${guildId}?with_counts=true`);
  if (guild.id !== guildId) throw new Error("guild id mismatch");
  return `name=${guild.name}, members≈${guild.approximate_member_count ?? "?"}`;
});

await check("guild state file", async () => {
  const state = loadGuildState();
  if (!state) throw new Error(`Missing ${guildStatePath} — run pnpm discord:bootstrap`);
  if (state.guildId !== guildId) throw new Error(`state guildId ${state.guildId} != env ${guildId}`);
  return `layout v${state.layoutVersion}, channels=${Object.keys(state.channels ?? {}).length}`;
});

await check("discord channels exist", async () => {
  const state = loadGuildState();
  if (!state?.channels) throw new Error("no channels in guild state");
  const liveChannels = await discordFetch(`/guilds/${guildId}/channels`);
  const liveIds = new Set(liveChannels.map((channel) => channel.id));
  const missing = Object.entries(state.channels)
    .filter(([, id]) => !liveIds.has(id))
    .map(([key]) => key);
  if (missing.length) throw new Error(`missing channels: ${missing.join(", ")}`);
  return `${Object.keys(state.channels).length} channels verified`;
});

await check("discord roles exist", async () => {
  const state = loadGuildState();
  if (!state?.roles) throw new Error("no roles in guild state");
  const liveRoles = await discordFetch(`/guilds/${guildId}/roles`);
  const liveIds = new Set(liveRoles.map((role) => role.id));
  const missing = Object.entries(state.roles)
    .filter(([, id]) => !liveIds.has(id))
    .map(([key]) => key);
  if (missing.length) throw new Error(`missing roles: ${missing.join(", ")}`);
  return `${Object.keys(state.roles).length} roles verified`;
});

await check("webhooks configured", async () => {
  const state = loadGuildState();
  const webhooks = state?.webhooks ?? {};
  const required = ["status", "approvals", "missions", "general"];
  const missing = required.filter((key) => !webhooks[key]);
  if (missing.length) throw new Error(`missing webhooks: ${missing.join(", ")}`);
  return `${Object.keys(webhooks).length} webhooks in state`;
});

await check("webhooks reachable", async () => {
  const state = loadGuildState();
  const webhooks = state?.webhooks ?? {};
  const failures = [];
  for (const [key, url] of Object.entries(webhooks)) {
    try {
      const response = await fetch(`${url}?wait=true`, { method: "GET" });
      if (!response.ok && response.status !== 405) {
        failures.push(`${key}:${response.status}`);
      }
    } catch (error) {
      failures.push(`${key}:${error instanceof Error ? error.message : error}`);
    }
  }
  if (failures.length) throw new Error(failures.join("; "));
  return `${Object.keys(webhooks).length} webhook URLs valid`;
});

await check("slash commands synced", async () => {
  const appId = env.DISCORD_APPLICATION_ID?.trim();
  const commands = await discordFetch(`/applications/${appId}/guilds/${guildId}/commands`);
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new Error("no guild commands — run pnpm discord:sync-commands");
  }
  return `${commands.length} commands registered`;
});

await check("interactions endpoint security", async () => {
  const response = await fetch(`${apiBase}/discord/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  if (response.status !== 401) {
    throw new Error(`expected 401 without signature, got ${response.status}`);
  }
  return "unsigned interaction rejected";
});

await check("interactions mode", async () => {
  const response = await fetch(`${prodApiBase}/health`).catch(() => null);
  const tunnelUp = Boolean(response?.ok);
  const app = await discordFetch("/applications/@me");
  const endpoint = app.interactions_endpoint_url ?? null;
  if (tunnelUp && endpoint && !endpoint.includes("flous.dev")) {
    throw new Error(`unexpected interactions endpoint: ${endpoint}`);
  }
  return tunnelUp
    ? `tunnel up, mode=${endpoint ? "http-endpoint" : "gateway"}`
    : `tunnel down (optional), mode=${endpoint ? "http-endpoint" : "gateway"}`;
});

await check("api discord pulse", async () => {
  const response = await fetch(`${apiBase}/discord/pulse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  if (!body.ok) throw new Error(`pulse failed: ${JSON.stringify(body)}`);
  return "pulse posted";
});

await check("api discord sync-outbox", async () => {
  const response = await fetch(`${apiBase}/discord/sync-outbox`, { method: "POST" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  return `ok=${body.ok}`;
});

if (liveSmoke) {
  await check("live webhook post (#status)", async () => {
    const state = loadGuildState();
    const webhook = state?.webhooks?.status;
    if (!webhook) throw new Error("status webhook missing");
    const response = await fetch(`${webhook}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "AgentOS smoke test (auto) — safe to delete.",
        username: "AgentOS Smoke"
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    return `messageId=${body.id}`;
  });
}

const summary = {
  apiBase,
  prodApiBase,
  guildId,
  liveSmoke,
  passed: results.filter((result) => result.ok).length,
  failed: results.filter((result) => !result.ok).length,
  results
};

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.failed > 0 ? 1 : 0);
