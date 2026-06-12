/**
 * Sync Cursor IDE chat transcripts into the AgentOS memory wiki.
 * Usage: pnpm wiki:sync-cursor [--full]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const full = process.argv.includes("--full");
process.env.FEATURE_MEMORY_WIKI = process.env.FEATURE_MEMORY_WIKI ?? "true";

const { syncCursorSessionsToWiki } = await import("../packages/memory/src/wiki/cursor-sync.ts");

const result = syncCursorSessionsToWiki(root, { full, applyCrossLinks: true });
console.log(JSON.stringify({ ok: true, full, ...result }, null, 2));
