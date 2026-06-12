import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const envPath = join(root, ".env");
const env = {};
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
}

const apiBase = `http://127.0.0.1:${env.AGENTOS_API_PORT ?? "8787"}`;
const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

await check("oauth env configured", async () => {
  const ok = Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.SESSION_SECRET);
  if (!ok) throw new Error("Missing DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, or SESSION_SECRET");
  return "credentials present";
});

await check("bot token env present", async () => {
  if (!env.DISCORD_BOT_TOKEN) throw new Error("Missing DISCORD_BOT_TOKEN");
  return "bot token present";
});

await check("api /discord/mock", async () => {
  const response = await fetch(`${apiBase}/discord/mock`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  if (body.mode !== "real-configured") throw new Error(`expected real-configured, got ${body.mode}`);
  return `mode=${body.mode}`;
});

await check("api /auth/discord redirect", async () => {
  const response = await fetch(`${apiBase}/auth/discord`, { redirect: "manual" });
  if (response.status !== 302) throw new Error(`expected 302, got ${response.status}`);
  const location = response.headers.get("location") ?? "";
  if (!location.includes("discord.com/api/oauth2/authorize")) throw new Error("unexpected redirect target");
  const url = new URL(location);
  if (url.searchParams.get("client_id") !== env.DISCORD_CLIENT_ID) throw new Error("client_id mismatch");
  if (url.searchParams.get("redirect_uri") !== env.DISCORD_OAUTH_REDIRECT_URI) throw new Error("redirect_uri mismatch");
  return "redirects to Discord authorize URL";
});

await check("discord bot identity", async () => {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` }
  });
  if (!response.ok) throw new Error(`Discord API HTTP ${response.status}`);
  const body = await response.json();
  return `bot username=${body.username}`;
});

await check("api /auth/me unauthenticated", async () => {
  const response = await fetch(`${apiBase}/auth/me`);
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
  return "returns 401 without session";
});

console.log(JSON.stringify({ apiBase, results }, null, 2));
const failed = results.filter((result) => !result.ok);
process.exit(failed.length ? 1 : 0);
