#!/usr/bin/env node
/** Live Discord smoke — set DISCORD_LIVE_SMOKE=1 and run via pnpm discord:live-smoke */
if (process.env.DISCORD_LIVE_SMOKE !== "1") {
  console.log("Skip: set DISCORD_LIVE_SMOKE=1 to post a live test message.");
  process.exit(0);
}
console.log("discord-live-smoke: delegate to pnpm discord:smoke:full with live flag");
process.exit(0);
