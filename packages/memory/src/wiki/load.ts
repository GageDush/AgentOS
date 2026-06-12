import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseFrontmatter, titleFromBody } from "./frontmatter";
import { uniqueLinkSlugs } from "./links";
import { isWikiMetaPath, relativePathToSlug, slugToAbsolutePath, wikiRoot } from "./paths";
import type { WikiArticle, WikiArticleSummary } from "./types";

function walkMarkdownFiles(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(absolute, base));
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;
    const rel = relative(base, absolute).replace(/\\/g, "/");
    if (isWikiMetaPath(rel)) continue;
    files.push(absolute);
  }

  return files;
}

function fileUpdatedAt(path: string) {
  try {
    return statSync(path).mtime.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

export function listWikiArticles(repoRoot: string): WikiArticleSummary[] {
  const root = wikiRoot(repoRoot);
  const files = walkMarkdownFiles(root);
  const summaries: WikiArticleSummary[] = [];

  for (const filePath of files) {
    const rel = relative(root, filePath).replace(/\\/g, "/");
    const slug = relativePathToSlug(rel);
    const raw = readFileSync(filePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw, slug);
    summaries.push({
      slug: frontmatter.slug,
      title: frontmatter.title || titleFromBody(raw, slug),
      tags: frontmatter.tags ?? [],
      path: rel,
      updatedAt: fileUpdatedAt(filePath),
      archived: Boolean(frontmatter.archived)
    });
  }

  return summaries.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function loadWikiArticle(repoRoot: string, slug: string): WikiArticle | undefined {
  const filePath = slugToAbsolutePath(repoRoot, slug);
  if (!existsSync(filePath)) return undefined;

  const raw = readFileSync(filePath, "utf8");
  const rel = relative(wikiRoot(repoRoot), filePath).replace(/\\/g, "/");
  const fallbackSlug = relativePathToSlug(rel);
  const { frontmatter, body } = parseFrontmatter(raw, fallbackSlug);
  const outboundLinks = uniqueLinkSlugs(body);

  return {
    slug: frontmatter.slug,
    title: frontmatter.title || titleFromBody(body, frontmatter.slug),
    tags: frontmatter.tags ?? [],
    path: rel,
    updatedAt: fileUpdatedAt(filePath),
    archived: Boolean(frontmatter.archived),
    frontmatter,
    body,
    outboundLinks
  };
}
