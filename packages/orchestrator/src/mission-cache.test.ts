import { describe, expect, it } from "vitest";
import {
  hashNormalizedGoal,
  lookupSimilarMissionRoute,
  recordMissionRouteCache,
  semanticGoalSimilarity
} from "./mission-cache";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("mission-route-cache", () => {
  it("records and looks up by normalized goal hash", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-cache-"));
    const goal = "Fix auth bug in API";
    const hash = hashNormalizedGoal(goal);
    expect(hash).toMatch(/^goal-/);

    recordMissionRouteCache(
      goal,
      {
        taskType: "bug_fix",
        selectedPrimaryAgentId: "code-implementer",
        supportingAgentIds: ["qa-agent"]
      },
      repoRoot
    );

    const hit = lookupSimilarMissionRoute(goal, repoRoot);
    expect(hit?.goalHash).toBe(hash);
    expect(hit?.primaryAgentId).toBe("code-implementer");
  });

  it("finds semantically similar goals", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "agentos-cache-sem-"));
    recordMissionRouteCache(
      "Fix authentication bug in API login",
      {
        taskType: "bug_fix",
        selectedPrimaryAgentId: "code-implementer",
        supportingAgentIds: []
      },
      repoRoot
    );

    expect(
      semanticGoalSimilarity("fix authentication bug api login", "fix authentication bug in api login")
    ).toBeGreaterThan(0.9);
    const hit = lookupSimilarMissionRoute("fix authentication bug api login", repoRoot);
    expect(hit?.primaryAgentId).toBe("code-implementer");
  });
});
