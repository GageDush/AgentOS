/**
 * One-time / idempotent migration: flat .agentos/memory/*.md → wiki articles.
 * Usage: node scripts/migrate-memory-to-wiki.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const memoryDir = join(root, ".agentos", "memory");
const wikiDir = join(memoryDir, "wiki");

const FLAT_TO_WIKI = {
  "test-commands.md": "flows/test-commands.md",
  "risk-areas.md": "areas/risk-areas.md",
  "code-ownership-map.md": "areas/code-ownership.md",
  "dependency-graph.md": "areas/dependency-graph.md",
  "repo-map.md": "areas/repo-layout.md"
};

function stripUpdateSections(content) {
  const lines = content.split(/\r?\n/);
  const kept = [];
  let inUpdate = false;
  for (const line of lines) {
    if (/^## Update \d{4}-\d{2}-\d{2}/.test(line)) {
      inUpdate = true;
      continue;
    }
    if (inUpdate && line.startsWith("## ")) inUpdate = false;
    if (!inUpdate) kept.push(line);
  }
  return kept.join("\n").trim();
}

function appendHistory(wikiPath, flatPath) {
  if (!existsSync(flatPath) || !existsSync(wikiPath)) return false;
  const flat = readFileSync(flatPath, "utf8");
  const updates = [...flat.matchAll(/^## Update (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=^## Update |\Z)/gm)];
  if (!updates.length) return false;

  let wiki = readFileSync(wikiPath, "utf8");
  if (wiki.includes("## Migrated history")) return false;

  const history = updates
    .map((match) => `### ${match[1]}\n${match[2].trim()}`)
    .join("\n\n");

  wiki = `${wiki.trimEnd()}\n\n## Migrated history\n\n${history}\n`;
  writeFileSync(wikiPath, wiki, "utf8");
  return true;
}

mkdirSync(wikiDir, { recursive: true });

const migrated = [];
for (const [flatName, wikiRel] of Object.entries(FLAT_TO_WIKI)) {
  const flatPath = join(memoryDir, flatName);
  const wikiPath = join(wikiDir, wikiRel);
  if (!existsSync(flatPath)) continue;
  if (!existsSync(wikiPath)) {
    mkdirSync(dirname(wikiPath), { recursive: true });
    const body = stripUpdateSections(readFileSync(flatPath, "utf8"));
    writeFileSync(wikiPath, body.endsWith("\n") ? body : `${body}\n`, "utf8");
    migrated.push({ flatName, wikiRel, action: "created" });
  } else if (appendHistory(wikiPath, flatPath)) {
    migrated.push({ flatName, wikiRel, action: "history-appended" });
  }
}

console.log(JSON.stringify({ ok: true, wikiDir, migrated }, null, 2));
