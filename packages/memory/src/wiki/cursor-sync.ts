import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MemoryUpdateEnvelope } from "@agentos/shared";
import { nowIso } from "@agentos/shared";
import {
  buildSessionWikiBody,
  findCursorTranscriptsDir,
  listCursorTranscriptFiles,
  loadCursorSessionSummary,
  sessionWikiSlug,
  type CursorSessionSummary
} from "./cursor-transcripts";
import { rebuildWikiManifest } from "./index-manifest";
import { applyWikiEdits, proposeWikiMerges, upsertWikiArticle } from "./writer";

export type CursorWikiSyncState = {
  version: 1;
  transcriptsDir?: string;
  files: Record<string, { size: number; mtimeMs: number; lineCount: number }>;
  lastSyncAt?: string;
};

export type CursorWikiSyncResult = {
  transcriptsDir: string;
  indexed: number;
  updated: number;
  skipped: number;
  sessionSlugs: string[];
  crossLinks: string[];
  errors: string[];
};

function statePath(repoRoot: string) {
  return join(repoRoot, ".agentos", "state", "cursor-wiki-sync.json");
}

export function loadCursorWikiSyncState(repoRoot: string): CursorWikiSyncState {
  const path = statePath(repoRoot);
  if (!existsSync(path)) {
    return { version: 1, files: {} };
  }
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CursorWikiSyncState;
  } catch {
    return { version: 1, files: {} };
  }
}

export function saveCursorWikiSyncState(repoRoot: string, state: CursorWikiSyncState) {
  const dir = join(repoRoot, ".agentos", "state");
  mkdirSync(dir, { recursive: true });
  writeFileSync(statePath(repoRoot), JSON.stringify(state, null, 2), "utf8");
}

function countLines(content: string) {
  return content.split(/\r?\n/).filter((line) => line.trim()).length;
}

function buildSessionIndexBody(sessions: CursorSessionSummary[]) {
  const primary = sessions.filter((session) => !session.isSubagent);
  const subagents = sessions.filter((session) => session.isSubagent);

  const lines = [
    "# Cursor chat sessions",
    "",
    "Auto-synced from Cursor `agent-transcripts` (secrets redacted).",
    "",
    "## Primary sessions",
    "",
    "| Session | Title | Messages | Updated |",
    "| --- | --- | ---: | --- |",
    ...primary
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(
        (session) =>
          `| [[sessions/cursor/${session.sessionId}]] | ${session.title.replace(/\|/g, "/")} | ${session.messageCount} | ${session.updatedAt.slice(0, 10)} |`
      ),
    "",
    "## Subagent sessions",
    "",
    ...(subagents.length
      ? subagents
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map(
            (session) =>
              `- [[sessions/cursor/subagents/${session.sessionId}]] — ${session.title.slice(0, 100)} (${session.messageCount} msgs)`
          )
      : ["- _(none)_"]),
    "",
    "## Related",
    "",
    "- [[flows/cursor-memory]]",
    "- [[index]]"
  ];

  return lines.join("\n");
}

function buildCursorMemoryFlowBody(sessions: CursorSessionSummary[]) {
  const recent = sessions
    .filter((session) => !session.isSubagent)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 12);

  return [
    "# Cursor memory flow",
    "",
    "Rolling digest of Cursor IDE sessions for this repo. Updated by `AGENTOS_CURSOR_WIKI_SYNC`.",
    "",
    "## Recent session themes",
    "",
    ...recent.map((session) => `- **${session.title.slice(0, 100)}** → [[${sessionWikiSlug(session)}]]`),
    "",
    "## Runbook",
    "",
    "- `pnpm wiki:sync-cursor` — incremental sync",
    "- `pnpm wiki:sync-cursor --full` — reindex all sessions",
    "- API: `POST /memory/wiki/sync-cursor`",
    "",
    "## Related",
    "",
    "- [[sessions/cursor/index]]",
    "- [[flows/memory-curator]]"
  ].join("\n");
}

export function buildMemoryUpdateFromCursorSession(
  summary: CursorSessionSummary,
  missionId?: string
): MemoryUpdateEnvelope {
  return {
    sourceAgent: "memory-curator",
    missionId,
    runId: `cursor-${summary.sessionId}`,
    areasTouched: summary.filesMentioned.slice(0, 8),
    artifacts: ["cursor-transcript"],
    suggestedMemoryKeys: ["repo-map"],
    confidence: 0.9,
    summary: `Cursor: ${summary.title.slice(0, 180)}`
  };
}

