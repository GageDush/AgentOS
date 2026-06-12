import type { ContextPacket, ReleaseGateSummary, ReleaseReport, TaskEnvelope } from "@agentos/shared";
import { buildProfileAwareSummary } from "./llm";

function gateSummaryFromEnvelope(envelope: TaskEnvelope, priorPasses?: Partial<ReleaseGateSummary>): ReleaseGateSummary {
  return {
    qa: priorPasses?.qa ?? (envelope.requiresQa ? "skipped" : "skipped"),
    review: priorPasses?.review ?? (envelope.requiresCodeReview ? "skipped" : "skipped"),
    security: priorPasses?.security ?? (envelope.requiresSecurityReview ? "skipped" : "skipped")
  };
}

function upstreamGateBlocked(gateSummary: ReleaseGateSummary) {
  return (
    gateSummary.qa === "failed" ||
    gateSummary.review === "blocked" ||
    gateSummary.security === "risk_found"
  );
}

export async function prepareReleaseReport(
  envelope: TaskEnvelope,
  contextPacket: ContextPacket | undefined,
  options?: {
    gitStatusOutput?: string;
    priorGatePasses?: Partial<ReleaseGateSummary>;
    humanApprovalRequired?: boolean;
  }
): Promise<ReleaseReport> {
  const humanRequired = options?.humanApprovalRequired ?? true;
  const gateSummary = gateSummaryFromEnvelope(envelope, options?.priorGatePasses);
  const changedFiles =
    contextPacket?.repoPaths?.slice(0, 12) ??
    envelope.filesInScope.slice(0, 12) ??
    (options?.gitStatusOutput?.match(/^[^\s].*$/gm) ?? []).slice(0, 8);

  const reviewIncomplete = envelope.requiresCodeReview && gateSummary.review !== "passed";
  const blocked = upstreamGateBlocked(gateSummary) || reviewIncomplete;

  const baseSummary = blocked
    ? "Release manager blocked ship: upstream gates must pass before commit or PR."
    : "Release manager validated scope, drafted commit message, and prepared a gated ship checklist.";

  const summary = await buildProfileAwareSummary("release-manager", envelope, contextPacket, baseSummary);

  const commitMessage = `feat(agentos): ${envelope.normalizedGoal.slice(0, 72)}`;

  const status = blocked ? "blocked" : humanRequired ? "approval_required" : "ready";

  return {
    agent: "release-manager",
    status,
    gateSummary,
    summary,
    changedFiles,
    commitMessage,
    changelogDraft: `- ${envelope.normalizedGoal}`,
    releaseNotesDraft: summary,
    approvalRequired: humanRequired && !blocked,
    commandsSuggested: buildAutopilotReleaseCommands(blocked ? "blocked" : status, commitMessage)
  };
}

export function buildAutopilotReleaseCommands(
  status: ReleaseReport["status"],
  commitMessage: string,
  options?: { skipGhPr?: boolean }
): string[] {
  if (status === "blocked") return [];
  const commands = ["git add -A", `git commit -m "${commitMessage}"`];
  if (!options?.skipGhPr && process.env.AGENTOS_SKIP_GH_PR !== "true") {
    commands.push("gh pr create --fill");
  }
  return commands;
}
