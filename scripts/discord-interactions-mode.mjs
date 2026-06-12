import { loadRepoEnv } from "../apps/api/src/load-env.ts";

loadRepoEnv();

const token = process.env.DISCORD_BOT_TOKEN?.trim();
if (!token) {
  console.error("DISCORD_BOT_TOKEN is required.");
  process.exit(1);
}

const mode = process.argv[2] ?? "status";
const headers = {
  Authorization: `Bot ${token}`,
  "Content-Type": "application/json"
};

async function getApplication() {
  const response = await fetch("https://discord.com/api/v10/applications/@me", { headers });
  if (!response.ok) {
    throw new Error(`GET application failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

async function setInteractionsEndpoint(url) {
  const response = await fetch("https://discord.com/api/v10/applications/@me", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ interactions_endpoint_url: url })
  });
  if (!response.ok) {
    throw new Error(`PATCH application failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

const app = await getApplication();
const current = app.interactions_endpoint_url ?? null;

if (mode === "status") {
  console.log(
    JSON.stringify(
      {
        applicationId: app.id,
        applicationName: app.name,
        interactionsEndpointUrl: current,
        mode: current ? "http-endpoint" : "gateway"
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (mode === "gateway") {
  const updated = await setInteractionsEndpoint(null);
  console.log(
    JSON.stringify(
      {
        ok: true,
        applicationId: updated.id,
        previous: current,
        interactionsEndpointUrl: updated.interactions_endpoint_url ?? null,
        mode: "gateway"
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (mode === "http") {
  const url = process.argv[3] ?? "https://api.flous.dev/discord/interactions";
  const updated = await setInteractionsEndpoint(url);
  console.log(
    JSON.stringify(
      {
        ok: true,
        applicationId: updated.id,
        previous: current,
        interactionsEndpointUrl: updated.interactions_endpoint_url ?? null,
        mode: "http-endpoint"
      },
      null,
      2
    )
  );
  process.exit(0);
}

console.error("Usage: tsx scripts/discord-interactions-mode.mjs [status|gateway|http [url]]");
process.exit(1);
