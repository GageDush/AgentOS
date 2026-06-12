import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildWikiGraph } from "./graph";
import { loadWikiArticle, listWikiArticles } from "./load";
import { wikiRoot } from "./paths";
import type { WikiIndexManifest } from "./types";
import { uniqueLinkSlugs } from "./links";
import { sectionIndexFromBody } from "./sections";

function metaDir(repoRoot: string) {
  return join(wikiRoot(repoRoot), "_meta");
}

function extractSummary(body: string) {
  const cleaned = body
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g, "$1");
  const line = cleaned
    .split(/\r?\n/)
    .map((row) => row.trim())
    .find((row) => row && !row.startsWith("#"));
  return (line ?? "").slice(0, 200);
}

function extractEntities(body: string) {
  const entities = new Set<string>();
  for (const match of body.matchAll(/`([^`]+)`/g)) {
    const value = match[1]?.trim();
    if (value && value.length < 120) entities.add(value);
  }
  for (const match of body.matchAll(/\b(?:packages|apps)\/[A-Za-z0-9_./-]+/g)) {
    entities.add(match[0]);
  }
  return [...entities].slice(0, 24);
}

export function rebuildWikiManifest(repoRoot: string): WikiIndexManifest {
  const summaries = listWikiArticles(repoRoot).filter((article) => !article.archived);
  const articles = summaries.map((summary) => {
    const loaded = loadWikiArticle(repoRoot, summary.slug);
    const body = loaded?.body ?? "";
    return {
      slug: summary.slug,
      title: summary.title,
      tags: summary.tags,
      summary: extractSummary(body),
      entities: extractEntities(body),
      outLinks: loaded?.outboundLinks ?? uniqueLinkSlugs(body),
      updatedAt: summary.updatedAt,
      sections: sectionIndexFromBody(body)
    };
  });

  const manifest: WikiIndexManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    articles
  };

  const dir = metaDir(repoRoot);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.json"), JSON.stringify(manifest, null, 2), "utf8");

  const graph = buildWikiGraph(repoRoot);
  writeFileSync(join(dir, "graph.json"), JSON.stringify(graph, null, 2), "utf8");

  return manifest;
}

export function loadWikiManifest(repoRoot: string): WikiIndexManifest | undefined {
  const path = join(metaDir(repoRoot), "index.json");
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as WikiIndexManifest;
  } catch {
    return undefined;
  }
}
