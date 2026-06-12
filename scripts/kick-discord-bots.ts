import { loadRepoEnv } from "../apps/api/src/load-env";
import { kickInactiveBots } from "../apps/api/src/discord/bots";

loadRepoEnv();

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const result = await kickInactiveBots({ dryRun });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
