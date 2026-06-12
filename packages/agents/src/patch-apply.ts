import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { findRepoRoot } from "@agentos/persistence";

export type PatchApplyResult = {
  ok: boolean;
  changedFiles: string[];
  error?: string;
};

export function extractUnifiedDiffFromText(text: string): string | undefined {
  const fenced = text.match(/```(?:diff)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced?.includes("@@")) return fenced;
  const raw = text.match(/(^|\n)diff --git[\s\S]*/)?.[0]?.trim();
  if (raw?.includes("@@")) return raw;
  const hunkOnly = text.match(/(^|\n)@@\s+-\d+,\d+\s+\+\d+,\d+[\s\S]*/)?.[0]?.trim();
  return hunkOnly?.includes("@@") ? hunkOnly : undefined;
}

export function parseChangedFilesFromDiff(diffText: string): string[] {
  const files = new Set<string>();
  for (const match of diffText.matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)) {
    files.add(match[2]);
  }
  for (const match of diffText.matchAll(/^\+\+\+ b\/(.+)$/gm)) {
    files.add(match[1]);
  }
  return [...files];
}

function assertPathAllowed(repoRoot: string, filePath: string, allowedPaths?: string[]) {
  const absolute = resolve(repoRoot, filePath);
  const rel = relative(repoRoot, absolute).replace(/\\/g, "/");
  if (rel.startsWith("..") || rel.includes("/.git/")) {
    throw new Error(`Patch path outside repo: ${filePath}`);
  }
  if (allowedPaths?.length) {
    const allowed = allowedPaths.some((scope) => rel === scope || rel.startsWith(`${scope}/`));
    if (!allowed) throw new Error(`Patch path not in scope: ${rel}`);
  }
  return rel;
}

type FileHunk = {
  filePath: string;
  hunks: Array<{ oldStart: number; oldLines: string[]; newLines: string[] }>;
};

function parseFileHunks(diffText: string): FileHunk[] {
  const blocks = diffText.split(/^diff --git /m).filter(Boolean);
  const results: FileHunk[] = [];

  for (const block of blocks) {
    const fileMatch = block.match(/^a\/(.+?) b\/(.+?)\n/m);
    if (!fileMatch) continue;
    const filePath = fileMatch[2];
    const hunks: FileHunk["hunks"] = [];
    const hunkParts = block.split(/^@@ /m).slice(1);

    for (const part of hunkParts) {
      const header = part.match(/^-(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (!header) continue;
      const oldStart = Number(header[1]);
      const lines = part.split("\n").slice(1);
      const oldLines: string[] = [];
      const newLines: string[] = [];
      for (const line of lines) {
        if (!line || line.startsWith("\\")) continue;
        if (line.startsWith("-")) oldLines.push(line.slice(1));
        else if (line.startsWith("+")) newLines.push(line.slice(1));
        else {
          const context = line.startsWith(" ") ? line.slice(1) : line;
          oldLines.push(context);
          newLines.push(context);
        }
      }
      hunks.push({ oldStart, oldLines, newLines });
    }

    if (hunks.length) results.push({ filePath, hunks });
  }

  return results;
}

function applyHunksToContent(content: string, hunks: FileHunk["hunks"]) {
  const lines = content.split("\n");
  let offset = 0;

  for (const hunk of hunks) {
    const start = hunk.oldStart - 1 + offset;
    const slice = lines.slice(start, start + hunk.oldLines.length);
    const matches =
      slice.length === hunk.oldLines.length && slice.every((line, index) => line === hunk.oldLines[index]);
    if (!matches) {
      throw new Error(`Hunk context mismatch at line ${hunk.oldStart}`);
    }
    lines.splice(start, hunk.oldLines.length, ...hunk.newLines);
    offset += hunk.newLines.length - hunk.oldLines.length;
  }

  return lines.join("\n");
}

export function applyUnifiedDiff(
  diffText: string,
  repoRoot = findRepoRoot(),
  allowedPaths?: string[]
): PatchApplyResult {
  try {
    const fileHunks = parseFileHunks(diffText);
    if (!fileHunks.length) {
      return { ok: false, changedFiles: [], error: "No applicable hunks in patch." };
    }

    const changedFiles: string[] = [];
    for (const file of fileHunks) {
      const rel = assertPathAllowed(repoRoot, file.filePath, allowedPaths);
      const absolute = join(repoRoot, rel);
      mkdirSync(dirname(absolute), { recursive: true });
      const existing = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
      const next = applyHunksToContent(existing, file.hunks);
      writeFileSync(absolute, next.endsWith("\n") || !next ? next : `${next}\n`, "utf8");
      changedFiles.push(normalize(rel).replace(/\\/g, "/"));
    }

    return { ok: true, changedFiles };
  } catch (error) {
    return {
      ok: false,
      changedFiles: [],
      error: error instanceof Error ? error.message : "Patch apply failed."
    };
  }
}

export function parseChangedFilesFromGitNameOnly(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
