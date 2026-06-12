import type { AgentReport, ReleaseGateSummary } from "@agentos/shared";

export function buildGateSummaryFromReports(reports: AgentReport[]): Partial<ReleaseGateSummary> {
  const qa = reports.find((report) => report.agent === "qa-agent");
  const reviewer = reports.find((report) => report.agent === "code-reviewer");
  const security = reports.find((report) => report.agent === "security-auditor");

  return {
    qa:
      qa?.status === "failed"
        ? "failed"
        : qa?.status === "passed"
          ? "passed"
          : qa
            ? "skipped"
            : undefined,
    review:
      reviewer?.status === "blocked"
        ? "blocked"
        : reviewer
          ? "passed"
          : undefined,
    security:
      security?.risks?.length
        ? "risk_found"
        : security
          ? "passed"
          : undefined
  };
}

export function detectImplementerSelfApproval(
  reports: AgentReport[],
  options?: { releaseApproverId?: string }
): { blocked: boolean; reason?: string } {
  const implementer = reports.find(
    (report) =>
      report.agent === "code-implementer" ||
      report.agent === "frontend-ui-agent" ||
      report.agent === "backend-service-agent" ||
      report.agent === "docs-agent"
  );
  const release = reports.find((report) => report.agent === "release-manager");
  if (!implementer || !release) return { blocked: false };

  const implementerChanged =
    Boolean(implementer.changedFiles?.length) ||
    implementer.summary.toLowerCase().includes("applied") ||
    implementer.summary.toLowerCase().includes("patch");

  if (!implementerChanged) return { blocked: false };

  if (options?.releaseApproverId && options.releaseApproverId === implementer.agent) {
    return {
      blocked: true,
      reason: "Implementer cannot self-approve release gate."
    };
  }

  if (
    process.env.AGENTOS_NO_SELF_APPROVAL !== "false" &&
    implementerChanged &&
    release.status === "complete"
  ) {
    return {
      blocked: true,
      reason: "Release gate requires human approval after implementer changes (no_agent_self_approval)."
    };
  }

  return { blocked: false };
}

export function applyGovernanceToReleaseReport(
  releaseReport: AgentReport,
  reports: AgentReport[]
): AgentReport {
  const selfApproval = detectImplementerSelfApproval(reports);
  if (!selfApproval.blocked) return releaseReport;

  return {
    ...releaseReport,
    status: "blocked",
    summary: `${releaseReport.summary} ${selfApproval.reason}`,
    nextActions: ["Operator must approve release after implementer changes."]
  };
}
