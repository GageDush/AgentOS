import { loadRepoEnv } from "../apps/api/src/load-env";
import { bootstrapDiscordGuild } from "../apps/api/src/discord/bootstrap";

loadRepoEnv();

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const result = await bootstrapDiscordGuild({ dryRun });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
