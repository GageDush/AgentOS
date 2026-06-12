import { spawnSync } from "node:child_process";
import type { MissionRecord, ReleaseReport, TaskEnvelope } from "@agentos/shared";

function ghArgs(args: string[]) {
  return spawnSync("gh", args, { encoding: "utf8", shell: process.platform === "win32" });
}

export function createGitHubMissionIssue(mission: MissionRecord, envelope?: TaskEnvelope) {
  const repo = process.env.AGENTOS_GITHUB_REPO ?? "GageDush/AgentOS";
  const body = [
    "## AgentOS Mission",
    "",
    `**Mission ID:** ${mission.id}`,
    `**Objective:** ${mission.objective}`,
    `**Command:** \`${mission.command}\``,
    envelope ? `**Task type:** ${envelope.taskType}` : "",
    envelope ? `**Risk:** ${envelope.riskLevel}` : "",
    envelope ? `**Gates:** ${envelope.requiredGates.join(", ")}` : "",
    "",
    "_Created via AgentOS Command Center (opt-in)._"
  ]
    .filter(Boolean)
    .join("\n");

  const result = ghArgs([
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    `[AgentOS] ${mission.title}`,
    "--body",
    body,
    "--label",
    "agentos",
    "--label",
    "mission",
    "--label",
    "needs-triage"
  ]);

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || "gh issue create failed");
  }

  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  return lines.at(-1)?.trim() ?? null;
}

export function createGitHubPullRequest(input: {
  title: string;
  body: string;
  baseBranch?: string;
  headBranch?: string;
  draft?: boolean;
}) {
  const repo = process.env.AGENTOS_GITHUB_REPO ?? "GageDush/AgentOS";
  const args = [
    "pr",
    "create",
    "--repo",
    repo,
    "--title",
    input.title,
    "--body",
    input.body
  ];
  if (input.baseBranch) args.push("--base", input.baseBranch);
  if (input.headBranch) args.push("--head", input.headBranch);
  if (input.draft) args.push("--draft");

  const result = ghArgs(args);
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || "gh pr create failed");
  }
  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  return lines.at(-1)?.trim() ?? null;
}

export function buildPullRequestBody(mission: MissionRecord, releaseReport: ReleaseReport) {
  return [
    "## AgentOS Release",
    "",
    `**Mission:** ${mission.title}`,
    `**Mission ID:** ${mission.id}`,
    "",
    "### Summary",
    releaseReport.summary,
    "",
    "### Gate status",
    `- QA: ${releaseReport.gateSummary.qa}`,
    `- Review: ${releaseReport.gateSummary.review}`,
    `- Security: ${releaseReport.gateSummary.security}`,
    "",
    releaseReport.changelogDraft ? `### Changelog\n${releaseReport.changelogDraft}` : "",
    "",
    "_Opened via AgentOS Release Manager (gated)._"
  ]
    .filter(Boolean)
    .join("\n");
}
