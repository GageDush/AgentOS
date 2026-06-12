import { join } from "node:path";

export const WIKI_DIR_NAME = "wiki";

export function wikiRoot(repoRoot: string) {
  return join(repoRoot, ".agentos", "memory", WIKI_DIR_NAME);
}

/** Normalize user/wiki slug: lowercase, trim, collapse slashes. */
export function normalizeWikiSlug(raw: string) {
  return raw
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

export function slugToRelativePath(slug: string) {
  const normalized = normalizeWikiSlug(slug);
  if (!normalized || normalized === "index") return "index.md";
  return `${normalized}.md`;
}

export function slugToAbsolutePath(repoRoot: string, slug: string) {
  return join(wikiRoot(repoRoot), slugToRelativePath(slug));
}

export function relativePathToSlug(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/\.md$/i, "");
  if (normalized === "index" || normalized.endsWith("/index")) {
    return normalized === "index" ? "index" : normalized.replace(/\/index$/, "") || "index";
  }
  return normalizeWikiSlug(normalized);
}

export function isWikiMetaPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  return normalized.startsWith("_meta/") || normalized.includes("/_meta/");
}
