import type { TaskEnvelope } from "@agentos/shared";
import { loadWikiArticle } from "./load";
import { loadWikiManifest } from "./index-manifest";
import { expandWikiContext } from "./retrieve";
import { normalizeWikiSlug, slugToRelativePath } from "./paths";
import { MEMORY_KEY_TO_WIKI_SLUG } from "./slugify";
import type { WikiContextBridgeResult, WikiIndexEntry, WikiRetrieveOptions } from "./types";

const TASK_TYPE_WIKI_SLUGS: Record<string, string[]> = {
  qa: ["flows/test-commands", "areas/risk-areas"],
  bug_fix: ["areas/risk-areas", "flows/test-commands"],
  code_change: ["areas/code-ownership", "areas/risk-areas"],
  repo_analysis: ["areas/repo-layout", "areas/dependency-graph"],
  config: ["areas/repo-layout"],
  security: ["areas/risk-areas"],
  release: ["flows/test-commands", "areas/risk-areas"]
};

const MANIFEST_MIN_SCORE = 4;
const MANIFEST_MAX_SEEDS = 6;

type ManifestSignals = {
  preferredSlugs: Set<string>;
  repoPaths: string[];
  queryTerms: string[];
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9/_-]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function inferSlugsFromRepoPaths(repoPaths: string[]) {
  const slugs = new Set<string>();
  for (const rawPath of repoPaths) {
    const normalized = rawPath.replace(/\\/g, "/");
    const packageMatch = normalized.match(/^(packages\/[a-z0-9-]+)/i);
    if (packageMatch) {
      slugs.add(normalizeWikiSlug(packageMatch[1]));
    }
    const appMatch = normalized.match(/^(apps\/[a-z0-9-]+)/i);
    if (appMatch) {
      slugs.add(normalizeWikiSlug(`areas/${appMatch[1].replace(/\//g, "-")}`));
    }
  }
  return slugs;
}

function buildManifestSignals(envelope: TaskEnvelope, repoPaths: string[]): ManifestSignals {
  const preferredSlugs = new Set<string>(TASK_TYPE_WIKI_SLUGS[envelope.taskType] ?? []);

  for (const key of envelope.relevantMemoryKeys) {
    const mapped = MEMORY_KEY_TO_WIKI_SLUG[key];
    if (mapped) preferredSlugs.add(mapped);
  }

  for (const slug of inferSlugsFromRepoPaths(repoPaths)) {
    preferredSlugs.add(slug);
  }

  if (envelope.requiresSecurityReview) {
    preferredSlugs.add("areas/risk-areas");
  }
  if (envelope.requiresQa) {
    preferredSlugs.add("flows/test-commands");
  }

  const queryTerms = tokenize(
    [envelope.normalizedGoal, envelope.userGoal, ...envelope.inScope, ...repoPaths].join(" ")
  );

  return { preferredSlugs, repoPaths, queryTerms };
}

export function scoreManifestEntry(entry: WikiIndexEntry, signals: ManifestSignals) {
  let score = 0;

  if (signals.preferredSlugs.has(entry.slug)) {
    score += 24;
  }

  for (const preferred of signals.preferredSlugs) {
    if (entry.outLinks.includes(preferred)) score += 5;
    if (entry.tags.some((tag) => preferred.includes(tag) || tag.includes(preferred.split("/").pop() ?? ""))) {
      score += 3;
    }
  }

  for (const repoPath of signals.repoPaths) {
    const normalized = repoPath.replace(/\\/g, "/").toLowerCase();
    if (entry.entities.some((entity) => normalized.includes(entity.toLowerCase()))) {
      score += 12;
    }
    if (entry.summary.toLowerCase().includes(normalized)) {
      score += 4;
    }
  }

  for (const term of signals.queryTerms) {
    if (entry.slug.includes(term)) score += 10;
    if (entry.title.toLowerCase().includes(term)) score += 8;
    if (entry.tags.some((tag) => tag.toLowerCase().includes(term))) score += 6;
    if (entry.summary.toLowerCase().includes(term)) score += 3;
  }

  return score;
}

