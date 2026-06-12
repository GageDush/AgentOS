import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { buildWikiGraph, expandWikiContext, getWikiBacklinks, listWikiArticles, loadWikiArticle, parseWikilinks, searchWikiArticles } from "./index";
import { wikiRoot } from "./paths";

function seedMiniWiki(repoRoot: string) {
  const root = wikiRoot(repoRoot);
  mkdirSync(join(root, "packages"), { recursive: true });
  mkdirSync(join(root, "flows"), { recursive: true });

  writeFileSync(
    join(root, "index.md"),
    `---
slug: index
title: AgentOS Wiki
tags: [home]
---
# AgentOS Wiki

Start here. See [[packages/runtime]] and [[flows/test-commands]].
`
  );

  writeFileSync(
    join(root, "packages", "runtime.md"),
    `---
slug: packages/runtime
title: Runtime package
tags: [runtime, gates]
---
# Runtime

Mission execution lives in [[areas/risk-areas]].
`
  );

  writeFileSync(
    join(root, "flows", "test-commands.md"),
    `---
slug: flows/test-commands
title: Test commands
tags: [qa]
---
# Test commands

Run \`pnpm test\` and \`pnpm typecheck\`.
`
  );

  mkdirSync(join(root, "areas"), { recursive: true });
  writeFileSync(
    join(root, "areas", "risk-areas.md"),
    `---
slug: areas/risk-areas
title: Risk areas
---
# Risk areas

Sensitive: packages/runtime.
`
  );
}

describe("wiki", () => {
  it("parses wikilinks with optional heading and label", () => {
    const links = parseWikilinks("See [[packages/runtime]] and [[flows/test-commands#commands|Commands]].");
    expect(links).toEqual([
      { slug: "packages/runtime" },
      { slug: "flows/test-commands", heading: "commands", label: "Commands" }
    ]);
  });

  it("lists and loads articles", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-"));
    seedMiniWiki(repoRoot);

    const summaries = listWikiArticles(repoRoot);
    expect(summaries.map((item) => item.slug)).toContain("packages/runtime");

    const article = loadWikiArticle(repoRoot, "packages/runtime");
    expect(article?.title).toBe("Runtime package");
    expect(article?.outboundLinks).toContain("areas/risk-areas");
  });

  it("builds backlink graph", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-"));
    seedMiniWiki(repoRoot);

    const graph = buildWikiGraph(repoRoot);
    expect(graph.inbound["packages/runtime"]).toContain("index");
    expect(graph.outbound["index"]).toContain("packages/runtime");

    const backlinks = getWikiBacklinks(repoRoot, "areas/risk-areas");
    expect(backlinks.map((item) => item.slug)).toContain("packages/runtime");
  });

  it("searches articles by keyword", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-"));
    seedMiniWiki(repoRoot);

    const hits = searchWikiArticles(repoRoot, "typecheck");
    expect(hits[0]?.slug).toBe("flows/test-commands");
  });

  it("expands context within hop and char budgets", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-"));
    seedMiniWiki(repoRoot);

    const result = expandWikiContext(repoRoot, "runtime mission gates", {
      maxHops: 2,
      maxChars: 12000,
      maxArticles: 6
    });

    expect(result.seedSlugs.length).toBeGreaterThan(0);
    expect(result.slugs).toContain("packages/runtime");
    expect(result.slugs).toContain("areas/risk-areas");
    expect(result.chars).toBeGreaterThan(0);
    expect(result.sectionCount).toBeGreaterThan(0);
    expect(result.sections.length).toBeGreaterThan(0);
  });
});
