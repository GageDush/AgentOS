import type {
  AgentRoutingDecisionRecord,
  ConversationalIntent,
  MissionRecord,
  MissionRun,
  ProviderLane,
  RouteComplexity,
  RouteRiskLevel,
  RouteTaskType,
  RoutingGate
} from "@agentos/shared";
import { nowIso } from "@agentos/shared";
import type { InstalledAgentProfileSet } from "@agentos/agents";

type RouteContext = Pick<MissionRecord, "id" | "workspaceId" | "title" | "objective" | "prompt" | "command"> & {
  runId?: string;
};

type ActiveIntentContext = {
  activeMission?: MissionRecord;
  activeRun?: MissionRun;
  pendingApprovalIds?: string[];
};

const keywordSets = {
  qa: ["qa", "test", "typecheck", "lint", "smoke", "verify"],
  security: ["security", "secret", ".env", "approval", "network", "risk", "sandbox"],
  release: ["release", "commit", "push", "ship", "deploy"],
  frontend: ["ui", "frontend", "page", "layout", "css", "react", "next"],
  backend: ["api", "backend", "server", "gateway", "worker", "route", "endpoint"],
  database: ["database", "sql", "migration", "schema", "postgres", "sqlite"],
  integration: ["github", "linear", "discord", "integration", "webhook"],
  docs: ["readme", "docs", "document", "overview", "guide"]
};

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function classifyTask(text: string): RouteTaskType {
  if (containsAny(text, keywordSets.qa)) return "qa";
  if (containsAny(text, keywordSets.security)) return "security";
  if (containsAny(text, keywordSets.release)) return "release";
  if (containsAny(text, keywordSets.database)) return "config";
  if (text.includes("bug") || text.includes("fix")) return "bug_fix";
  if (text.includes("analyze") || text.includes("audit") || text.includes("overview")) return "repo_analysis";
  if (text.includes("research")) return "research";
  if (text.includes("profile")) return "agent_profile_work";
  return "code_change";
}

function classifyComplexity(text: string): RouteComplexity {
  if (text.length > 900) return "complex";
  if (text.length > 450) return "moderate";
  if (text.length > 180) return "simple";
  return "trivial";
}

function classifyRisk(text: string): RouteRiskLevel {
  if (containsAny(text, ["sudo", "rm -rf", "system", "elevated"])) return "critical";
  if (containsAny(text, ["git push", "dependency", "install", "network", ".env", "secret"])) return "high";
  if (containsAny(text, ["commit", "write", "mutate", "approval"])) return "medium";
  if (containsAny(text, ["test", "typecheck", "lint"])) return "low";
  return "low";
}

function inferProviderLane(text: string): ProviderLane {
  if (text.includes("ollama")) return "ollama_local";
  if (text.includes("later") || text.includes("defer")) return "defer";
  return "mock_local";
}

function buildRequiredGates(riskLevel: RouteRiskLevel, taskType: RouteTaskType, command: string) {
  const gates = new Set<RoutingGate>();
  if (riskLevel === "high" || riskLevel === "critical" || /git push|git commit|install|\.env|network/i.test(command)) {
    gates.add("approval");
  }
  if (taskType === "qa" || taskType === "code_change" || taskType === "bug_fix") {
    gates.add("qa");
  }
  if (taskType === "security" || riskLevel === "high" || riskLevel === "critical") {
    gates.add("security");
  }
  if (taskType === "release" || /git commit|git push|release/i.test(command)) {
    gates.add("release");
  }
  return [...gates];
}

function choosePrimaryAgent(text: string, taskType: RouteTaskType) {
  if (taskType === "qa") return "qa-agent";
  if (taskType === "security") return "security-auditor";
  if (taskType === "release") return "release-manager";
  if (containsAny(text, keywordSets.frontend)) return "frontend-ui-agent";
  if (containsAny(text, keywordSets.backend)) return "backend-service-agent";
  if (containsAny(text, keywordSets.database)) return "database-migration-agent";
  if (containsAny(text, keywordSets.integration)) return "integration-broker";
  if (taskType === "repo_analysis") return "repo-cartographer";
  return "code-implementer";
}

