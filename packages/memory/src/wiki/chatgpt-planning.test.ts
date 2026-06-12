import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CHATGPT_AGENTOS_PROJECT_URL,
  collectChatGptPlanningDocs,
  planningDocWikiSlug,
  syncChatGptPlanningToWiki
} from "./chatgpt-planning";

const monorepoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..", "..");

describe("chatgpt planning wiki", () => {
  it("collects bundle markdown from git when available", () => {
    const repoRoot = monorepoRoot;
    try {
      execSync("git rev-parse HEAD", { cwd: repoRoot, stdio: "ignore" });
    } catch {
      return;
    }

    const docs = collectChatGptPlanningDocs(repoRoot);
    expect(docs.some((doc) => doc.sourcePath.includes("AGENTOS_MASTER_CODEX_PROMPT"))).toBe(true);
  });

  it("indexes import markdown into planning/chatgpt articles", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-chatgpt-wiki-"));
    const importDir = join(repoRoot, ".agentos", "imports", "chatgpt");
    mkdirSync(importDir, { recursive: true });
    writeFileSync(
      join(importDir, "north-star.md"),
      "# North star\n\nLocal-first AgentOS command center.\n",
      "utf8"
    );

    const result = syncChatGptPlanningToWiki(repoRoot, { full: true });
    expect(result.indexed).toBeGreaterThanOrEqual(1);
    expect(result.articleSlugs).toContain("planning/chatgpt/north-star");
    expect(CHATGPT_AGENTOS_PROJECT_URL).toContain("chatgpt.com");
  });
});

describe("planningDocWikiSlug", () => {
  it("slugifies source filenames", () => {
    expect(
      planningDocWikiSlug({
        sourceId: "x",
        sourcePath: "AgentOS_Project_Bundle/AGENTOS_MASTER_CODEX_PROMPT.md",
        sourceKind: "bundle-git",
        title: "Master",
        body: "",
        updatedAt: new Date().toISOString(),
        contentHash: "abc"
      })
    ).toBe("planning/chatgpt/agentos-master-codex-prompt");
  });
});
