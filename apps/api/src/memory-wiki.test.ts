import { describe, expect, it } from "vitest";
import { findRepoRoot } from "@agentos/persistence";
import {
  getWikiBacklinks,
  listWikiArticles,
  loadWikiArticle,
  searchWikiArticles
} from "@agentos/memory";

const repoRoot = findRepoRoot(process.cwd());

describe("memory wiki (repo)", () => {
  it("lists seeded wiki articles", () => {
    const articles = listWikiArticles(repoRoot);
    const slugs = articles.map((article) => article.slug);
    expect(slugs).toContain("index");
    expect(slugs).toContain("flows/test-commands");
    expect(slugs).toContain("packages/runtime");
  });

  it("loads article with outbound wikilinks", () => {
    const article = loadWikiArticle(repoRoot, "packages/runtime");
    expect(article?.title).toBe("Runtime package");
    expect(article?.outboundLinks.length).toBeGreaterThan(0);
  });

  it("resolves backlinks", () => {
    const backlinks = getWikiBacklinks(repoRoot, "flows/test-commands");
    expect(backlinks.some((item) => item.slug === "index")).toBe(true);
  });

  it("searches by keyword", () => {
    const hits = searchWikiArticles(repoRoot, "typecheck");
    expect(hits.some((hit) => hit.slug === "flows/test-commands")).toBe(true);
  });
});
