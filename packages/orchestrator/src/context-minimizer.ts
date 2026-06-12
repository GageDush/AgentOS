import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContextPacket, TaskEnvelope } from "@agentos/shared";
import { findRepoRoot } from "@agentos/persistence";
import {
  buildWikiContextForEnvelope,
  extractRiskAreasFromWiki,
  isMemoryWikiEnabled,
  wikiMemoryEntries
} from "@agentos/memory";

const MEMORY_CANDIDATES = [
  "repo-map.md",
  "test-commands.md",
  "dependency-graph.md",
  "code-ownership-map.md",
  "risk-areas.md"
] as const;

const COMMAND_SUGGESTIONS: Record<string, string[]> = {
  qa: ["pnpm test", "pnpm typecheck"],
  bug_fix: ["pnpm test", "git diff --stat"],
  code_change: ["pnpm typecheck", "git diff --stat"],
  repo_analysis: ["git ls-files", "pnpm -r list --depth -1"],
  config: ["pnpm typecheck"],
  security: ["pnpm sanitize:check"],
  release: ["git status", "git diff --stat"]
};

function inferContextBudget(envelope: TaskEnvelope): ContextPacket["contextBudget"] {
  if (envelope.contextBudgetTokens >= 10000) return "large";
  if (envelope.contextBudgetTokens >= 6000) return "medium";
  return "small";
}

