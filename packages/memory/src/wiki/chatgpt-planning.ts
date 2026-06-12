import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { nowIso } from "@agentos/shared";
import { redactSecrets } from "./redact";
import { rebuildWikiManifest } from "./index-manifest";
import { upsertWikiArticle } from "./writer";

export const CHATGPT_AGENTOS_PROJECT_URL =
  "https://chatgpt.com/g/g-p-6a1a7068c4688191830b4109f595a807-agentos/project";

export const CHATGPT_AGENTOS_PROJECT_ID = "g-p-6a1a7068c4688191830b4109f595a807-agentos";

const BUNDLE_MARKDOWN_PATHS = [
  "AgentOS_Project_Bundle/README.md",
  "AgentOS_Project_Bundle/AGENTOS_MASTER_CODEX_PROMPT.md",
  "AgentOS_Project_Bundle/SIMPLE_CODEX_STEPS.md",
  "AgentOS_Project_Bundle/CODEX_REPAIR_PROMPT.md",
  "AgentOS_Project_Bundle/asset_prompts/GENERATED_ASSET_PROMPTS.md",
  "AgentOS_Project_Bundle/docs/ASSET_MANIFEST_AND_NEEDS.md",
  "AgentOS_Project_Bundle/docs/MEMORY_AND_TOKEN_SYSTEMS.md",
  "AgentOS_Project_Bundle/docs/PHASER_OFFICE_IMPLEMENTATION_PLAN.md",
  "AgentOS_Project_Bundle/docs/SANITIZATION_POLICY.md"
];

export type ChatGptPlanningDoc = {
  sourceId: string;
  sourcePath: string;
  sourceKind: "import" | "bundle-disk" | "bundle-git";
  title: string;
  body: string;
  updatedAt: string;
  contentHash: string;
};

export type ChatGptWikiSyncState = {
  version: 1;
  sources: Record<string, { contentHash: string; indexedAt: string }>;
  lastSyncAt?: string;
};

export type ChatGptWikiSyncResult = {
  indexed: number;
  updated: number;
  skipped: number;
  articleSlugs: string[];
  sources: string[];
  errors: string[];
};

function importsDir(repoRoot: string) {
  return join(repoRoot, ".agentos", "imports", "chatgpt");
}

function statePath(repoRoot: string) {
  return join(repoRoot, ".agentos", "state", "chatgpt-wiki-sync.json");
}

function hashContent(content: string) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function planningDocWikiSlug(doc: ChatGptPlanningDoc) {
  const base = slugifySegment(basename(doc.sourcePath, ".md"));
  return `planning/chatgpt/${base || slugifySegment(doc.sourceId)}`;
}

