/**
 * Index OG ChatGPT planning board content into the memory wiki.
 * Sources: git AgentOS_Project_Bundle, on-disk bundle, .agentos/imports/chatgpt/
 *
 * Usage: pnpm wiki:sync-chatgpt [--full]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const full = process.argv.includes("--full");
process.env.FEATURE_MEMORY_WIKI = process.env.FEATURE_MEMORY_WIKI ?? "true";

const { ensureChatGptImportReadme, syncChatGptPlanningToWiki } = await import(
  "../packages/memory/src/wiki/chatgpt-planning.ts"
);

ensureChatGptImportReadme(root);
const result = syncChatGptPlanningToWiki(root, { full });
console.log(JSON.stringify({ ok: true, full, ...result }, null, 2));