function applyCrossLinks(repoRoot: string, sessions: CursorSessionSummary[]) {
  const applied: string[] = [];
  for (const session of sessions) {
    if (!session.packagesMentioned.length && !session.outcomes.length) continue;
    const update = buildMemoryUpdateFromCursorSession(session);
    const wikiEdits = proposeWikiMerges(update, repoRoot).filter(
      (edit) => !edit.targetSlug.startsWith("sessions/")
    );
    if (!wikiEdits.length) continue;
    const slugs = applyWikiEdits(repoRoot, wikiEdits, {
      sourceAgent: "memory-curator",
      runId: `cursor-${session.sessionId}`
    });
    applied.push(...slugs);
  }
  return [...new Set(applied)];
}

export function syncCursorSessionsToWiki(
  repoRoot: string,
  options?: { full?: boolean; transcriptsDir?: string; applyCrossLinks?: boolean }
): CursorWikiSyncResult {
  const transcriptsDir = options?.transcriptsDir ?? findCursorTranscriptsDir(repoRoot);
  if (!transcriptsDir) {
    throw new Error(
      "Cursor transcripts directory not found. Set AGENTOS_CURSOR_TRANSCRIPTS_DIR or open this repo in Cursor first."
    );
  }

  const state = loadCursorWikiSyncState(repoRoot);
  const files = listCursorTranscriptFiles(transcriptsDir);
  const summaries: CursorSessionSummary[] = [];
  const sessionSlugs: string[] = [];
  let indexed = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const file of files) {
    try {
      const stat = statSync(file.absPath);
      const raw = readFileSync(file.absPath, "utf8");
      const lineCount = countLines(raw);
      const prev = state.files[file.relPath];
      const changed =
        options?.full ||
        !prev ||
        prev.size !== stat.size ||
        prev.mtimeMs !== stat.mtimeMs ||
        prev.lineCount !== lineCount;

      if (!changed) {
        skipped += 1;
        continue;
      }

      const summary = loadCursorSessionSummary(file.absPath, file.relPath, file.sessionId);
      summaries.push(summary);
      const slug = sessionWikiSlug(summary);
      sessionSlugs.push(slug);

      upsertWikiArticle(
        repoRoot,
        slug,
        summary.title.slice(0, 120),
        ["cursor", "session", summary.isSubagent ? "subagent" : "chat"],
        buildSessionWikiBody(summary),
        { sourceAgent: "memory-curator", runId: `cursor-${summary.sessionId}` }
      );

      if (prev) updated += 1;
      else indexed += 1;

      state.files[file.relPath] = {
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        lineCount
      };
    } catch (error) {
      errors.push(`${file.relPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const allSummaries = files.map((file) => {
    try {
      return loadCursorSessionSummary(file.absPath, file.relPath, file.sessionId);
    } catch {
      return null;
    }
  }).filter(Boolean) as CursorSessionSummary[];

  upsertWikiArticle(
    repoRoot,
    "sessions/cursor/index",
    "Cursor chat sessions",
    ["cursor", "sessions", "index"],
    buildSessionIndexBody(allSummaries),
    { sourceAgent: "memory-curator", runId: "cursor-index" }
  );

  upsertWikiArticle(
    repoRoot,
    "flows/cursor-memory",
    "Cursor memory flow",
    ["cursor", "memory", "flow"],
    buildCursorMemoryFlowBody(allSummaries),
    { sourceAgent: "memory-curator", runId: "cursor-flow" }
  );

  let crossLinks: string[] = [];
  if (options?.applyCrossLinks !== false && summaries.length) {
    crossLinks = applyCrossLinks(repoRoot, summaries);
  }

  state.transcriptsDir = transcriptsDir;
  state.lastSyncAt = nowIso();
  saveCursorWikiSyncState(repoRoot, state);
  rebuildWikiManifest(repoRoot);

  return {
    transcriptsDir,
    indexed,
    updated,
    skipped,
    sessionSlugs,
    crossLinks,
    errors
  };
}
