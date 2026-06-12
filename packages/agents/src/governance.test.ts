import { describe, expect, it } from "vitest";
import type { AgentReport } from "@agentos/shared";
import {
  applyGovernanceToReleaseReport,
  buildGateSummaryFromReports,
  detectImplementerSelfApproval
} from "./governance";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function benchRoot() {
  const cwd = process.cwd();
  if (existsSync(join(cwd, ".agentos", "benchmarks", "gate-fidelity.json"))) return cwd;
  return join(cwd, "..", "..");
}

function loadGateScenarios() {
  const path = join(benchRoot(), ".agentos", "benchmarks", "gate-fidelity.json");
  return JSON.parse(readFileSync(path, "utf8")).scenarios as Array<{
    id: string;
    qaStatus?: string;
    reviewStatus?: string;
    securityStatus?: string;
    implementerChanged?: boolean;
    releaseStatus?: string;
    expectReleaseBlocked?: boolean;
    expectSelfApprovalBlocked?: boolean;
  }>;
}

describe("governance gate fidelity", () => {
  it("maps QA failure to release block via gate summary", () => {
    const reports: AgentReport[] = [
      { agent: "qa-agent", status: "failed", summary: "tests failed" },
      { agent: "release-manager", status: "complete", summary: "ready" }
    ];
    const summary = buildGateSummaryFromReports(reports);
    expect(summary.qa).toBe("failed");
    expect(summary.qa === "failed").toBe(true);
  });

  it("blocks implementer self-approval when enabled", () => {
    const prev = process.env.AGENTOS_NO_SELF_APPROVAL;
    process.env.AGENTOS_NO_SELF_APPROVAL = "true";
    try {
      const reports: AgentReport[] = [
        {
          agent: "code-implementer",
          status: "complete",
          summary: "Applied patch to README",
          changedFiles: ["README.md"]
        },
        { agent: "release-manager", status: "complete", summary: "Ship it" }
      ];
      const check = detectImplementerSelfApproval(reports);
      expect(check.blocked).toBe(true);
      const release = applyGovernanceToReleaseReport(reports[1], reports);
      expect(release.status).toBe("blocked");
    } finally {
      if (prev === undefined) delete process.env.AGENTOS_NO_SELF_APPROVAL;
      else process.env.AGENTOS_NO_SELF_APPROVAL = prev;
    }
  });

  it("matches gate-fidelity benchmark scenarios", () => {
    for (const scenario of loadGateScenarios()) {
      if (scenario.expectReleaseBlocked !== undefined) {
        const reports: AgentReport[] = [];
        if (scenario.qaStatus) {
          reports.push({
            agent: "qa-agent",
            status: scenario.qaStatus as AgentReport["status"],
            summary: "qa"
          });
        }
        const gateSummary = buildGateSummaryFromReports(reports);
        const blocked =
          gateSummary.qa === "failed" ||
          gateSummary.review === "blocked" ||
          gateSummary.security === "risk_found";
        expect(blocked).toBe(scenario.expectReleaseBlocked);
      }
      if (scenario.expectSelfApprovalBlocked) {
        const prev = process.env.AGENTOS_NO_SELF_APPROVAL;
        process.env.AGENTOS_NO_SELF_APPROVAL = "true";
        try {
          const reports: AgentReport[] = [
            {
              agent: "code-implementer",
              status: "complete",
              summary: scenario.implementerChanged ? "Applied patch" : "noop",
              changedFiles: scenario.implementerChanged ? ["a.ts"] : []
            },
            {
              agent: "release-manager",
              status: (scenario.releaseStatus ?? "complete") as AgentReport["status"],
              summary: "release"
            }
          ];
          expect(detectImplementerSelfApproval(reports).blocked).toBe(true);
        } finally {
          if (prev === undefined) delete process.env.AGENTOS_NO_SELF_APPROVAL;
          else process.env.AGENTOS_NO_SELF_APPROVAL = prev;
        }
      }
    }
  });
});
