import { loadWikiArticle, listWikiArticles } from "./load";
import { buildWikiGraph } from "./graph";
import { loadWikiManifest } from "./index-manifest";
import {
  composeSectionExcerpt,
  parseArticleSections,
  preferredHeadingsForTask,
  scoreManifestSection,
  scoreWikiSection,
  selectRankedSections
} from "./sections";
import type {
  WikiArticle,
  WikiRetrieveOptions,
  WikiRetrieveResult,
  WikiRetrieveSignals,
  WikiSearchMatch,
  WikiSectionHit
} from "./types";

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9/_-]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function buildSignals(query: string, options?: WikiRetrieveOptions) {
  const queryTerms = options?.signals?.queryTerms?.length
    ? options.signals.queryTerms
    : tokenize(query);
  const repoPaths = options?.signals?.repoPaths ?? [];
  const seedSlugs = new Set(options?.seedSlugs ?? []);
  const preferredHeadings = preferredHeadingsForTask(options?.signals?.taskType);
  return { queryTerms, repoPaths, seedSlugs, preferredHeadings };
}

function scoreArticleTerms(article: WikiArticle, terms: string[]) {
  const haystack = [
    article.slug,
    article.title,
    ...(article.tags ?? []),
    article.body.slice(0, 2000)
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (article.slug.includes(term)) score += 12;
    if (article.title.toLowerCase().includes(term)) score += 8;
    if (article.tags.some((tag) => tag.toLowerCase().includes(term))) score += 6;
    if (haystack.includes(term)) score += 3;
  }
  return score;
}

