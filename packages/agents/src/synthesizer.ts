import type { AgentReport, TaskEnvelope } from "@agentos/shared";

export function synthesizeAgentReports(
  envelope: TaskEnvelope,
  reports: AgentReport[]
): AgentReport {
  const actionable = reports.filter((r) => r.status !== "skipped");
  const changedFiles = [...new Set(actionable.flatMap((r) => r.changedFiles ?? []))].slice(0, 12);
  const commandsRun = [...new Set(actionable.flatMap((r) => r.commandsRun ?? []))].slice(0, 8);
  const risks = [...new Set(actionable.flatMap((r) => r.risks ?? []))].slice(0, 6);
  const blockers = actionable.flatMap((r) => r.findings ?? []).filter((f) => f && typeof f === "object");
  const hasBlocked = actionable.some((r) => r.status === "blocked" || r.status === "approval_required");
  const hasFailed = actionable.some((r) => r.status === "failed");

  const status = hasFailed ? "failed" : hasBlocked ? "approval_required" : "complete";

  const specialistLines = actionable
    .map((r) => `${r.agent}: ${r.summary}`)
    .join(" ");

  const userSummary =
    envelope.taskType === "answer_only"
      ? specialistLines || `Answer prepared for: ${envelope.userGoal.slice(0, 200)}`
      : `Mission ${envelope.taskType} (${envelope.complexity}) — ${actionable.length} agent step(s). ${specialistLines}`.slice(
          0,
          900
        );

  const nextActions = [
    ...new Set(actionable.flatMap((r) => r.nextActions ?? []))
  ].slice(0, 5);

  return {
    agent: "systems-synthesizer",
    status,
    summary: userSummary,
    changedFiles,
    commandsRun,
    risks,
    nextActions: nextActions.length ? nextActions : ["Continue with operator review."],
    findings: blockers.length ? blockers : undefined
  };
}
