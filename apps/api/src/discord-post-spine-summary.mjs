/**
 * Post spine demo + test summary to Discord (#cursor / operator / general).
 * Usage: pnpm discord:post-spine-summary
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

const reportPath = existsSync(join(root, ".agentos/state/smoke-full-report.json"))
  ? join(root, ".agentos/state/smoke-full-report.json")
  : join(root, ".agentos/state/spine-demo-report.json");
const testPath = join(root, ".agentos/state/spine-test-report.json");
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : { ok: false, steps: [] };
const tests = existsSync(testPath) ? JSON.parse(readFileSync(testPath, "utf8")) : null;

const steps = report.phases ?? report.steps ?? [];
const passedSteps = steps.filter((s) => s.ok).map((s) => s.name);
const failedSteps = steps.filter((s) => !s.ok).map((s) => `${s.name}: ${s.detail}`);

const fields = [
  { name: "Spine demo", value: report.ok ? "PASSED" : "FAILED", inline: true },
  { name: "When", value: report.finishedAt?.slice(0, 19) ?? "unknown", inline: true },
  {
    name: "Checks passed",
    value: passedSteps.length ? passedSteps.join(" · ") : "none",
    inline: false
  }
];

if (failedSteps.length) {
  fields.push({ name: "Failures", value: failedSteps.join("\n").slice(0, 900), inline: false });
}

if (report.gates) {
  fields.push({
    name: "Demo run gates",
    value: `required: ${(report.gates.required ?? []).join(", ") || "—"} | passed: ${(report.gates.passed ?? []).join(", ") || "—"} | pending: ${(report.gates.pending ?? []).join(", ") || "—"}`,
    inline: false
  });
}

if (tests) {
  fields.push({
    name: "Test suite",
    value: `${tests.summary ?? "ran"} — typecheck: ${tests.typecheck ?? "?"} · unit: ${tests.unit ?? "?"} · discord: ${tests.discord ?? "?"}`,
    inline: false
  });
  if (tests.acceptance) {
    fields.push({ name: "Acceptance gate", value: tests.acceptance, inline: true });
  }
  if (tests.e2e) {
    fields.push({ name: "Playwright E2E", value: tests.e2e, inline: true });
  }
}

fields.push({
  name: "What shipped",
  value:
    "Tool loop · LLM tool loop · git tools · QA/security/review gates · live Forge WS · Discord gate failures · GitLab CI mirror",
  inline: false
});

fields.push({
  name: "Still open",
  value: "Live PR proof · pgvector · Postgres cutover · discord:live-smoke · agentos-V1 tag",
  inline: false
});

const { loadDiscordGuildState } = await import("./discord/bootstrap.ts");
const { postPersonaWebhookMessage } = await import("./discord/webhook-post.ts");
const { getDiscordRestClient } = await import("./discord/client.ts");
const { buildAgentEmbed } = await import("./discord/embeds.ts");

const state = loadDiscordGuildState();
const channelKey = state?.webhooks?.opsFeed
  ? "opsFeed"
  : state?.webhooks?.cursor
    ? "cursor"
    : state?.webhooks?.operatorCommand
      ? "operatorCommand"
      : "general";
const webhook = state?.webhooks?.[channelKey];
const channelId = state?.channels?.[channelKey];

if (!webhook && !channelId) {
  console.error(JSON.stringify({ ok: false, error: "No Discord channel configured." }));
  process.exit(1);
}

const payload = {
  agentId: "admin-agent",
  title: report.ok ? "AgentOS smoke-full — passed" : "AgentOS smoke-full — needs attention",
  description: "Ground-up smoketest: env patch, stack restart, build, live spine mission, gates, E2E.",
  tone: report.ok ? "success" : "danger",
  footerHint: "Spine demo",
  showPortrait: true,
  fields
};

if (webhook) {
  await postPersonaWebhookMessage(webhook, payload);
} else {
  const client = getDiscordRestClient();
  if (!client || !channelId) throw new Error("Discord REST client unavailable.");
  await client.createMessage(channelId, { embeds: [buildAgentEmbed(payload)] });
}

console.log(JSON.stringify({ ok: true, channel: channelKey, spineOk: report.ok }, null, 2));