export function determineMissionRoute(installed: InstalledAgentProfileSet, mission: RouteContext): AgentRoutingDecisionRecord {
  const text = `${mission.title}\n${mission.objective}\n${mission.prompt}\n${mission.command}`.toLowerCase();
  const taskType = classifyTask(text);
  const complexity = classifyComplexity(text);
  const riskLevel = classifyRisk(text);
  const primaryAgent = choosePrimaryAgent(text, taskType);
  const supportingAgents = new Set<string>(["task-classifier", "quota-steward"]);

  if (complexity === "moderate" || complexity === "complex") supportingAgents.add("context-minimizer");
  if (complexity === "complex") supportingAgents.add("planner-partitioner");
  if (containsAny(text, keywordSets.frontend) && primaryAgent !== "frontend-ui-agent") supportingAgents.add("frontend-ui-agent");
  if (containsAny(text, keywordSets.backend) && primaryAgent !== "backend-service-agent") supportingAgents.add("backend-service-agent");
  if (containsAny(text, keywordSets.database)) supportingAgents.add("database-migration-agent");
  if (containsAny(text, keywordSets.integration)) supportingAgents.add("integration-broker");

  const requiredGates = buildRequiredGates(riskLevel, taskType, mission.command);
  if (requiredGates.includes("qa")) supportingAgents.add("qa-agent");
  if (requiredGates.includes("security")) supportingAgents.add("security-auditor");
  if (requiredGates.includes("release")) supportingAgents.add("release-manager");
  if (taskType === "code_change" || taskType === "bug_fix" || taskType === "config") supportingAgents.add("code-reviewer");
  supportingAgents.add("systems-synthesizer");

  const skippedAgents = installed.profiles
    .map((profile) => {
      if (profile.id === primaryAgent) return undefined;
      if (supportingAgents.has(profile.id)) return undefined;
      const reason =
        profile.id === "security-auditor"
          ? "Skipped because no security gate was required."
          : profile.id === "qa-agent"
            ? "Skipped because no QA gate was required."
            : profile.id === "release-manager"
              ? "Skipped because no release action was requested."
              : "Skipped to keep the route deterministic and compact.";
      return { agentId: profile.id, reason };
    })
    .filter((entry): entry is { agentId: string; reason: string } => Boolean(entry));

  const confidenceBase = 0.72;
  const confidence =
    confidenceBase +
    (requiredGates.length ? 0.08 : 0) +
    (complexity === "complex" ? -0.08 : complexity === "moderate" ? -0.03 : 0) +
    (primaryAgent === "code-implementer" ? 0.04 : 0);

  return {
    id: `route-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    workspaceId: mission.workspaceId,
    missionId: mission.id,
    runId: mission.runId,
    taskType,
    complexity,
    riskLevel,
    selectedPrimaryAgentId: primaryAgent,
    supportingAgentIds: [...supportingAgents],
    skippedAgents,
    requiredGates,
    providerLane: inferProviderLane(text),
    routeConfidence: Number(Math.max(0.2, Math.min(0.99, confidence)).toFixed(2)),
    reason: `Deterministic route selected from task type ${taskType}, risk ${riskLevel}, and domain keywords.`,
    createdAt: nowIso()
  };
}

export function parseConversationalIntent(input: string, context: ActiveIntentContext): ConversationalIntent {
  const text = input.trim().toLowerCase();
  const pendingApprovals = context.pendingApprovalIds ?? [];

  if (!text) {
    return { type: "clarify", askHuman: true, reason: "Empty message." };
  }

  if ((text.includes("approve") || text.includes("looks good")) && pendingApprovals.length === 1) {
    return {
      type: "approve_active",
      askHuman: false,
      reason: "Single pending approval matched conversational approval.",
      targetApprovalRequestId: pendingApprovals[0],
      targetRunId: context.activeRun?.id,
      targetMissionId: context.activeMission?.id
    };
  }

  if ((text.includes("deny") || text.includes("reject")) && pendingApprovals.length === 1) {
    return {
      type: "deny_active",
      askHuman: false,
      reason: "Single pending approval matched conversational denial.",
      targetApprovalRequestId: pendingApprovals[0],
      targetRunId: context.activeRun?.id,
      targetMissionId: context.activeMission?.id
    };
  }

  if (text.includes("pause")) {
    return context.activeMission
      ? { type: "pause_active", askHuman: false, reason: "Pause requested for active mission.", targetMissionId: context.activeMission.id, targetRunId: context.activeRun?.id }
      : { type: "clarify", askHuman: true, reason: "No active mission to pause." };
  }

  if (text.includes("resume") || text.includes("continue")) {
    return context.activeMission
      ? { type: "resume_active", askHuman: false, reason: "Resume requested for active mission.", targetMissionId: context.activeMission.id, targetRunId: context.activeRun?.id }
      : { type: "clarify", askHuman: true, reason: "No paused mission to resume." };
  }

  if (text.includes("run qa") || text.includes("qa gate") || text.includes("check qa")) {
    return context.activeMission
      ? { type: "run_qa", askHuman: false, reason: "QA requested for the active mission.", targetMissionId: context.activeMission.id, targetRunId: context.activeRun?.id }
      : { type: "clarify", askHuman: true, reason: "No active mission available for QA." };
  }

  if (text.includes("security review") || text.includes("security check")) {
    return context.activeMission
      ? { type: "security_review", askHuman: false, reason: "Security review requested for the active mission.", targetMissionId: context.activeMission.id, targetRunId: context.activeRun?.id }
      : { type: "clarify", askHuman: true, reason: "No active mission available for security review." };
  }

  if (text.includes("details") || text.includes("show details") || text.includes("what happened")) {
    return { type: "show_details", askHuman: false, reason: "Run detail requested.", targetMissionId: context.activeMission?.id, targetRunId: context.activeRun?.id };
  }

  if (text.includes("retry")) {
    return context.activeRun
      ? { type: "retry_last", askHuman: false, reason: "Retry requested for the active run.", targetMissionId: context.activeMission?.id, targetRunId: context.activeRun.id }
      : { type: "clarify", askHuman: true, reason: "No failed run available to retry." };
  }

  if (text.includes("summarize") || text.includes("summary")) {
    return { type: "summarize", askHuman: false, reason: "Summary requested.", targetMissionId: context.activeMission?.id, targetRunId: context.activeRun?.id };
  }

  if (text.includes("release") || text.includes("commit")) {
    return context.activeMission
      ? { type: "release", askHuman: false, reason: "Release intent detected and must remain gated.", targetMissionId: context.activeMission.id, targetRunId: context.activeRun?.id }
      : { type: "clarify", askHuman: true, reason: "No active mission is available for a release step." };
  }

  if ((text.includes("approve") || text.includes("deny")) && pendingApprovals.length !== 1) {
    return {
      type: "clarify",
      askHuman: true,
      reason: pendingApprovals.length === 0 ? "There is no pending approval to act on." : "Multiple approvals are pending; clarification is required."
    };
  }

  return {
    type: "clarify",
    askHuman: true,
    reason: "The message did not safely map to a single control action."
  };
}

export const chooseAgentForMission = (_agents: unknown, mission: Pick<MissionRecord, "title" | "objective" | "command">) => {
  const text = `${mission.title}\n${mission.objective}\n${mission.command}`.toLowerCase();
  const taskType = classifyTask(text);
  return { id: choosePrimaryAgent(text, taskType) };
};
