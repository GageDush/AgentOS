import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type { TaskEnvelope } from "@agentos/shared";
import { rebuildWikiManifest } from "@agentos/memory";
import { buildContextPacket } from "./context-minimizer";

const baseEnvelope = {
  taskId: "task-1",
  createdAt: new Date().toISOString(),
  userGoal: "Fix auth regression",
  normalizedGoal: "Repair login bug",
  taskType: "bug_fix",
  complexity: "simple",
  riskLevel: "low",
  requiresRepoContext: true,
  requiresCodeChange: true,
  requiresPlanning: false,
  requiresQa: true,
  requiresCodeReview: true,
  requiresSecurityReview: false,
  requiresReleaseGate: false,
  filesInScope: [],
  inScope: ["git diff apps/api/src/auth.ts"],
  outOfScope: [],
  relevantMemoryKeys: [],
  contextBudgetTokens: 4000,
  acceptanceCriteria: [],
  requiredGates: ["qa", "code_review"],
  mode: "assisted",
  notes: []
} satisfies TaskEnvelope;

function seedMiniWiki(repoRoot: string) {
  const root = join(repoRoot, ".agentos", "memory", "wiki");
  mkdirSync(join(root, "packages"), { recursive: true });
  mkdirSync(join(root, "flows"), { recursive: true });
  mkdirSync(join(root, "areas"), { recursive: true });

  writeFileSync(
    join(root, "index.md"),
    `---
slug: index
title: AgentOS Wiki
---
# AgentOS Wiki
`
  );

  writeFileSync(
    join(root, "packages", "runtime.md"),
    `---
slug: packages/runtime
title: Runtime package
---
# Runtime
`
  );

  writeFileSync(
    join(root, "flows", "test-commands.md"),
    `---
slug: flows/test-commands
title: Test commands
---
# Test commands
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
`
  );

  rebuildWikiManifest(repoRoot);
}

describe("buildContextPacket", () => {
  const prevWiki = process.env.FEATURE_MEMORY_WIKI;

  afterEach(() => {
    if (prevWiki === undefined) delete process.env.FEATURE_MEMORY_WIKI;
    else process.env.FEATURE_MEMORY_WIKI = prevWiki;
  });

  it("returns a compact packet with inferred paths and memory hints", () => {
    const packet = buildContextPacket(baseEnvelope, {
      command: "git diff apps/api/src/auth.ts"
    });
    expect(packet.agent).toBe("context-minimizer");
    expect(packet.status).toBe("complete");
    expect(packet.repoPaths).toContain("apps/api/src/auth.ts");
    expect(packet.suggestedCommands.length).toBeGreaterThan(0);
    expect(packet.maxTokenBudget).toBe(4000);
    expect(packet.memoryIncluded.some((entry) => entry.path.includes("risk-areas.md"))).toBe(true);
  });

  it("infers repo paths from mission goal text when the command has no paths", () => {
    const packet = buildContextPacket(
      {
        ...baseEnvelope,
        userGoal: "Fix bug in packages/agents/src/tool-broker.ts export function",
        normalizedGoal: "Fix bug in packages/agents/src/tool-broker.ts export function"
      },
      { command: "pnpm typecheck" }
    );
    expect(packet.repoPaths).toContain("packages/agents/src/tool-broker.ts");
  });

  it("caps file scope for simple envelopes", () => {
    const packet = buildContextPacket(baseEnvelope);
    for (const file of packet.filesIncluded) {
      expect(file.mode).toBe("excerpt");
    }
  });

  it("uses wiki manifest-first context when FEATURE_MEMORY_WIKI is enabled", () => {
    process.env.FEATURE_MEMORY_WIKI = "true";
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-context-wiki-"));
    seedMiniWiki(repoRoot);

    const envelope = {
      ...baseEnvelope,
      normalizedGoal: "Fix runtime mission gates",
      filesInScope: ["packages/runtime/src/index.ts"],
      relevantMemoryKeys: ["risk-areas", "test-commands"]
    };

    const packet = buildContextPacket(envelope, {
      repoRoot,
      command: "pnpm test"
    });

    expect(packet.wikiSlugs?.length).toBeGreaterThan(0);
    expect(packet.memoryIncluded.some((entry) => entry.path.includes(".agentos/memory/wiki/"))).toBe(true);
    expect(packet.excludedContext.some((entry) => entry.reason.includes("Superseded by wiki"))).toBe(true);
    expect(packet.notes.some((note) => note.includes("manifest-first"))).toBe(true);
  });
});
