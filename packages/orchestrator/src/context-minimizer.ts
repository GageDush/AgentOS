import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContextPacket, TaskEnvelope } from "@agentos/shared";
import { findRepoRoot } from "@agentos/persistence";

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

function loadMemoryFiles(memoryDir: string) {
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

export function buildContextPacket(
  envelope: TaskEnvelope,
  options?: { repoRoot?: string; command?: string }
): ContextPacket {
  const repoRoot = options?.repoRoot ?? findRepoRoot();
  const memoryDir = join(repoRoot, ".agentos", "memory");
  const command = options?.command ?? envelope.inScope[0] ?? "";
  const { memoryIncluded, riskAreas } = loadMemoryFiles(memoryDir);

  const commandPaths = extractPathsFromCommand(command);
  const envelopePaths = envelope.filesInScope.filter(Boolean);
  const repoPaths = [...new Set([...envelopePaths, ...commandPaths])].slice(0, 12);

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

  const notes: string[] = [];
  if (memoryIncluded.length === 0) {
    notes.push("Repo memory cache is empty; consider running repo-cartographer during downtime.");
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
    notes
  };
}
