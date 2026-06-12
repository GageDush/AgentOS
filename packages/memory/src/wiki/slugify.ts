import type { MemoryUpdateEnvelope } from "@agentos/shared";
import { normalizeWikiSlug } from "./paths";

export const MEMORY_KEY_TO_WIKI_SLUG: Record<string, string> = {
  "repo-map": "areas/repo-layout",
  "test-commands": "flows/test-commands",
  "dependency-graph": "areas/dependency-graph",
  "code-ownership-map": "areas/code-ownership",
  "risk-areas": "areas/risk-areas"
};

export function slugifyPathSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function inferWikiSlugsFromEnvelope(update: MemoryUpdateEnvelope): string[] {
  const slugs = new Set<string>();

  for (const key of update.suggestedMemoryKeys) {
    const mapped = MEMORY_KEY_TO_WIKI_SLUG[key];
    if (mapped) slugs.add(mapped);
  }

  for (const area of update.areasTouched) {
    const normalized = area.replace(/\\/g, "/");
    const packageMatch = normalized.match(/^(packages\/[a-z0-9-]+)/i);
    if (packageMatch) {
      slugs.add(normalizeWikiSlug(packageMatch[1]));
    }
    const appMatch = normalized.match(/^(apps\/[a-z0-9-]+)/i);
    if (appMatch) {
      slugs.add(normalizeWikiSlug(`areas/${appMatch[1].replace(/\//g, "-")}`));
    }
  }

  if (update.artifacts.some((item) => /test|typecheck|lint/i.test(item))) {
    slugs.add("flows/test-commands");
  }

  if (!slugs.size) {
    slugs.add("index");
  }

  return [...slugs];
}

export function defaultSectionForSlug(slug: string) {
  if (slug.startsWith("flows/")) return "Runbook";
  if (slug.startsWith("packages/")) return "Mission notes";
  if (slug.startsWith("areas/")) return "Observations";
  if (slug.startsWith("sessions/")) return "Session log";
  if (slug.startsWith("planning/")) return "Planning notes";
  return "Mission notes";
}

export function titleFromSlug(slug: string) {
  const leaf = slug.split("/").pop() ?? slug;
  return leaf
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
