import type { TaskEnvelope } from "@agentos/shared";

export type ReviewScheduleContext = {
  envelope: TaskEnvelope;
  /** ISO timestamp of last code review audit for this mission/run */
  lastReviewAt?: string;
  /** ISO timestamp of last commit touching tracked files */
  lastCommitAt?: string;
  /** git diff --stat line count (insertions + deletions) in rolling window */
  linesChangedRecent?: number;
  /** Per-file change ratio 0–1 for up to 5 tracked files (existing files only) */
  fileChangeRatios?: number[];
  /** Hash of last reviewed diff stat (skip duplicate) */
  lastReviewDiffHash?: string;
  currentDiffHash?: string;
  now?: Date;
};

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;

/**
 * Adaptive code review scheduling (Q13).
 * Returns true when the code-reviewer agent / review gate should run.
 */
export function shouldScheduleCodeReview(ctx: ReviewScheduleContext): boolean {
  const { envelope } = ctx;
  if (!envelope.requiresCodeReview) return false;
  if (envelope.taskType === "answer_only") return false;

  const now = ctx.now ?? new Date();

  if (
    ctx.currentDiffHash &&
    ctx.lastReviewDiffHash &&
    ctx.currentDiffHash === ctx.lastReviewDiffHash &&
    ctx.lastReviewAt
  ) {
    return false;
  }

  if (!ctx.lastReviewAt) return true;

  const lastReviewMs = new Date(ctx.lastReviewAt).getTime();
  const lastCommitMs = ctx.lastCommitAt ? new Date(ctx.lastCommitAt).getTime() : 0;
  const msSinceReview = now.getTime() - lastReviewMs;

  if (msSinceReview >= SIX_HOURS_MS && lastCommitMs > lastReviewMs) {
    return true;
  }

  if ((ctx.linesChangedRecent ?? 0) >= 10 && msSinceReview >= 15 * 60 * 1000) {
    return true;
  }

  const ratios = ctx.fileChangeRatios ?? [];
  if (ratios.some((ratio) => ratio > 0.1)) {
    return true;
  }

  return false;
}

export function parseDiffStatLineCount(diffStatOutput: string): number {
  const match = diffStatOutput.match(/(\d+)\s+insertion/) ;
  const ins = match ? Number(match[1]) : 0;
  const delMatch = diffStatOutput.match(/(\d+)\s+deletion/);
  const del = delMatch ? Number(delMatch[1]) : 0;
  if (ins || del) return ins + del;
  let total = 0;
  for (const line of diffStatOutput.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 2] ?? "")) {
      total += Number(parts[parts.length - 2]) + Number(parts[parts.length - 1] ?? 0);
    }
  }
  return total;
}

export function hashDiffStat(diffStatOutput: string): string {
  const normalized = diffStatOutput.replace(/\s+/g, " ").trim().slice(0, 400);
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `diff-${Math.abs(hash)}`;
}
