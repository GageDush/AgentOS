import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { buildMemoryUpdateFromReport, processMemoryUpdate } from "./memory-curator";

describe("memory-curator", () => {
  const prevWiki = process.env.FEATURE_MEMORY_WIKI;
  const prevWrite = process.env.AGENTOS_MEMORY_WIKI_WRITE;

  afterEach(() => {
    if (prevWiki === undefined) delete process.env.FEATURE_MEMORY_WIKI;
    else process.env.FEATURE_MEMORY_WIKI = prevWiki;
    if (prevWrite === undefined) delete process.env.AGENTOS_MEMORY_WIKI_WRITE;
    else process.env.AGENTOS_MEMORY_WIKI_WRITE = prevWrite;
  });

  it("queues low-confidence updates", () => {    const update = buildMemoryUpdateFromReport(
      {
        agent: "code-implementer",
        status: "complete",
        summary: "Updated runtime",
        changedFiles: ["packages/runtime/src/index.ts"],
        commandsRun: ["pnpm test"]
      },
      { missionId: "m1", runId: "r1" }
    );
    expect(update.suggestedMemoryKeys.length).toBeGreaterThan(0);
    const result = processMemoryUpdate({ ...update, confidence: 0.5 });
    expect(result.status).toBe("queued");
  });

  it("merges high-confidence updates into wiki when enabled", () => {
    process.env.FEATURE_MEMORY_WIKI = "true";
    process.env.AGENTOS_MEMORY_WIKI_WRITE = "true";
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-curator-wiki-"));
    const update = buildMemoryUpdateFromReport(
      {
        agent: "code-implementer",
        status: "complete",
        summary: "Wiki merge test",
        changedFiles: ["packages/agents/src/memory-curator.ts"],
        commandsRun: ["pnpm test"]
      },
      { missionId: "m-wiki", runId: "r-wiki" }
    );
    const result = processMemoryUpdate({ ...update, confidence: 0.9 }, repoRoot);
    expect(result.appliedWikiSlugs?.length).toBeGreaterThan(0);
    expect(result.status).toBe("complete");
  });
});