function titleFromMarkdown(content: string, fallback: string) {
  const match = content.match(/^#\s+(.+)$/m);
  return redactSecrets((match?.[1] ?? fallback).trim()).slice(0, 140);
}

function extractHeadings(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("#"))
    .slice(0, 12)
    .map((line) => line.replace(/^#+\s*/, ""));
}

function buildPlanningArticleBody(doc: ChatGptPlanningDoc) {
  const headings = extractHeadings(doc.body);
  const preview = doc.body
    .replace(/^---[\s\S]*?---\s*/m, "")
    .trim()
    .slice(0, 12000);

  return [
    `# ${doc.title}`,
    "",
    "OG AgentOS planning material from the ChatGPT project board.",
    "",
    "## Metadata",
    "",
    `- Source path: \`${doc.sourcePath}\``,
    `- Source kind: ${doc.sourceKind}`,
    `- ChatGPT project: [AgentOS planning board](${CHATGPT_AGENTOS_PROJECT_URL})`,
    `- Updated: ${doc.updatedAt}`,
    "",
    headings.length ? "## Outline\n\n" + headings.map((h) => `- ${h}`).join("\n") : "",
    "",
    "## Content",
    "",
    preview,
    preview.length < doc.body.length ? "\n\n_(truncated for wiki; full text kept in import source.)_" : "",
    "",
    "## Related",
    "",
    "- [[planning/chatgpt/index]]",
    "- [[planning/chatgpt/agentos-project]]",
    "- [[index]]"
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPlanningIndexBody(docs: ChatGptPlanningDoc[]) {
  const sorted = [...docs].sort((a, b) => a.title.localeCompare(b.title));
  return [
    "# ChatGPT planning board (AgentOS)",
    "",
    `Canonical ChatGPT project: [AgentOS planning board](${CHATGPT_AGENTOS_PROJECT_URL})`,
    "",
    "Indexed from the original project bundle and any markdown dropped in `.agentos/imports/chatgpt/`.",
    "",
    "## Indexed documents",
    "",
    "| Article | Source | Updated |",
    "| --- | --- | --- |",
    ...sorted.map((doc) => {
      const slug = planningDocWikiSlug(doc);
      return `| [[${slug}]] | \`${doc.sourcePath}\` | ${doc.updatedAt.slice(0, 10)} |`;
    }),
    "",
    "## Refresh",
    "",
    "- Drop new ChatGPT exports (`.md`) into `.agentos/imports/chatgpt/`",
    "- Run `pnpm wiki:sync-chatgpt`",
    "- API: `POST /memory/wiki/sync-chatgpt`",
    "",
    "## Related",
    "",
    "- [[planning/chatgpt/agentos-project]]",
    "- [[docs/overview]]",
    "- [[flows/cursor-memory]]"
  ].join("\n");
}

function buildProjectMetaBody(docs: ChatGptPlanningDoc[]) {
  return [
    "# AgentOS ChatGPT project",
    "",
    `Live board: [${CHATGPT_AGENTOS_PROJECT_URL}](${CHATGPT_AGENTOS_PROJECT_URL})`,
    "",
    "This wiki mirrors planning artifacts from the original ChatGPT AgentOS project. The live board requires login; local imports and the git-preserved `AgentOS_Project_Bundle` supply the indexed copy.",
    "",
    "## What was captured",
    "",
    `- Documents indexed: **${docs.length}**`,
    "- Master Codex prompt, repair prompt, simple steps",
    "- Phaser office plan, asset manifest, memory/token design, sanitization policy",
    "",
    "## How to add more",
    "",
    "1. In ChatGPT, open the project and export or copy chat markdown.",
    "2. Save files under `.agentos/imports/chatgpt/` (one topic per file).",
    "3. Run `pnpm wiki:sync-chatgpt`.",
    "",
    "## Related",
    "",
    "- [[planning/chatgpt/index]]",
    "- [[docs/agentos-session-context]]",
    "- [[index]]"
  ].join("\n");
}

export function loadChatGptWikiSyncState(repoRoot: string): ChatGptWikiSyncState {
  const path = statePath(repoRoot);
  if (!existsSync(path)) return { version: 1, sources: {} };
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ChatGptWikiSyncState;
  } catch {
    return { version: 1, sources: {} };
  }
}

export function saveChatGptWikiSyncState(repoRoot: string, state: ChatGptWikiSyncState) {
  const dir = join(repoRoot, ".agentos", "state");
  mkdirSync(dir, { recursive: true });
  writeFileSync(statePath(repoRoot), JSON.stringify(state, null, 2), "utf8");
}

function readGitBundleMarkdown(repoRoot: string, relPath: string): string | undefined {
  try {
    const raw = execSync(`git show HEAD:${relPath.replace(/\\/g, "/")}`, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return redactSecrets(raw);
  } catch {
    return undefined;
  }
}

function listImportMarkdown(repoRoot: string) {
  const dir = importsDir(repoRoot);
  if (!existsSync(dir)) return [] as ChatGptPlanningDoc[];

  const docs: ChatGptPlanningDoc[] = [];

  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const abs = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith(".md") || entry.name.toLowerCase() === "readme.md") continue;
      const raw = redactSecrets(readFileSync(abs, "utf8"));
      const rel = relative(repoRoot, abs).replace(/\\/g, "/");
      const stat = statSync(abs);
      docs.push({
        sourceId: rel,
        sourcePath: rel,
        sourceKind: "import",
        title: titleFromMarkdown(raw, basename(entry.name, ".md")),
        body: raw,
        updatedAt: stat.mtime.toISOString(),
        contentHash: hashContent(raw)
      });
    }
  }

  walk(dir);
  return docs;
}

function listBundleDiskMarkdown(repoRoot: string) {
  const bundleRoot = join(repoRoot, "AgentOS_Project_Bundle");
  if (!existsSync(bundleRoot)) return [] as ChatGptPlanningDoc[];

  const docs: ChatGptPlanningDoc[] = [];

  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const abs = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      const raw = redactSecrets(readFileSync(abs, "utf8"));
      const rel = relative(repoRoot, abs).replace(/\\/g, "/");
      const stat = statSync(abs);
      docs.push({
        sourceId: rel,
        sourcePath: rel,
        sourceKind: "bundle-disk",
        title: titleFromMarkdown(raw, basename(entry.name, ".md")),
        body: raw,
        updatedAt: stat.mtime.toISOString(),
        contentHash: hashContent(raw)
      });
    }
  }

  walk(bundleRoot);
  return docs;
}