function extractPathsFromCommand(command: string): string[] {
  const paths = new Set<string>();
  const patterns = [
    /\b(?:apps|packages|scripts|docs|infra)\/[A-Za-z0-9_./-]+/g,
    /\b[A-Za-z0-9_./-]+\.(?:ts|tsx|js|mjs|json|md|sql|css)\b/g
  ];
  for (const pattern of patterns) {
    for (const match of command.matchAll(pattern)) {
      paths.add(match[0].replace(/['"`]/g, ""));
    }
  }
  return [...paths];
}

function loadLegacyMemoryFiles(memoryDir: string) {
  const memoryIncluded: ContextPacket["memoryIncluded"] = [];
  const riskAreas: string[] = [];

  for (const fileName of MEMORY_CANDIDATES) {
    const filePath = join(memoryDir, fileName);
    if (!existsSync(filePath)) continue;
    memoryIncluded.push({
      path: `.agentos/memory/${fileName}`,
      reason: "Cached repo memory available for deterministic context."
    });
    if (fileName === "risk-areas.md") {
      const content = readFileSync(filePath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.replace(/^[-*]\s*/, "").trim();
        if (trimmed && !trimmed.startsWith("#")) riskAreas.push(trimmed);
      }
    }
  }

  return { memoryIncluded, riskAreas };
}

function loadWikiMemoryContext(
  repoRoot: string,
  envelope: TaskEnvelope,
  repoPaths: string[],
  command: string
) {
  const wiki = buildWikiContextForEnvelope(repoRoot, envelope, { command, repoPaths });
  const memoryIncluded = wiki.retrieve.slugs.length
    ? wikiMemoryEntries(repoRoot, wiki.retrieve.slugs, wiki.seedSlugs, wiki.retrieve.sections)
    : [];

  const wikiRisks = extractRiskAreasFromWiki(repoRoot, wiki.retrieve.slugs);
  const notes: string[] = [];

  if (wiki.manifestLoaded) {
    notes.push(
      `Wiki manifest-first: ${wiki.retrieve.sectionCount} sections from ${wiki.retrieve.slugs.length} articles (${wiki.retrieve.chars} chars); ${wiki.prunedCandidates} low-signal candidates pruned.`
    );
  } else {
    notes.push("Wiki manifest missing; keyword search + graph expansion used.");
  }

  if (wiki.seedSlugs.length) {
    notes.push(`Manifest seeds: ${wiki.seedSlugs.join(", ")}.`);
  }

  return {
    memoryIncluded,
    riskAreas: wikiRisks,
    wikiSlugs: wiki.retrieve.slugs,
    wikiChars: wiki.retrieve.chars,
    wikiSectionCount: wiki.retrieve.sectionCount,
    notes
  };
}

export function buildContextPacket(
  envelope: TaskEnvelope,
  options?: { repoRoot?: string; command?: string }
): ContextPacket {
  const repoRoot = options?.repoRoot ?? findRepoRoot();
  const memoryDir = join(repoRoot, ".agentos", "memory");
  const command = options?.command ?? envelope.inScope[0] ?? "";

  const commandPaths = extractPathsFromCommand(command);
  const envelopePaths = envelope.filesInScope.filter(Boolean);
  const repoPaths = [...new Set([...envelopePaths, ...commandPaths])].slice(0, 12);

  let memoryIncluded: ContextPacket["memoryIncluded"] = [];
  let riskAreas: string[] = [];
  let wikiSlugs: string[] | undefined;
  let wikiChars: number | undefined;
  let wikiSectionCount: number | undefined;
  const notes: string[] = [];

  if (isMemoryWikiEnabled()) {
    const wikiContext = loadWikiMemoryContext(repoRoot, envelope, repoPaths, command);
    memoryIncluded = wikiContext.memoryIncluded;
    riskAreas = wikiContext.riskAreas;
    wikiSlugs = wikiContext.wikiSlugs;
    wikiChars = wikiContext.wikiChars;
    wikiSectionCount = wikiContext.wikiSectionCount;
    notes.push(...wikiContext.notes);

    if (!memoryIncluded.length) {
      const legacy = loadLegacyMemoryFiles(memoryDir);
      memoryIncluded = legacy.memoryIncluded;
      riskAreas = legacy.riskAreas.length ? legacy.riskAreas : riskAreas;
      notes.push("Wiki returned no articles; fell back to legacy flat memory files.");
    } else {
      notes.push("Legacy flat memory files skipped (FEATURE_MEMORY_WIKI=true).");
    }
  } else {
    const legacy = loadLegacyMemoryFiles(memoryDir);
    memoryIncluded = legacy.memoryIncluded;
    riskAreas = legacy.riskAreas;
    if (memoryIncluded.length === 0) {
      notes.push("Repo memory cache is empty; consider running repo-cartographer during downtime.");
    }
  }

  const filesIncluded = repoPaths.map((path) => ({
    path,
    reason: commandPaths.includes(path) ? "Referenced by mission command." : "Listed in task envelope scope.",
    mode: envelope.complexity === "complex" ? ("full" as const) : ("excerpt" as const)
  }));

  const suggestedCommands = COMMAND_SUGGESTIONS[envelope.taskType] ?? ["pnpm typecheck"];
  if (command && !suggestedCommands.includes(command)) {
    suggestedCommands.unshift(command);
  }

  const excludedContext: ContextPacket["excludedContext"] = [
    { path: "full conversation transcript", reason: "Not required for deterministic routing." },
    { path: "unrelated apps/", reason: "Out of scope for this envelope." }
  ];

  if (isMemoryWikiEnabled()) {
    for (const fileName of MEMORY_CANDIDATES) {
      excludedContext.push({
        path: `.agentos/memory/${fileName}`,
        reason: "Superseded by wiki manifest retrieval."
      });
    }
  }

  if (repoPaths.length === 0) {
    notes.push("No file paths inferred; downstream agents should search likely folders first.");
  }

  return {
    agent: "context-minimizer",
    status: "complete",
    contextBudget: inferContextBudget(envelope),
    repoPaths,
    riskAreas: riskAreas.slice(0, 8),
    suggestedCommands: suggestedCommands.slice(0, 6),
    maxTokenBudget: envelope.contextBudgetTokens,
    filesIncluded,
    memoryIncluded,
    excludedContext,
    notes,
    wikiSlugs,
    wikiChars,
    wikiSectionCount
  };
}
