import { loadRepoEnv } from "../apps/api/src/load-env";
import { postChannelGuides } from "../apps/api/src/discord/channel-guides";

loadRepoEnv();

async function main() {
  const result = await postChannelGuides();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
