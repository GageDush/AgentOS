import { loadRepoEnv } from "../apps/api/src/load-env";
import { bootstrapAgentNeighborhood } from "../apps/api/src/discord/neighborhood-bootstrap";

loadRepoEnv();

async function main() {
  const result = await bootstrapAgentNeighborhood();
  console.log(
    JSON.stringify(
      {
        ok: true,
        neighborhoodCategoryId: result.categoryId,
        townSquare: result.townSquareChannelId,
        socialLounge: result.socialLoungeChannelId,
        houses: Object.keys(result.houses).length,
        journalSlugs: result.journalSlugs.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
