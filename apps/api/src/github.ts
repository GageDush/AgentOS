import { spawnSync } from "node:child_process";
import type { MissionRecord, TaskEnvelope } from "@agentos/shared";

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

  const result = spawnSync(
    "gh",
    [
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
    ],
    { encoding: "utf8", shell: process.platform === "win32" }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || "gh issue create failed");
  }

  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  return lines.at(-1)?.trim() ?? null;
}
