import { loadWikiArticle, listWikiArticles } from "./load";
import type { WikiGraph } from "./types";

export function buildWikiGraph(repoRoot: string): WikiGraph {
  const summaries = listWikiArticles(repoRoot).filter((article) => !article.archived);
  const articles = Object.fromEntries(summaries.map((article) => [article.slug, article]));
  const outbound: Record<string, string[]> = {};
  const inbound: Record<string, string[]> = {};

  for (const summary of summaries) {
    const loaded = loadWikiArticle(repoRoot, summary.slug);
    const targets = loaded?.outboundLinks ?? [];
    outbound[summary.slug] = targets;
    for (const target of targets) {
      if (!inbound[target]) inbound[target] = [];
      if (!inbound[target].includes(summary.slug)) inbound[target].push(summary.slug);
    }
  }

  for (const slug of Object.keys(inbound)) {
    inbound[slug].sort();
  }

  return { articles, outbound, inbound };
}

export function getWikiBacklinks(repoRoot: string, slug: string) {
  const graph = buildWikiGraph(repoRoot);
  const normalized = slug.trim().toLowerCase();
  const backlinks = graph.inbound[normalized] ?? [];
  return backlinks.map((sourceSlug) => graph.articles[sourceSlug]).filter(Boolean);
}