export function resolveManifestSeeds(
  articles: WikiIndexEntry[],
  envelope: TaskEnvelope,
  repoPaths: string[]
): { seeds: string[]; pruned: number } {
  const signals = buildManifestSignals(envelope, repoPaths);
  const scored = articles
    .map((entry) => ({ entry, score: scoreManifestEntry(entry, signals) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const qualified = scored.filter((row) => row.score >= MANIFEST_MIN_SCORE);
  const seeds = qualified.slice(0, MANIFEST_MAX_SEEDS).map((row) => row.entry.slug);
  const pruned =
    Math.max(0, qualified.length - seeds.length) +
    scored.filter((row) => row.score > 0 && row.score < MANIFEST_MIN_SCORE).length;

  return { seeds, pruned };
}

export function buildWikiQueryFromEnvelope(envelope: TaskEnvelope, command = "") {
  return [
    envelope.normalizedGoal,
    envelope.userGoal,
    envelope.taskType,
    command,
    ...envelope.relevantMemoryKeys,
    ...envelope.filesInScope.slice(0, 4)
  ]
    .filter(Boolean)
    .join(" ");
}

export function wikiRetrieveBudget(envelope: TaskEnvelope): WikiRetrieveOptions {
  if (envelope.contextBudgetTokens >= 10000) {
    return { maxHops: 2, maxChars: 12000, maxArticles: 10 };
  }
  if (envelope.contextBudgetTokens >= 6000) {
    return { maxHops: 2, maxChars: 8000, maxArticles: 8 };
  }
  return { maxHops: 1, maxChars: 4000, maxArticles: 5 };
}

export function extractRiskAreasFromWiki(repoRoot: string, slugs: string[]) {
  if (!slugs.includes("areas/risk-areas")) return [];

  const article = loadWikiArticle(repoRoot, "areas/risk-areas");
  if (!article) return [];

  const risks: string[] = [];
  for (const line of article.body.split(/\r?\n/)) {
    const trimmed = line.replace(/^[-*]\s*/, "").trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("See also:")) {
      risks.push(trimmed.replace(/\[\[([^\]]+)\]\]/g, "$1"));
    }
  }
  return risks;
}

export function buildWikiContextForEnvelope(
  repoRoot: string,
  envelope: TaskEnvelope,
  options?: { command?: string; repoPaths?: string[] }
): WikiContextBridgeResult {
  const repoPaths = options?.repoPaths ?? envelope.filesInScope;
  const query = buildWikiQueryFromEnvelope(envelope, options?.command);
  const budget = wikiRetrieveBudget(envelope);

  let seedSlugs: string[] = [];
  let prunedCandidates = 0;
  let manifestLoaded = false;

  const manifest = loadWikiManifest(repoRoot);
  if (manifest?.articles?.length) {
    manifestLoaded = true;
    const resolved = resolveManifestSeeds(manifest.articles, envelope, repoPaths);
    seedSlugs = resolved.seeds;
    prunedCandidates = resolved.pruned;
  }

  const retrieve = expandWikiContext(repoRoot, query, {
    ...budget,
    seedSlugs,
    sectionLevel: true,
    signals: {
      queryTerms: buildManifestSignals(envelope, repoPaths).queryTerms,
      repoPaths,
      preferredSlugs: seedSlugs,
      taskType: envelope.taskType
    }
  });

  return {
    manifestLoaded,
    query,
    seedSlugs,
    prunedCandidates,
    retrieve
  };
}

export function wikiMemoryEntries(
  _repoRoot: string,
  slugs: string[],
  seedSlugs: string[],
  sectionHits?: Array<{ slug: string; heading: string; anchor: string }>
) {
  const seedSet = new Set(seedSlugs);
  const sectionsBySlug = new Map<string, string[]>();
  for (const hit of sectionHits ?? []) {
    const bucket = sectionsBySlug.get(hit.slug) ?? [];
    bucket.push(`${hit.heading} (#${hit.anchor})`);
    sectionsBySlug.set(hit.slug, bucket);
  }

  return slugs.map((slug) => {
    const sectionLabels = sectionsBySlug.get(slug);
    const sectionNote = sectionLabels?.length
      ? ` Sections: ${sectionLabels.slice(0, 3).join("; ")}.`
      : "";
    return {
      path: `.agentos/memory/wiki/${slugToRelativePath(slug)}`,
      reason: seedSet.has(slug)
        ? `Manifest-scored wiki seed.${sectionNote}`
        : `Wiki graph expansion (section-ranked).${sectionNote}`
    };
  });
}
