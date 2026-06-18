import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const { loadDiscordGuildState } = await import("../apps/api/src/discord/bootstrap.ts");
const { postPersonaWebhookMessage } = await import("../apps/api/src/discord/webhook-post.ts");
const { getDiscordRestClient } = await import("../apps/api/src/discord/client.ts");
const { buildAgentEmbed } = await import("../apps/api/src/discord/embeds.ts");

const state = loadDiscordGuildState();
const channelKey = state?.webhooks?.cursor ? "cursor" : state?.webhooks?.operatorCommand ? "operatorCommand" : "general";
const webhook = state?.webhooks?.[channelKey];
const channelId = state?.channels?.[channelKey];

if (!webhook && !channelId) {
  throw new Error("No Discord channel configured for summary update.");
}

const payload = {
  agentId: "admin-agent",
  title: "Hardening pass update",
  description: "Cursor completed a stability and verification pass.",
  tone: "info",
  footerHint: "Automated status update",
  showPortrait: true,
  fields: [
    { name: "Website", value: "flous.dev is up (200) after repair", inline: true },
    { name: "Active UI port", value: "3010 (override + tunnel mapped)", inline: true },
    { name: "Gates", value: "typecheck PASS · command-center build PASS · llm:smoke PASS", inline: false },
    { name: "Tests", value: "Full suite mostly PASS; one transient timeout in discord gateway test, targeted rerun PASS", inline: false },
    { name: "Hardening", value: "stack:port script fixed; Discord pulse posted; port canonicalization still pending zombie cleanup", inline: false }
  ]
};

if (webhook) {
  await postPersonaWebhookMessage(webhook, payload);
} else {
  const client = getDiscordRestClient();
  if (!client || !channelId) throw new Error("Discord REST client unavailable.");
  await client.createMessage(channelId, { embeds: [buildAgentEmbed(payload)] });
}

console.log(JSON.stringify({ ok: true, channel: channelKey }, null, 2));
