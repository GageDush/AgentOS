export type ReleaseGateCheckStatus = "passed" | "failed" | "skipped" | "approved" | "blocked" | "risk_found";

export type ReleaseGateSummary = {
  qa: ReleaseGateCheckStatus;
  review: ReleaseGateCheckStatus;
  security: ReleaseGateCheckStatus;
};

export type ReleaseReportStatus = "ready" | "blocked" | "committed" | "pr_ready" | "approval_required";

export type ReleaseReport = {
  agent: "release-manager";
  status: ReleaseReportStatus;
  gateSummary: ReleaseGateSummary;
  summary: string;
  changedFiles: string[];
  commitMessage: string;
  changelogDraft?: string;
  releaseNotesDraft?: string;
  approvalRequired: boolean;
  commandsSuggested: string[];
  prUrl?: string;
};
