import { loadRepoEnv } from "../apps/api/src/load-env";
import { syncDiscordRoles } from "../apps/api/src/discord/roles";

loadRepoEnv();

async function main() {
  const result = await syncDiscordRoles();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