function listBundleGitMarkdown(repoRoot: string) {
  const docs: ChatGptPlanningDoc[] = [];
  for (const relPath of BUNDLE_MARKDOWN_PATHS) {
    const raw = readGitBundleMarkdown(repoRoot, relPath);
    if (!raw?.trim()) continue;
    docs.push({
      sourceId: `git:${relPath}`,
      sourcePath: relPath,
      sourceKind: "bundle-git",
      title: titleFromMarkdown(raw, basename(relPath, ".md")),
      body: raw,
      updatedAt: nowIso(),
      contentHash: hashContent(raw)
    });
  }
  return docs;
}

export function collectChatGptPlanningDocs(repoRoot: string) {
  const byPath = new Map<string, ChatGptPlanningDoc>();

  for (const doc of listBundleGitMarkdown(repoRoot)) {
    byPath.set(doc.sourcePath, doc);
  }
  for (const doc of listBundleDiskMarkdown(repoRoot)) {
    byPath.set(doc.sourcePath, doc);
  }
  for (const doc of listImportMarkdown(repoRoot)) {
    byPath.set(doc.sourceId, doc);
  }

  return [...byPath.values()];
}

export function syncChatGptPlanningToWiki(
  repoRoot: string,
  options?: { full?: boolean }
): ChatGptWikiSyncResult {
  const state = loadChatGptWikiSyncState(repoRoot);
  const docs = collectChatGptPlanningDocs(repoRoot);
  const articleSlugs: string[] = [];
  const sources: string[] = [];
  let indexed = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const doc of docs) {
    try {
      const prev = state.sources[doc.sourceId];
      const changed = options?.full || !prev || prev.contentHash !== doc.contentHash;
      if (!changed) {
        skipped += 1;
        continue;
      }

      const slug = planningDocWikiSlug(doc);
      upsertWikiArticle(
        repoRoot,
        slug,
        doc.title,
        ["chatgpt", "planning", "og-board", doc.sourceKind],
        buildPlanningArticleBody(doc),
        { sourceAgent: "memory-curator", runId: `chatgpt-${doc.contentHash}` }
      );

      articleSlugs.push(slug);
      sources.push(doc.sourcePath);
      if (prev) updated += 1;
      else indexed += 1;

      state.sources[doc.sourceId] = {
        contentHash: doc.contentHash,
        indexedAt: nowIso()
      };
    } catch (error) {
      errors.push(`${doc.sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  upsertWikiArticle(
    repoRoot,
    "planning/chatgpt/index",
    "ChatGPT planning board",
    ["chatgpt", "planning", "index"],
    buildPlanningIndexBody(docs),
    { sourceAgent: "memory-curator", runId: "chatgpt-index" }
  );

  upsertWikiArticle(
    repoRoot,
    "planning/chatgpt/agentos-project",
    "AgentOS ChatGPT project",
    ["chatgpt", "planning", "project"],
    buildProjectMetaBody(docs),
    { sourceAgent: "memory-curator", runId: "chatgpt-project" }
  );

  state.lastSyncAt = nowIso();
  saveChatGptWikiSyncState(repoRoot, state);
  rebuildWikiManifest(repoRoot);

  return { indexed, updated, skipped, articleSlugs, sources, errors };
}

export function ensureChatGptImportReadme(repoRoot: string) {
  const dir = importsDir(repoRoot);
  mkdirSync(dir, { recursive: true });
  const readme = join(dir, "README.md");
  if (existsSync(readme)) return;

  writeFileSync(
    readme,
    [
      "# ChatGPT planning imports",
      "",
      `Drop markdown exports from the [AgentOS ChatGPT project](${CHATGPT_AGENTOS_PROJECT_URL}) here.`,
      "",
      "## Steps",
      "",
      "1. Open the ChatGPT project in your browser.",
      "2. Copy or export conversation markdown into this folder (`.md` files).",
      "3. Run `pnpm wiki:sync-chatgpt` from the repo root.",
      "",
      "Files named `README.md` are ignored. Secrets are redacted before wiki write."
    ].join("\n"),
    "utf8"
  );
}
