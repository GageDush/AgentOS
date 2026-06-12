import { loadRepoEnv } from "../apps/api/src/load-env";
import { setupOperatorCommandChannel } from "../apps/api/src/discord/bootstrap";

loadRepoEnv();

const ownerArg = process.argv.find((arg) => arg.startsWith("--owner-id="));
const ownerUserId = ownerArg?.split("=")[1]?.trim();

async function main() {
  const result = await setupOperatorCommandChannel({ ownerUserId });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
