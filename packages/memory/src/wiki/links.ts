import type { WikiLinkRef } from "./types";
import { normalizeWikiSlug } from "./paths";

const WIKI_LINK_PATTERN = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function parseWikilinks(markdown: string): WikiLinkRef[] {
  const links: WikiLinkRef[] = [];
  for (const match of markdown.matchAll(WIKI_LINK_PATTERN)) {
    const slug = normalizeWikiSlug(match[1] ?? "");
    if (!slug) continue;
    links.push({
      slug,
      heading: match[2]?.trim() || undefined,
      label: match[3]?.trim() || undefined
    });
  }
  return links;
}

export function uniqueLinkSlugs(markdown: string) {
  return [...new Set(parseWikilinks(markdown).map((link) => link.slug))];
}
