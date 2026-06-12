import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { MemoryUpdateEnvelope } from "@agentos/shared";
import { loadWikiManifest } from "./index-manifest";
import { slugToAbsolutePath } from "./paths";
import { applyWikiEdit, proposeWikiMerges } from "./writer";

const baseUpdate = {
  sourceAgent: "code-implementer",
  missionId: "mission-1",
  runId: "run-1",
  areasTouched: ["packages/runtime/src/index.ts"],
  artifacts: ["pnpm test"],
  suggestedMemoryKeys: ["test-commands"],
  confidence: 0.9,
  summary: "Updated runtime gate handling."
} satisfies MemoryUpdateEnvelope;

describe("wiki writer", () => {
  it("proposes merges for mapped memory keys and package paths", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-write-"));
    const proposals = proposeWikiMerges(baseUpdate, repoRoot);
    expect(proposals.some((item) => item.targetSlug === "flows/test-commands")).toBe(true);
    expect(proposals.some((item) => item.targetSlug === "packages/runtime")).toBe(true);
  });

  it("applies merge into section and rebuilds manifest", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-write-"));
    const [proposal] = proposeWikiMerges(baseUpdate, repoRoot);
    const result = applyWikiEdit(repoRoot, proposal, {
      sourceAgent: "code-implementer",
      missionId: "mission-1",
      runId: "run-1"
    });
    expect(result.applied).toBe(true);
    const filePath = slugToAbsolutePath(repoRoot, proposal.targetSlug);
    expect(existsSync(filePath)).toBe(true);
    const raw = readFileSync(filePath, "utf8");
    expect(raw).toContain("Updated runtime gate handling");
    expect(raw).toContain("## Runbook");
    const manifest = loadWikiManifest(repoRoot);
    expect(manifest?.articles.some((article) => article.slug === proposal.targetSlug)).toBe(true);
  });

  it("dedupes identical merge patches", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-wiki-write-"));
    const [proposal] = proposeWikiMerges(baseUpdate, repoRoot);
    applyWikiEdit(repoRoot, proposal);
    const second = applyWikiEdit(repoRoot, proposal);
    expect(second.applied).toBe(false);
  });
});
