import { loadRepoEnv } from "./load-env.ts";

loadRepoEnv();

const { handleCursorChannelMessage } = await import("./discord/cursor-channel.ts");
const { getCursorBridgeStatus } = await import("./cursor-bridge.ts");

const state = (await import("./discord/bootstrap.ts")).loadDiscordGuildState();
const channelId = state?.channels?.cursor;
const ownerId = process.env.DISCORD_ADMIN_USER_ID?.trim() || process.env.DISCORD_OWNER_USER_ID?.trim();

if (!channelId) {
  console.error(JSON.stringify({ ok: false, error: "No #cursor channel — run pnpm discord:setup-cursor-channel" }));
  process.exit(1);
}

const prompt = process.argv[2] ?? "Reply with exactly: discord-cursor-ping-ok";
console.log(JSON.stringify({ bridge: getCursorBridgeStatus(), channelId, prompt }, null, 2));

await handleCursorChannelMessage(channelId, prompt, ownerId ?? "operator", "Operator");
console.log(JSON.stringify({ ok: true }, null, 2));
