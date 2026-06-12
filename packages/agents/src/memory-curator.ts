import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyWikiEdits,
  isMemoryWikiEnabled,
  isMemoryWikiWriteEnabled,
  proposeWikiMerges
} from "@agentos/memory";
import { findRepoRoot } from "@agentos/persistence";
import type { AgentReport, MemoryCuratorResult, MemoryUpdateEnvelope } from "@agentos/shared";

const MEMORY_KEY_TO_FILE: Record<string, string> = {
  "repo-map": "repo-map.md",
  "test-commands": "test-commands.md",
  "dependency-graph": "dependency-graph.md",
  "code-ownership-map": "code-ownership-map.md",
  "risk-areas": "risk-areas.md"
};

function memoryDir(repoRoot: string) {
  return join(repoRoot, ".agentos", "memory");
}

const REPEAT_KEY_BOOST: Record<string, number> = {};

function appendMemoryNote(filePath: string, note: string) {
  const header = `\n\n## Update ${new Date().toISOString().slice(0, 10)}\n`;
  const existing = existsSync(filePath) ? readFileSync(filePath, "utf8") : `# Memory\n`;
  if (existing.includes(note.slice(0, 80))) return;
  writeFileSync(filePath, `${existing.trimEnd()}${header}- ${note}\n`, "utf8");
}

/** Drop stale dated sections older than maxAgeDays (legacy flat files only). */
export function decayStaleMemoryNotes(repoRoot = findRepoRoot(), maxAgeDays = 30): number {
  if (isMemoryWikiEnabled()) return 0;
  const dir = memoryDir(repoRoot);
  if (!existsSync(dir)) return 0;
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let pruned = 0;

  for (const fileName of Object.values(MEMORY_KEY_TO_FILE)) {
    const filePath = join(dir, fileName);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, "utf8");
    const sections = content.split(/\n## Update /);
    if (sections.length <= 2) continue;

    const kept = [sections[0]];
    for (const section of sections.slice(1)) {
      const dateMatch = section.match(/^(\d{4}-\d{2}-\d{2})/);
      const sectionDate = dateMatch ? Date.parse(dateMatch[1]) : Date.now();
      if (sectionDate >= cutoff) {
        kept.push(`## Update ${section}`);
      } else {
        pruned += 1;
      }
    }
    if (kept.length !== sections.length) {
      writeFileSync(filePath, kept.join("\n").trimEnd() + "\n", "utf8");
    }
  }
  return pruned;
}

function effectiveConfidence(update: MemoryUpdateEnvelope, key: string) {
  const repeats = (REPEAT_KEY_BOOST[key] ?? 0) + 1;
  REPEAT_KEY_BOOST[key] = repeats;
  const boost = Math.min(0.12, repeats * 0.03);
  return Math.min(0.98, update.confidence + boost);
}

export function buildMemoryUpdateFromReport(
  report: AgentReport,
  input: { missionId?: string; runId?: string }
): MemoryUpdateEnvelope {
  const areas = report.changedFiles?.slice(0, 6) ?? [];
  const keys: string[] = [];
  if (report.testsRun?.length || report.commandsRun?.some((c) => /test|typecheck/i.test(c))) {
    keys.push("test-commands");
  }
  if (report.risks?.length) keys.push("risk-areas");
  if (areas.some((p) => p.includes("packages/"))) keys.push("dependency-graph");
  if (areas.length) keys.push("code-ownership-map");

  return {
    sourceAgent: report.agent,
    missionId: input.missionId,
    runId: input.runId,
    areasTouched: areas,
    artifacts: [...(report.commandsRun ?? []), ...(report.testsRun ?? [])].slice(0, 6),
    suggestedMemoryKeys: keys.length ? keys : ["repo-map"],
    confidence: report.status === "complete" ? 0.82 : 0.55,
    summary: report.summary.slice(0, 400)
  };
}

