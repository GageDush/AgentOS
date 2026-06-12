import { loadRepoEnv } from "../apps/api/src/load-env";
import { syncDiscordCommands } from "../apps/api/src/discord/bootstrap";

loadRepoEnv();

async function main() {
  const result = await syncDiscordCommands();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
