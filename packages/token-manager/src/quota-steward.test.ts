import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { UsageEvent } from "@agentos/shared";
import { evaluateQuotaSteward, gatePremiumProviderRun, readAgentStopFile } from "./quota-steward";

function findRepoRoot(startDir: string) {
  let current = startDir;
  for (;;) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) return current;
    const parent = dirname(current);
    if (parent === current) return startDir;
    current = parent;
  }
}

function makeEvent(overrides: Partial<UsageEvent>): UsageEvent {
  return {
    id: overrides.id ?? "usage-1",
    provider: overrides.provider ?? "anthropic",
    model: overrides.model ?? "claude-sonnet",
    promptTokens: overrides.promptTokens ?? 100,
    completionTokens: overrides.completionTokens ?? 50,
    totalTokens: overrides.totalTokens ?? 150,
    estimatedCostUsd: overrides.estimatedCostUsd ?? 0,
    createdAt: overrides.createdAt ?? new Date().toISOString()
  };
}

describe("quota steward", () => {
  it("warns when a provider bucket crosses the configured threshold", () => {
    const repoRoot = findRepoRoot(process.cwd());
    const events = Array.from({ length: 40 }, (_, index) =>
      makeEvent({ id: `usage-${index}`, provider: "anthropic", createdAt: new Date().toISOString() })
    );
    const evaluation = evaluateQuotaSteward(events, repoRoot);
    expect(evaluation.warning).toBe(true);
    expect(evaluation.status.providers.some((bucket) => bucket.providerId === "anthropic" && bucket.warning)).toBe(true);
  });

  it("writes a stop file when a premium provider bucket is depleted", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-quota-"));
    try {
      const configDir = join(repoRoot, "configs");
      const sourceConfig = join(findRepoRoot(process.cwd()), "configs", "quota-providers.json");
      mkdirSync(configDir, { recursive: true });
      copyFileSync(sourceConfig, join(configDir, "quota-providers.json"));

      const events = Array.from({ length: 50 }, (_, index) =>
        makeEvent({ id: `usage-${index}`, provider: "anthropic", createdAt: new Date().toISOString() })
      );
      const evaluation = gatePremiumProviderRun(events, repoRoot, {
        provider: "anthropic",
        agentId: "code-implementer",
        missionId: "mission-1",
        runId: "run-1"
      });
      expect(evaluation.allowed).toBe(false);
      expect(readAgentStopFile(repoRoot, "code-implementer")?.provider).toBe("anthropic");
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
