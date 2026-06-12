/**
 * Rebuild .agentos/memory/wiki/_meta/index.json + graph.json
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { rebuildWikiManifest } = await import("../packages/memory/src/wiki/index-manifest.ts");
const manifest = rebuildWikiManifest(root);
console.log(JSON.stringify({ ok: true, count: manifest.articles.length, generatedAt: manifest.generatedAt }, null, 2));
