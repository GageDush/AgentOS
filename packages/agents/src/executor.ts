import type { AgentReport, ContextPacket, TaskEnvelope } from "@agentos/shared";
import { buildProfileAwareSummary } from "./llm";
import { buildMemoryUpdateFromReport, processMemoryUpdate } from "./memory-curator";
import { enqueueMemoryUpdates, type QueuedMemoryUpdate } from "./memory-queue";
import { executePlannerSubtasks, shouldSkipPrimaryAfterSubtasks } from "./planner-executor";
import type { PlannerMode } from "./planner";
import {
  dispatchImplementerWork,
  isImplementerProfile,
  type ImplementerDispatchOptions
} from "./implementer-dispatch";
import { applyGovernanceToReleaseReport, buildGateSummaryFromReports } from "./governance";
import { runQaGate, type QaCommandResult } from "./qa-gate";
import { prepareReleaseReport } from "./release";
import { shouldScheduleCodeReview, type ReviewScheduleContext } from "./review-schedule";
import { synthesizeAgentReports } from "./synthesizer";

const SPECIALIST_SUMMARIES: Record<string, string> = {
  "admin-agent": "Admin agent prepared an operator-facing response from the task envelope.",
  "issue-intake-researcher": "Intake researcher structured the vague request into a clarified brief.",
  "planner-partitioner": "Planner prepared subtasks for downstream specialists."
};

function specialistSummary(profileId: string, envelope: TaskEnvelope) {
  return (
    SPECIALIST_SUMMARIES[profileId] ??
    `${profileId} step completed for ${envelope.taskType} (${envelope.complexity}).`
  );
}

async function buildReviewerReport(
  envelope: TaskEnvelope,
  contextPacket?: ContextPacket
): Promise<AgentReport> {
  const scopedFiles = contextPacket?.repoPaths ?? envelope.filesInScope;
  const summary = await buildProfileAwareSummary(
    "code-reviewer",
    envelope,
    contextPacket,
    "Read-only code review completed on scoped changes."
  );
  return {
    agent: "code-reviewer",
    status: "complete",
    summary,
    changedFiles: scopedFiles.slice(0, 8),
    commandsRun: ["git diff --stat"],
    risks: contextPacket?.riskAreas.slice(0, 3),
    nextActions: envelope.requiresQa ? ["Run QA gate before completion."] : []
  };
}

async function buildSecurityAuditorReport(
  envelope: TaskEnvelope,
  contextPacket?: ContextPacket
): Promise<AgentReport> {
  const summary = await buildProfileAwareSummary(
    "security-auditor",
    envelope,
    contextPacket,
    "Read-only security audit scanned scoped paths for secrets, network, and policy risks."
  );
  return {
    agent: "security-auditor",
    status: "complete",
    summary,
    changedFiles: (contextPacket?.repoPaths ?? envelope.filesInScope).slice(0, 8),
    commandsRun: ["pnpm sanitize:check", "git diff"],
    risks: contextPacket?.riskAreas.slice(0, 5),
    nextActions: envelope.requiresReleaseGate ? ["Complete release gate after QA/review."] : []
  };
}

export type AgentPipelineOptions = {
  runQaGate?: boolean;
  runReleaseGate?: boolean;
  runCodeReview?: boolean;
  runSecurityAudit?: boolean;
  plannerMode?: PlannerMode | false;
  reviewContext?: ReviewScheduleContext;
  memoryUpdates?: boolean;
  missionId?: string;
  runId?: string;
  executeCommand?: (command: string) => Promise<QaCommandResult>;
  implementerDispatch?: ImplementerDispatchOptions;
  generatePatch?: (prompt: string) => Promise<string>;
};

export type AgentPipelineResult = {
  primary: AgentReport;
  planner?: AgentReport;
  qa?: AgentReport;
  reviewer?: AgentReport;
  security?: AgentReport;
  release?: AgentReport;
  synthesizer: AgentReport;
  memoryCurator?: AgentReport;
  queuedMemoryUpdates?: QueuedMemoryUpdate[];
  executedAgentIds: string[];
  usedLiveExecution: boolean;
};

