/**
 * Deterministic gate command planning (QA, security, code review thresholds).
 */

export function isSemgrepGateEnabled(): boolean {
  const disabled = process.env.AGENTOS_SEMGREP_GATE?.trim().toLowerCase();
  if (disabled === "false" || disabled === "0" || disabled === "off") return false;
  const required = process.env.AGENTOS_SEMGREP_REQUIRED?.trim().toLowerCase();
  if (required === "true" || required === "1" || required === "yes") return true;
  return process.env.AGENTOS_SEMGREP_GATE?.trim().toLowerCase() === "true";
}

export function buildQaGateCommands(): string[] {
  return ["pnpm typecheck", "pnpm test"];
}

export function buildSecurityGateCommands(): string[] {
  const commands = ["git diff"];
  if (isSemgrepGateEnabled()) {
    commands.push("semgrep --config .semgrep.yml --error --quiet");
  }
  return commands;
}

export function parseSemgrepFindings(stdout: string, stderr: string): { findingCount: number; summary: string } {
  const combined = `${stdout}\n${stderr}`.trim();
  if (!combined) return { findingCount: 0, summary: "semgrep: no output" };
  const findingLines = combined.split("\n").filter((line) => /severity|finding|rule id/i.test(line));
  return {
    findingCount: findingLines.length,
    summary: combined.slice(0, 500)
  };
}

export type ReviewGateThresholdInput = {
  linesChanged: number;
  filesChanged: number;
  requiresCodeReview: boolean;
};

/**
 * Minimum diff size before the code-review gate must run (P2).
 */
export function shouldRunCodeReviewGate(input: ReviewGateThresholdInput): boolean {
  if (!input.requiresCodeReview) return false;
  if (input.linesChanged >= 20) return true;
  if (input.filesChanged >= 2) return true;
  return input.linesChanged > 0 || input.filesChanged > 0;
}

export function parseDiffStatCounts(diffStatOutput: string): { linesChanged: number; filesChanged: number } {
  let insertions = 0;
  let deletions = 0;
  const ins = diffStatOutput.match(/(\d+)\s+insertion/);
  const del = diffStatOutput.match(/(\d+)\s+deletion/);
  if (ins) insertions = Number(ins[1]);
  if (del) deletions = Number(del[1]);
  const fileLines = diffStatOutput
    .split("\n")
    .filter((line) => line.includes("|") && !line.includes("changed"));
  return {
    linesChanged: insertions + deletions,
    filesChanged: fileLines.length
  };
}
