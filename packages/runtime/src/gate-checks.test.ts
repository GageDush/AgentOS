import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildQaGateCommands,
  buildSecurityGateCommands,
  isSemgrepGateEnabled,
  parseDiffStatCounts,
  parseSemgrepFindings,
  shouldRunCodeReviewGate
} from "./gate-checks";

describe("gate-checks", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("builds QA commands", () => {
    expect(buildQaGateCommands()).toEqual(["pnpm typecheck", "pnpm test"]);
  });

  it("includes semgrep when required", () => {
    delete process.env.AGENTOS_SEMGREP_GATE;
    process.env.AGENTOS_SEMGREP_REQUIRED = "true";
    expect(isSemgrepGateEnabled()).toBe(true);
    expect(buildSecurityGateCommands()).toContain("semgrep --config .semgrep.yml --error --quiet");
  });

  it("omits semgrep when gate disabled", () => {
    process.env.AGENTOS_SEMGREP_GATE = "false";
    expect(buildSecurityGateCommands()).toEqual(["git diff"]);
  });

  it("parses diff stat for review threshold", () => {
    const stats = parseDiffStatCounts(` packages/foo.ts | 12 +++++\n 1 file changed, 12 insertions(+)`);
    expect(stats.filesChanged).toBe(1);
    expect(stats.linesChanged).toBe(12);
    expect(
      shouldRunCodeReviewGate({ linesChanged: stats.linesChanged, filesChanged: stats.filesChanged, requiresCodeReview: true })
    ).toBe(true);
  });

  it("requires review at 20+ lines", () => {
    expect(shouldRunCodeReviewGate({ linesChanged: 25, filesChanged: 1, requiresCodeReview: true })).toBe(true);
    expect(shouldRunCodeReviewGate({ linesChanged: 5, filesChanged: 3, requiresCodeReview: true })).toBe(true);
    expect(shouldRunCodeReviewGate({ linesChanged: 0, filesChanged: 0, requiresCodeReview: false })).toBe(false);
  });

  it("parses semgrep output", () => {
    const parsed = parseSemgrepFindings("", "rule id: test-rule\nseverity: ERROR");
    expect(parsed.findingCount).toBeGreaterThan(0);
  });
});