function processLegacyMemoryUpdate(update: MemoryUpdateEnvelope, repoRoot: string): MemoryCuratorResult {
  const dir = memoryDir(repoRoot);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const appliedKeys: string[] = [];
  const queuedKeys: string[] = [];
  const note = `${update.sourceAgent}: ${update.summary ?? update.areasTouched.join(", ")}`;

  for (const key of update.suggestedMemoryKeys) {
    const fileName = MEMORY_KEY_TO_FILE[key] ?? `${key}.md`;
    const filePath = join(dir, fileName);
    const confidence = effectiveConfidence(update, key);
    if (confidence >= 0.85) {
      appendMemoryNote(filePath, note);
      appliedKeys.push(key);
    } else {
      queuedKeys.push(key);
    }
  }

  const status = appliedKeys.length ? "complete" : queuedKeys.length ? "queued" : "skipped";
  return {
    agent: "memory-curator",
    status,
    summary:
      status === "complete"
        ? `Memory curator applied ${appliedKeys.length} legacy memory key(s).`
        : status === "queued"
          ? `Memory curator queued ${queuedKeys.length} legacy update(s) for operator review.`
          : "Memory curator had no applicable keys.",
    appliedKeys,
    queuedKeys
  };
}

function processWikiMemoryUpdate(update: MemoryUpdateEnvelope, repoRoot: string): MemoryCuratorResult {
  const wikiEdits = proposeWikiMerges(update, repoRoot);
  const confidence = update.confidence;
  const source = {
    sourceAgent: update.sourceAgent,
    missionId: update.missionId,
    runId: update.runId
  };

  if (confidence >= 0.85 && isMemoryWikiWriteEnabled()) {
    const appliedWikiSlugs = applyWikiEdits(repoRoot, wikiEdits, source);
    return {
      agent: "memory-curator",
      status: appliedWikiSlugs.length ? "complete" : "skipped",
      summary: appliedWikiSlugs.length
        ? `Memory curator merged ${appliedWikiSlugs.length} wiki article(s): ${appliedWikiSlugs.join(", ")}.`
        : "Memory curator found no new wiki facts to merge.",
      appliedKeys: [],
      queuedKeys: [],
      appliedWikiSlugs
    };
  }

  return {
    agent: "memory-curator",
    status: "queued",
    summary: `Memory curator queued ${wikiEdits.length} wiki edit(s) for operator review.`,
    appliedKeys: [],
    queuedKeys: [],
    queuedWikiEdits: wikiEdits
  };
}

export function processMemoryUpdate(update: MemoryUpdateEnvelope, repoRoot = findRepoRoot()): MemoryCuratorResult {
  if (isMemoryWikiEnabled()) {
    return processWikiMemoryUpdate(update, repoRoot);
  }
  return processLegacyMemoryUpdate(update, repoRoot);
}

export function applyMemoryKeys(update: MemoryUpdateEnvelope, keys: string[], repoRoot = findRepoRoot()) {
  if (isMemoryWikiEnabled()) {
    const wikiEdits = update.wikiEdits?.length ? update.wikiEdits : proposeWikiMerges(update, repoRoot);
    applyWikiEdits(repoRoot, wikiEdits, {
      sourceAgent: update.sourceAgent,
      missionId: update.missionId,
      runId: update.runId
    });
    return;
  }

  const dir = memoryDir(repoRoot);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const note = `${update.sourceAgent}: ${update.summary ?? update.areasTouched.join(", ")}`;
  for (const key of keys) {
    const fileName = MEMORY_KEY_TO_FILE[key] ?? `${key}.md`;
    appendMemoryNote(join(dir, fileName), note);
  }
}

export function applyWikiMemoryEdits(update: MemoryUpdateEnvelope, repoRoot = findRepoRoot()) {
  const wikiEdits = update.wikiEdits ?? proposeWikiMerges(update, repoRoot);
  return applyWikiEdits(repoRoot, wikiEdits, {
    sourceAgent: update.sourceAgent,
    missionId: update.missionId,
    runId: update.runId
  });
}