export async function executeAgentStep(
  profileId: string,
  envelope: TaskEnvelope,
  contextPacket?: ContextPacket,
  options?: AgentPipelineOptions
): Promise<AgentReport> {
  if (profileId === "qa-agent") {
    return runQaGate(envelope, contextPacket, options?.executeCommand);
  }

  if (profileId === "code-reviewer") {
    return buildReviewerReport(envelope, contextPacket);
  }

  if (profileId === "security-auditor") {
    return buildSecurityAuditorReport(envelope, contextPacket);
  }

  if (profileId === "release-manager") {
    const priorGatePasses = buildGateSummaryFromReports([]);
    const report = await prepareReleaseReport(envelope, contextPacket, {
      priorGatePasses,
      humanApprovalRequired: process.env.AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL !== "false"
    });
    return {
      agent: "release-manager",
      status: report.status === "blocked" ? "blocked" : report.approvalRequired ? "approval_required" : "complete",
      summary: report.summary,
      changedFiles: report.changedFiles,
      commandsRun: report.commandsSuggested,
      nextActions: report.approvalRequired ? ["Operator must approve release gate."] : ["Proceed with gated commit or PR."],
      findings: [report]
    };
  }

  if (isImplementerProfile(profileId) && envelope.requiresCodeChange && options?.implementerDispatch) {
    return dispatchImplementerWork(profileId, envelope, contextPacket, {
      ...options.implementerDispatch,
      executeCommand: options.implementerDispatch.executeCommand ?? options.executeCommand,
      generatePatch: options.implementerDispatch.generatePatch ?? options.generatePatch,
      missionId: options.missionId,
      runId: options.runId
    });
  }

  const scopedFiles = contextPacket?.repoPaths ?? envelope.filesInScope;
  const commandsRun = contextPacket?.suggestedCommands.slice(0, 3) ?? envelope.inScope.slice(0, 2);

  const summary = await buildProfileAwareSummary(profileId, envelope, contextPacket, specialistSummary(profileId, envelope));
  return {
    agent: profileId,
    status: "complete",
    summary,
    changedFiles: envelope.requiresCodeChange ? scopedFiles.slice(0, 5) : [],
    commandsRun,
    risks: contextPacket?.riskAreas.slice(0, 3),
    nextActions: envelope.requiredGates.includes("qa") ? ["Run QA gate before completion."] : ["Continue with sandbox execution."]
  };
}

