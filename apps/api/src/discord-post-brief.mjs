/**
 * Post the implementation brief summary to #cursor (or #operator-command / #general fallback).
 * Usage: pnpm discord:post-brief
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const briefPath = join(root, "docs/demo/IMPLEMENTATION_BRIEF.md");
const brief = existsSync(briefPath) ? readFileSync(briefPath, "utf8") : "Implementation brief not found.";

const { loadDiscordGuildState } = await import("./discord/bootstrap.ts");
const { postPersonaWebhookMessage } = await import("./discord/webhook-post.ts");
const { getDiscordRestClient } = await import("./discord/client.ts");
const { buildAgentEmbed } = await import("./discord/embeds.ts");

const state = loadDiscordGuildState();
const channelKey = state?.webhooks?.cursor
  ? "cursor"
  : state?.webhooks?.operatorCommand
    ? "operatorCommand"
    : "general";
const webhook = state?.webhooks?.[channelKey];
const channelId = state?.channels?.[channelKey];

if (!webhook && !channelId) {
  console.error(JSON.stringify({ ok: false, error: "No Discord channel configured. Run pnpm discord:setup-operator-channel." }));
  process.exit(1);
}

const payload = {
  agentId: "admin-agent",
  title: "Implementation brief",
  description: "AgentOS program status for the 190-step demo pathway.",
  tone: "info",
  footerHint: "Program status",
  showPortrait: true,
  fields: [
    { name: "Overall", value: "~82% of 190-step pathway materially complete", inline: true },
    { name: "Health", value: "typecheck · 142+ tests · 41 discord tests · 16 profiles", inline: false },
    {
      name: "Complete",
      value:
        "Operator shell · missions · Discord plane · app generation · LLM executor · release gates · queue/scheduler · Playwright E2E",
      inline: false
    },
    {
      name: "Remaining",
      value:
        "Tool execution (141–150) · QA/security/review gates · git release · hosted Postgres/Redis · Discord D-04–D-17 · WebSocket UI · ship tag",
      inline: false
    },
    {
      name: "This channel",
      value: "Owner prompt lane — send Cursor prompts here. Watch pinned **Operator lane status** for ready/busy.",
      inline: false
    },
    {
      name: "Full doc",
      value: "`docs/demo/IMPLEMENTATION_BRIEF.md`",
      inline: false
    },
    {
      name: "Excerpt",
      value: brief.slice(0, 900).replace(/\*\*/g, "").trim() || "No excerpt available.",
      inline: false
    }
  ]
};

if (webhook) {
  await postPersonaWebhookMessage(webhook, payload);
} else {
  const client = getDiscordRestClient();
  if (!client || !channelId) throw new Error("Discord REST client unavailable.");
  await client.createMessage(channelId, {
    embeds: [buildAgentEmbed(payload)]
  });
}

console.log(JSON.stringify({ ok: true, channel: channelKey, fields: payload.fields.length }, null, 2));
