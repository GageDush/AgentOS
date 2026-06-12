import type { AgentReport, ContextPacket, TaskEnvelope } from "@agentos/shared";

const SPECIALIST_SUMMARIES: Record<string, string> = {
  "code-implementer": "Mock implementer reviewed the scoped files and prepared a deterministic change plan.",
  "frontend-ui-agent": "Mock frontend agent mapped UI surfaces from the context packet.",
  "backend-service-agent": "Mock backend agent inspected API routes referenced in scope.",
  "qa-agent": "Mock QA agent recorded verification commands for the mission envelope.",
  "security-auditor": "Mock security auditor scanned scope for elevated-risk patterns.",
  "repo-cartographer": "Mock cartographer summarized repository layout from memory hints."
};

function specialistSummary(profileId: string, envelope: TaskEnvelope) {
  return (
    SPECIALIST_SUMMARIES[profileId] ??
    `Mock ${profileId} step completed for ${envelope.taskType} (${envelope.complexity}).`
  );
}

function buildQaReport(envelope: TaskEnvelope, contextPacket?: ContextPacket): AgentReport {
  const testsRun = contextPacket?.suggestedCommands.filter((cmd) => /test|typecheck|lint/i.test(cmd)) ?? [
    "pnpm test",
    "pnpm typecheck"
  ];
  return {
    agent: "qa-agent",
    status: envelope.requiresQa ? "passed" : "skipped",
    summary: envelope.requiresQa
      ? "Mock QA gate executed suggested verification commands."
      : "QA gate not required for this envelope.",
    testsRun,
    commandsRun: testsRun,
    nextActions: envelope.requiresQa ? [] : ["No QA evidence required."]
  };
}

export function executeAgentStep(
  profileId: string,
  envelope: TaskEnvelope,
  contextPacket?: ContextPacket
): AgentReport {
  if (profileId === "qa-agent") {
    return buildQaReport(envelope, contextPacket);
  }

  const scopedFiles = contextPacket?.repoPaths ?? envelope.filesInScope;
  const commandsRun = contextPacket?.suggestedCommands.slice(0, 3) ?? envelope.inScope.slice(0, 2);

  return {
    agent: profileId,
    status: "complete",
    summary: specialistSummary(profileId, envelope),
    changedFiles: envelope.requiresCodeChange ? scopedFiles.slice(0, 5) : [],
    commandsRun,
    risks: contextPacket?.riskAreas.slice(0, 3),
    nextActions: envelope.requiredGates.includes("qa") ? ["Run QA gate before completion."] : ["Continue with sandbox execution."]
  };
}

export function executeAgentPipelineStep(
  primaryProfileId: string,
  envelope: TaskEnvelope,
  contextPacket?: ContextPacket,
  options?: { runQaGate?: boolean }
): { primary: AgentReport; qa?: AgentReport } {
  const primary = executeAgentStep(primaryProfileId, envelope, contextPacket);
  const qa = options?.runQaGate && envelope.requiresQa ? executeAgentStep("qa-agent", envelope, contextPacket) : undefined;
  return { primary, qa };
}
