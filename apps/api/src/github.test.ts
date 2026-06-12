import { describe, expect, it } from "vitest";
import { buildPullRequestBody } from "./github";
import type { MissionRecord, ReleaseReport } from "@agentos/shared";

describe("github release helpers", () => {
  it("builds a PR body from release report metadata", () => {
    const mission = {
      id: "mission-1",
      title: "Ship lane",
      objective: "Release"
    } as MissionRecord;
    const report: ReleaseReport = {
      agent: "release-manager",
      status: "approval_required",
      gateSummary: { qa: "passed", review: "skipped", security: "passed" },
      summary: "Ready to ship.",
      changedFiles: ["packages/runtime/src/index.ts"],
      commitMessage: "feat(agentos): ship lane",
      approvalRequired: true,
      commandsSuggested: []
    };
    const body = buildPullRequestBody(mission, report);
    expect(body).toContain("Ship lane");
    expect(body).toContain("Ready to ship.");
    expect(body).toContain("QA: passed");
  });
});
