import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { rebuildWikiManifest } from "./index-manifest";
import { expandWikiContext, searchWikiArticles } from "./retrieve";
import {
  composeSectionExcerpt,
  parseArticleSections,
  scoreWikiSection,
  sectionIndexFromBody
} from "./sections";
import { wikiRoot } from "./paths";

function seedSectionWiki(repoRoot: string) {
  const root = wikiRoot(repoRoot);
  mkdirSync(join(root, "packages"), { recursive: true });

  writeFileSync(
    join(root, "packages", "runtime.md"),
    `---
slug: packages/runtime
title: Runtime package
tags: [runtime, gates]
---
# Runtime package

\`packages/runtime\` owns mission execution.

## Flow

Classify and route missions through the spine.

## Gates

QA, security, review, and release gates run via gateway commands.

## Related

See [[flows/test-commands]].
`
  );

  rebuildWikiManifest(repoRoot);
}

describe("wiki sections", () => {
  it("parses markdown sections with anchors", () => {
    const sections = parseArticleSections("packages/runtime", `# Title

Intro paragraph.

## Flow

Step one.

## Gates

Gate details.
`);

    expect(sections.map((section) => section.heading)).toEqual(["Overview", "Flow", "Gates"]);
    expect(sections[1]?.anchor).toBe("flow");
  });

  it("indexes sections for manifest", () => {
    const indexed = sectionIndexFromBody(`# Runtime

## Gates

Run \`pnpm test\` before release.
`);
    const gates = indexed.find((row) => row.heading === "Gates");
    expect(gates?.entities).toContain("pnpm test");
  });

  it("scores sections with multi-signal weighting", () => {
    const sections = parseArticleSections("packages/runtime", `## Gates\n\nGateway QA commands.\n## Flow\n\nRouting.`);
    const gates = sections.find((section) => section.heading === "Gates");
    expect(gates).toBeDefined();

    const gatesScore = scoreWikiSection(gates!, {
      queryTerms: ["gate", "qa"],
      repoPaths: [],
      seedSlugs: new Set(["packages/runtime"]),
      hopBySlug: new Map([["packages/runtime", 0]]),
      articleSlug: "packages/runtime",
      articleTitle: "Runtime package",
      articleTags: ["runtime", "gates"],
      preferredHeadings: ["gates"]
    });

    const flowScore = scoreWikiSection(sections.find((section) => section.heading === "Flow")!, {
      queryTerms: ["gate", "qa"],
      repoPaths: [],
      seedSlugs: new Set(["packages/runtime"]),
      hopBySlug: new Map([["packages/runtime", 0]]),
      articleSlug: "packages/runtime",
      articleTitle: "Runtime package",
      articleTags: ["runtime", "gates"],
      preferredHeadings: ["gates"]
    });

    expect(gatesScore).toBeGreaterThan(flowScore);
  });

  it("expands section-ranked context within char budget", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-sections-"));
    seedSectionWiki(repoRoot);

    const result = expandWikiContext(repoRoot, "runtime gates qa", {
      maxChars: 500,
      maxSections: 2,
      seedSlugs: ["packages/runtime"],
      signals: {
        queryTerms: ["gate", "qa", "runtime"],
        repoPaths: ["packages/runtime/src/index.ts"],
        taskType: "bug_fix"
      }
    });

    expect(result.sectionCount).toBeGreaterThan(0);
    expect(result.sections.some((section) => section.heading === "Gates")).toBe(true);
    expect(result.chars).toBeLessThanOrEqual(500);
    expect(result.articles[0]?.body).toContain("## Gates");
    expect(result.articles[0]?.body).not.toMatch(/## Related/);
  });

  it("searches manifest sections before full articles", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-sections-"));
    seedSectionWiki(repoRoot);

    const hits = searchWikiArticles(repoRoot, "gateway qa");
    expect(hits.some((hit) => hit.slug === "packages/runtime" && hit.sectionHeading === "Gates")).toBe(true);
  });

  it("composes excerpt from selected sections", () => {
    const excerpt = composeSectionExcerpt("Runtime package", [
      { heading: "Gates", content: "Gate details." }
    ]);
    expect(excerpt).toContain("# Runtime package");
    expect(excerpt).toContain("## Gates");
  });
});
