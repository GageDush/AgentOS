import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentRoutingDecisionRecord, RouteTaskType } from "@agentos/shared";
import { findRepoRoot } from "@agentos/persistence";
import { nowIso } from "@agentos/shared";

export type MissionRouteCacheEntry = {
  normalizedGoal: string;
  goalHash: string;
  taskType: RouteTaskType;
  primaryAgentId: string;
  supportingAgentIds: string[];
  hitCount: number;
  createdAt: string;
  lastUsedAt: string;
};

const ROUTE_CACHE_VERSION = 2;

type MissionRouteCacheFile = {
  version: typeof ROUTE_CACHE_VERSION;
  entries: MissionRouteCacheEntry[];
};

function cachePath(repoRoot: string) {
  return join(repoRoot, ".agentos", "state", "mission-route-cache.json");
}

function normalizeGoal(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

export function hashNormalizedGoal(text: string) {
  const normalized = normalizeGoal(text);
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `goal-${Math.abs(hash)}`;
}

function loadCache(repoRoot: string): MissionRouteCacheFile {
  const path = cachePath(repoRoot);
  if (!existsSync(path)) return { version: ROUTE_CACHE_VERSION, entries: [] };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as MissionRouteCacheFile;
    if (parsed.version !== ROUTE_CACHE_VERSION) return { version: ROUTE_CACHE_VERSION, entries: [] };
    return parsed;
  } catch {
    return { version: ROUTE_CACHE_VERSION, entries: [] };
  }
}

function saveCache(repoRoot: string, file: MissionRouteCacheFile) {
  const path = cachePath(repoRoot);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(file, null, 2), "utf8");
}

function tokenizeGoal(text: string) {
  return new Set(
    normalizeGoal(text)
      .split(" ")
      .filter((token) => token.length > 2)
  );
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

export function semanticGoalSimilarity(goalA: string, goalB: string) {
  return jaccardSimilarity(tokenizeGoal(goalA), tokenizeGoal(goalB));
}

export function lookupSimilarMissionRoute(
  goalText: string,
  repoRoot = findRepoRoot(),
  options?: { minSemanticScore?: number }
): MissionRouteCacheEntry | undefined {
  const minSemanticScore = options?.minSemanticScore ?? 0.82;
  const hash = hashNormalizedGoal(goalText);
  const cache = loadCache(repoRoot);
  const exact = cache.entries.find((entry) => entry.goalHash === hash);
  if (exact) return exact;

  const tokens = tokenizeGoal(goalText);
  let best: { entry: MissionRouteCacheEntry; score: number } | undefined;
  for (const entry of cache.entries) {
    const score = jaccardSimilarity(tokens, tokenizeGoal(entry.normalizedGoal));
    if (score >= minSemanticScore && (!best || score > best.score)) {
      best = { entry, score };
    }
  }
  return best?.entry;
}

export function recordMissionRouteCache(
  goalText: string,
  route: Pick<AgentRoutingDecisionRecord, "taskType" | "selectedPrimaryAgentId" | "supportingAgentIds">,
  repoRoot = findRepoRoot()
): MissionRouteCacheEntry {
  const hash = hashNormalizedGoal(goalText);
  const cache = loadCache(repoRoot);
  const existing = cache.entries.find((entry) => entry.goalHash === hash);
  const timestamp = nowIso();

  if (existing) {
    existing.hitCount += 1;
    existing.lastUsedAt = timestamp;
    existing.primaryAgentId = route.selectedPrimaryAgentId;
    existing.supportingAgentIds = [...route.supportingAgentIds];
    existing.taskType = route.taskType;
    saveCache(repoRoot, cache);
    return existing;
  }

  const entry: MissionRouteCacheEntry = {
    normalizedGoal: normalizeGoal(goalText),
    goalHash: hash,
    taskType: route.taskType,
    primaryAgentId: route.selectedPrimaryAgentId,
    supportingAgentIds: [...route.supportingAgentIds],
    hitCount: 1,
    createdAt: timestamp,
    lastUsedAt: timestamp
  };
  cache.entries.unshift(entry);
  cache.entries = cache.entries.slice(0, 200);
  saveCache(repoRoot, cache);
  return entry;
}

export function applyMissionRouteCacheHint(
  route: AgentRoutingDecisionRecord,
  goalText: string,
  repoRoot = findRepoRoot()
): AgentRoutingDecisionRecord {
  const exactHash = hashNormalizedGoal(goalText);
  const hit = lookupSimilarMissionRoute(goalText, repoRoot);
  if (!hit) return route;

  const semanticScore = semanticGoalSimilarity(goalText, hit.normalizedGoal);
  const isExact = hit.goalHash === exactHash;
  const minHits = isExact ? 2 : 1;
  const minSemantic = isExact ? 0 : 0.88;
  if (hit.hitCount < minHits && semanticScore < minSemantic) return route;
  if (hit.taskType !== route.taskType) return route;
  if (hit.primaryAgentId !== route.selectedPrimaryAgentId && !isExact) return route;

  return {
    ...route,
    selectedPrimaryAgentId: hit.primaryAgentId,
    reason: `${route.reason} Mission cache hint applied (${isExact ? "exact" : "semantic"} match, ${hit.hitCount} prior hits).`,
    metadata: {
      ...route.metadata,
      missionCacheHit: hit,
      missionCacheSemanticScore: Number(semanticScore.toFixed(3))
    }
  };
}
