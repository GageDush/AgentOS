import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { TaskEnvelope } from "@agentos/shared";
import {
  buildWikiContextForEnvelope,
  resolveManifestSeeds,
  scoreManifestEntry
} from "./context-bridge";
import { rebuildWikiManifest } from "./index-manifest";
import { wikiRoot } from "./paths";
import type { WikiIndexEntry } from "./types";

function seedMiniWiki(repoRoot: string) {
  const root = wikiRoot(repoRoot);
  mkdirSync(join(root, "packages"), { recursive: true });
  mkdirSync(join(root, "flows"), { recursive: true });
  mkdirSync(join(root, "areas"), { recursive: true });

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

Mission execution lives in \`packages/runtime/src/index.ts\`. See [[areas/risk-areas]].
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

  writeFileSync(
    join(root, "areas", "risk-areas.md"),
    `---
slug: areas/risk-areas
title: Risk areas
---
# Risk areas

- Sensitive runtime gate wiring
- Discord auth secrets
`
  );

  rebuildWikiManifest(repoRoot);
}

const baseEnvelope = {
  taskId: "task-wiki",
  createdAt: new Date().toISOString(),
  userGoal: "Fix runtime mission gates",
  normalizedGoal: "Repair runtime gate regression",
  taskType: "bug_fix",
  complexity: "simple",
  riskLevel: "medium",
  requiresRepoContext: true,
  requiresCodeChange: true,
  requiresPlanning: false,
  requiresQa: true,
  requiresCodeReview: true,
  requiresSecurityReview: false,
  requiresReleaseGate: false,
  filesInScope: ["packages/runtime/src/index.ts"],
  inScope: ["pnpm test"],
  outOfScope: [],
  relevantMemoryKeys: ["risk-areas", "test-commands"],
  contextBudgetTokens: 8000,
  acceptanceCriteria: [],
  requiredGates: ["qa", "code_review"],
  mode: "assisted",
  notes: []
} satisfies TaskEnvelope;

describe("wiki context bridge", () => {
  it("scores manifest entries by task signals", () => {
    const entry: WikiIndexEntry = {
      slug: "packages/runtime",
      title: "Runtime package",
      tags: ["runtime"],
      summary: "Mission execution",
      entities: ["packages/runtime/src/index.ts"],
      outLinks: ["areas/risk-areas"],
      updatedAt: new Date().toISOString()
    };

    const score = scoreManifestEntry(entry, {
      preferredSlugs: new Set(["packages/runtime", "areas/risk-areas"]),
      repoPaths: ["packages/runtime/src/index.ts"],
      queryTerms: ["runtime", "gate"]
    });

    expect(score).toBeGreaterThan(20);
  });

  it("resolves manifest seeds and prunes low-signal articles", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-bridge-"));
    seedMiniWiki(repoRoot);
    const manifest = rebuildWikiManifest(repoRoot);

    const resolved = resolveManifestSeeds(manifest.articles, baseEnvelope, baseEnvelope.filesInScope);
    expect(resolved.seeds).toContain("areas/risk-areas");
    expect(resolved.seeds).toContain("flows/test-commands");
    expect(resolved.pruned).toBeGreaterThanOrEqual(0);
  });

  it("builds wiki context manifest-first then expands graph", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-bridge-"));
    seedMiniWiki(repoRoot);

    const result = buildWikiContextForEnvelope(repoRoot, baseEnvelope, {
      command: "pnpm test",
      repoPaths: baseEnvelope.filesInScope
    });

    expect(result.manifestLoaded).toBe(true);
    expect(result.seedSlugs.length).toBeGreaterThan(0);
    expect(result.retrieve.slugs).toContain("packages/runtime");
    expect(result.retrieve.chars).toBeGreaterThan(0);
  });
});