export function searchWikiArticles(repoRoot: string, query: string, limit = 12): WikiSearchMatch[] {
  const terms = tokenize(query);
  if (!terms.length) return [];

  const manifest = loadWikiManifest(repoRoot);
  const matches: WikiSearchMatch[] = [];
  const seen = new Set<string>();

  if (manifest?.articles?.length) {
    const seedSlugs = new Set<string>();
    for (const entry of manifest.articles) {
      for (const section of entry.sections ?? []) {
        const sectionScore = scoreManifestSection(section, entry.slug, entry.tags, {
          queryTerms: terms,
          repoPaths: [],
          seedSlugs,
          preferredHeadings: []
        });
        if (sectionScore <= 0) continue;

        const key = `${entry.slug}#${section.anchor}`;
        if (seen.has(key)) continue;
        seen.add(key);

        matches.push({
          slug: entry.slug,
          title: entry.title,
          excerpt: section.summary || section.heading,
          score: sectionScore + 4,
          sectionHeading: section.heading,
          sectionAnchor: section.anchor
        });
      }
    }
  }

  for (const summary of listWikiArticles(repoRoot)) {
    if (summary.archived) continue;
    const article = loadWikiArticle(repoRoot, summary.slug);
    if (!article) continue;

    const score = scoreArticleTerms(article, terms);
    if (score <= 0) continue;

    const excerpt = article.body
      .replace(/^---[\s\S]*?---\s*/m, "")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"))
      ?.slice(0, 160);

    matches.push({
      slug: article.slug,
      title: article.title,
      excerpt: excerpt ?? "",
      score
    });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

function seedSlugsFromQuery(repoRoot: string, query: string, limit: number) {
  return searchWikiArticles(repoRoot, query, limit).map((match) => match.slug);
}

function collectCandidateSlugs(
  repoRoot: string,
  seeds: string[],
  maxHops: number,
  maxArticles: number
) {
  const graph = buildWikiGraph(repoRoot);
  const hopBySlug = new Map<string, number>();
  const visited = new Set<string>();
  const queue: Array<{ slug: string; hop: number }> = seeds.map((slug) => ({ slug, hop: 0 }));
  const orderedSlugs: string[] = [];

  while (queue.length > 0 && orderedSlugs.length < maxArticles) {
    const next = queue.shift();
    if (!next || visited.has(next.slug)) continue;
    visited.add(next.slug);
    hopBySlug.set(next.slug, next.hop);

    const article = loadWikiArticle(repoRoot, next.slug);
    if (!article || article.archived) continue;

    orderedSlugs.push(next.slug);

    if (next.hop >= maxHops) continue;
    const outbound = graph.outbound[next.slug] ?? article.outboundLinks;
    for (const linked of outbound) {
      if (!visited.has(linked)) {
        queue.push({ slug: linked, hop: next.hop + 1 });
      }
    }
  }

  return { orderedSlugs, hopBySlug };
}

function manifestSectionScore(
  repoRoot: string,
  slug: string,
  anchor: string,
  signals: ReturnType<typeof buildSignals>
) {
  const manifest = loadWikiManifest(repoRoot);
  const entry = manifest?.articles.find((row) => row.slug === slug);
  const section = entry?.sections?.find((row) => row.anchor === anchor);
  if (!entry || !section) return 0;

  return scoreManifestSection(section, entry.slug, entry.tags, {
    queryTerms: signals.queryTerms,
    repoPaths: signals.repoPaths,
    seedSlugs: signals.seedSlugs,
    preferredHeadings: signals.preferredHeadings
  });
}

function expandWikiContextFullArticles(
  repoRoot: string,
  seeds: string[],
  options: WikiRetrieveOptions
): WikiRetrieveResult {
  const maxHops = options.maxHops ?? 2;
  const maxChars = options.maxChars ?? 8000;
  const maxArticles = options.maxArticles ?? 8;

  const { orderedSlugs, hopBySlug } = collectCandidateSlugs(repoRoot, seeds, maxHops, maxArticles);
  const articles: WikiArticle[] = [];
  let chars = 0;

  for (const slug of orderedSlugs) {
    const article = loadWikiArticle(repoRoot, slug);
    if (!article) continue;
    const articleChars = article.body.length;
    if (chars + articleChars > maxChars && articles.length > 0) break;
    articles.push(article);
    chars += articleChars;
    hopBySlug.set(slug, hopBySlug.get(slug) ?? 0);
  }

  return {
    seedSlugs: seeds,
    slugs: articles.map((article) => article.slug),
    articles,
    sections: [],
    chars,
    sectionCount: 0
  };
}

function expandWikiContextBySections(
  repoRoot: string,
  query: string,
  seeds: string[],
  options: WikiRetrieveOptions
): WikiRetrieveResult {
  const maxHops = options.maxHops ?? 2;
  const maxChars = options.maxChars ?? 8000;
  const maxArticles = options.maxArticles ?? 8;
  const maxSections = options.maxSections ?? Math.max(4, Math.min(12, maxArticles * 2));
  const signals = buildSignals(query, options);

  const { orderedSlugs, hopBySlug } = collectCandidateSlugs(repoRoot, seeds, maxHops, maxArticles);

  const ranked = [];
  for (const slug of orderedSlugs) {
    const article = loadWikiArticle(repoRoot, slug);
    if (!article) continue;

    for (const section of parseArticleSections(article.slug, article.body)) {
      const manifestScore = manifestSectionScore(repoRoot, slug, section.anchor, signals);
      const score = scoreWikiSection(section, {
        queryTerms: signals.queryTerms,
        repoPaths: signals.repoPaths,
        seedSlugs: signals.seedSlugs,
        hopBySlug,
        articleSlug: article.slug,
        articleTitle: article.title,
        articleTags: article.tags,
        preferredHeadings: signals.preferredHeadings,
        updatedAt: article.updatedAt,
        manifestSectionScore: manifestScore
      });

      ranked.push({
        section,
        score,
        chars: section.content.length + section.heading.length + 8
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score || a.section.slug.localeCompare(b.section.slug));

  const { selected, chars } = selectRankedSections(ranked, maxChars, maxSections);
  const sectionHits: WikiSectionHit[] = selected.map((row) => ({
    slug: row.section.slug,
    heading: row.section.heading,
    anchor: row.section.anchor,
    content: row.section.content,
    score: row.score
  }));

  const sectionsBySlug = new Map<string, typeof selected>();
  for (const row of selected) {
    const bucket = sectionsBySlug.get(row.section.slug) ?? [];
    bucket.push(row);
    sectionsBySlug.set(row.section.slug, bucket);
  }

  const articles: WikiArticle[] = [];
  for (const [slug, rows] of sectionsBySlug) {
    const article = loadWikiArticle(repoRoot, slug);
    if (!article) continue;
    articles.push({
      ...article,
      body: composeSectionExcerpt(
        article.title,
        rows.map((row) => row.section)
      )
    });
  }

  return {
    seedSlugs: seeds,
    slugs: [...sectionsBySlug.keys()],
    articles,
    sections: sectionHits,
    chars,
    sectionCount: sectionHits.length
  };
}

export function expandWikiContext(
  repoRoot: string,
  query: string,
  options?: WikiRetrieveOptions
): WikiRetrieveResult {
  const searchSeeds = seedSlugsFromQuery(repoRoot, query, 4);
  const seeds = [...new Set([...(options?.seedSlugs ?? []), ...searchSeeds])].slice(0, 6);
  const resolved = options ?? {};
  const sectionLevel = resolved.sectionLevel !== false;

  if (!sectionLevel) {
    return expandWikiContextFullArticles(repoRoot, seeds, resolved);
  }

  return expandWikiContextBySections(repoRoot, query, seeds, resolved);
}

export function buildRetrieveSignalsFromQuery(
  query: string,
  extra?: WikiRetrieveSignals
): WikiRetrieveSignals {
  return {
    queryTerms: extra?.queryTerms ?? tokenize(query),
    repoPaths: extra?.repoPaths ?? [],
    preferredSlugs: extra?.preferredSlugs,
    taskType: extra?.taskType
  };
}