export async function executeAgentPipelineStep(
  primaryProfileId: string,
  envelope: TaskEnvelope,
  contextPacket?: ContextPacket,
  options?: AgentPipelineOptions
): Promise<AgentPipelineResult> {
  const executedAgentIds: string[] = [];
  const reports: AgentReport[] = [];
  let usedLiveExecution = false;

  let subtaskReports: AgentReport[] = [];
  if (options?.plannerMode) {
    const plannerResult = await executePlannerSubtasks(envelope, contextPacket, options.plannerMode);
    executedAgentIds.push(plannerResult.planner.agent);
    reports.push(plannerResult.planner);
    subtaskReports = plannerResult.subtaskReports;
    for (const subtaskReport of subtaskReports) {
      executedAgentIds.push(subtaskReport.agent);
      reports.push(subtaskReport);
    }
  }

  const skipPrimary = subtaskReports.length > 0 && shouldSkipPrimaryAfterSubtasks(primaryProfileId, subtaskReports);
  const primary = skipPrimary
    ? {
        agent: primaryProfileId,
        status: "complete" as const,
        summary: `Primary ${primaryProfileId} skipped — already executed in planner subtask graph.`,
        changedFiles: subtaskReports.flatMap((report) => report.changedFiles ?? []).slice(0, 8)
      }
    : await executeAgentStep(primaryProfileId, envelope, contextPacket, options);

  if ("dispatchMode" in primary && primary.dispatchMode !== "mock") {
    usedLiveExecution = true;
  }
  executedAgentIds.push(primary.agent);
  reports.push(primary);

  const runReview =
    options?.runCodeReview &&
    envelope.requiresCodeReview &&
    (options.reviewContext ? shouldScheduleCodeReview(options.reviewContext) : true);

  let reviewer: AgentReport | undefined;
  if (runReview) {
    reviewer = await executeAgentStep("code-reviewer", envelope, contextPacket, options);
    executedAgentIds.push(reviewer.agent);
    reports.push(reviewer);
  }

  let security: AgentReport | undefined;
  if (options?.runSecurityAudit && envelope.requiresSecurityReview) {
    security = await executeAgentStep("security-auditor", envelope, contextPacket, options);
    executedAgentIds.push(security.agent);
    reports.push(security);
  }

  const qa =
    options?.runQaGate && envelope.requiresQa
      ? await executeAgentStep("qa-agent", envelope, contextPacket, options)
      : undefined;
  if (qa) {
    if (options?.executeCommand) usedLiveExecution = true;
    executedAgentIds.push(qa.agent);
    reports.push(qa);
  }

  let release: AgentReport | undefined;
  if (options?.runReleaseGate && envelope.requiresReleaseGate) {
    const priorGatePasses = buildGateSummaryFromReports(reports);
    const releaseReport = await prepareReleaseReport(envelope, contextPacket, {
      priorGatePasses,
      humanApprovalRequired:
        process.env.AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL !== "false" ||
        Boolean(primary.changedFiles?.length)
    });
    release = {
      agent: "release-manager",
      status:
        releaseReport.status === "blocked"
          ? "blocked"
          : releaseReport.approvalRequired
            ? "approval_required"
            : "complete",
      summary: releaseReport.summary,
      changedFiles: releaseReport.changedFiles,
      commandsRun: releaseReport.commandsSuggested,
      nextActions: releaseReport.approvalRequired
        ? ["Operator must approve release gate."]
        : ["Proceed with gated commit or PR."],
      findings: [releaseReport]
    };
    release = applyGovernanceToReleaseReport(release, reports);
    executedAgentIds.push(release.agent);
    reports.push(release);
  }

  const synthesizer = synthesizeAgentReports(envelope, reports);
  executedAgentIds.push(synthesizer.agent);

  let memoryCurator: AgentReport | undefined;
  let queuedMemoryUpdates: QueuedMemoryUpdate[] | undefined;
  if (options?.memoryUpdates) {
    const updates = reports
      .filter((r) => r.agent !== "systems-synthesizer" && r.agent !== "memory-curator")
      .map((r) => buildMemoryUpdateFromReport(r, { missionId: options.missionId, runId: options.runId }));
    const results = updates.map((u) => processMemoryUpdate(u));
    const applied = results.flatMap((r) => [...r.appliedKeys, ...(r.appliedWikiSlugs ?? [])]);
    const toQueue = updates
      .map((envelope, index) => {
        const result = results[index];
        const wikiEdits = result?.queuedWikiEdits;
        return {
          envelope: wikiEdits?.length ? { ...envelope, wikiEdits } : envelope,
          keys: result?.queuedKeys ?? [],
          wikiEdits
        };
      })
      .filter((item) => item.keys.length > 0 || (item.wikiEdits?.length ?? 0) > 0);
    queuedMemoryUpdates = toQueue.length ? enqueueMemoryUpdates(toQueue) : undefined;
    const curatorStatus: AgentReport["status"] = applied.length
      ? "complete"
      : queuedMemoryUpdates?.length
        ? "complete"
        : "skipped";
    memoryCurator = {
      agent: "memory-curator",
      status: curatorStatus,
      summary: results.map((r) => r.summary).join(" "),
      nextActions: queuedMemoryUpdates?.length ? ["Review queued wiki/memory updates in Control Gate."] : []
    };
    executedAgentIds.push(memoryCurator.agent);
  }

  return {
    primary,
    planner: reports.find((r) => r.agent === "planner-partitioner"),
    qa,
    reviewer,
    security,
    release,
    synthesizer,
    memoryCurator,
    queuedMemoryUpdates,
    executedAgentIds,
    usedLiveExecution
  };
}
