import type {
  AgentRoutingDecisionRecord,
  ConversationalIntent,
  MissionRecord,
  MissionRun,
  ProviderLane,
  RouteComplexity,
  RouteRiskLevel,
  RouteTaskType,
  RoutingGate,
  TaskEnvelope,
  TaskEnvelopeGate,
  TaskEnvelopeModelLane,
  UiGenerationSpec
} from "@agentos/shared";
import { DEFAULT_UI_PRESET, DEFAULT_UI_SURFACES } from "@agentos/shared";
import { nowIso } from "@agentos/shared";
import type { InstalledAgentProfileSet } from "@agentos/agents";
import { applyMissionRouteCacheHint, recordMissionRouteCache } from "./mission-cache";
import { scorePlannerNeed } from "./planner-score";
import { refineResearchRoute } from "./research-route";
import { inferProviderLaneSmart, shouldPruneSupportingAgent } from "./lane-router";
import { tier0RouteConfidence } from "./task-classifier-tier";

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
  frontend: ["ui", "frontend", "page", "layout", "css", "react", "next", "dashboard", "generate"],
  backend: ["api", "backend", "server", "gateway", "worker", "route", "endpoint"],
  database: ["database", "sql", "migration", "schema", "postgres", "sqlite"],
  integration: ["github", "linear", "discord", "integration", "webhook"],
  docs: ["readme", "docs", "document", "documentation", "overview", "guide", "runbook", "changelog"]
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Avoid false positives such as `ui` inside `guide`. */
function containsKeyword(text: string, keyword: string) {
  if (keyword.length <= 3) {
    return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(text);
  }
  return text.includes(keyword);
}

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => containsKeyword(text, keyword));
}

function hasImplementIntent(text: string) {
  return /\b(fix|typo|implement|patch|refactor|update|change|add|write)\b/.test(text) && !isAnswerOnlyRequest(text);
}

function isAnswerOnlyRequest(text: string): boolean {
  const implementSignals = [
    "fix",
    "implement",
    "build me",
    "create ",
    "add ",
    "refactor",
    "update ",
    "change ",
    "write code",
    "commit",
    "deploy",
    "migration"
  ];
  if (implementSignals.some((signal) => text.includes(signal))) return false;
  const answerSignals = [
    "what is",
    "what are",
    "how does",
    "how do",
    "explain",
    "summarize",
    "summary of",
    "tell me about",
    "why is",
    "why does",
    "describe"
  ];
  if (answerSignals.some((signal) => text.includes(signal))) return true;
  return text.endsWith("?") && text.length < 320 && !containsAny(text, keywordSets.release);
}

function isAgentProfileElevatedEdit(text: string) {
  return (
    text.includes("permission:") ||
    text.includes("handoff_to") ||
    text.includes("agent-registry") ||
    text.includes("registry.json") ||
    (text.includes("profile") && (text.includes("permission") || text.includes("security")))
  );
}

function classifyTask(text: string): RouteTaskType {
  if (
    containsAny(text, ["standalone app", "build me", "make me a", "make me an app", "workflow", "automation"]) ||
    (text.includes("app") && text.includes("landing page"))
  ) {
    return "app_creation";
  }
  if (containsAny(text, keywordSets.security)) return "security";
  if (hasImplementIntent(text)) {
    if (text.includes("bug")) return "bug_fix";
    return text.includes("typo") || text.includes("fix") ? "bug_fix" : "code_change";
  }
  if (containsAny(text, keywordSets.qa)) return "qa";
  if (containsAny(text, keywordSets.release)) return "release";
  if (containsAny(text, keywordSets.database)) return "config";
  if (text.includes("analyze") || text.includes("audit") || text.includes("overview")) return "repo_analysis";
  if (text.includes("research")) return "research";
  if (text.includes("profile") || text.includes("agent-registry")) return "agent_profile_work";
  if (isAnswerOnlyRequest(text)) return "answer_only";
  return "code_change";
}

function classifyComplexity(text: string, taskType: RouteTaskType): RouteComplexity {
  let score = 0;
  if (text.length > 900) score += 0.35;
  else if (text.length > 450) score += 0.22;
  else if (text.length > 180) score += 0.1;

  const domainHits = [
    containsAny(text, keywordSets.frontend),
    containsAny(text, keywordSets.backend),
    containsAny(text, keywordSets.database),
    containsAny(text, keywordSets.integration)
  ].filter(Boolean).length;
  score += domainHits * 0.12;

  if (taskType === "app_creation" || taskType === "research") score += 0.2;
  if (taskType === "answer_only") score = Math.min(score, 0.15);

  if (score >= 0.55) return "complex";
  if (score >= 0.32) return "moderate";
  if (score >= 0.12) return "simple";
  return "trivial";
}

function classifyRisk(text: string): RouteRiskLevel {
  if (containsAny(text, ["sudo", "rm -rf", "system", "elevated"])) return "critical";
  if (containsAny(text, ["git push", "dependency", "install", "network", ".env", "secret"])) return "high";
  if (containsAny(text, ["commit", "write", "mutate", "approval"])) return "medium";
  if (containsAny(text, ["test", "typecheck", "lint"])) return "low";
  return "low";
}

function inferProviderLane(text: string, complexity: RouteComplexity, riskLevel: RouteRiskLevel): ProviderLane {
  return inferProviderLaneSmart({
    text,
    complexity,
    riskLevel,
    quotaBlocked: text.includes("quota blocked") || text.includes("bucket depleted")
  });
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

function mapProviderLaneToModelLane(lane: ProviderLane): TaskEnvelopeModelLane {
  if (lane === "ollama_local") return "local_ollama";
  if (lane === "defer") return "defer_until_reset";
  return "mock_local";
}

function inferUiGeneration(mission: RouteContext, taskType: RouteTaskType): UiGenerationSpec | undefined {
  const text = `${mission.title}\n${mission.objective}\n${mission.prompt}\n${mission.command}`.toLowerCase();
  const isUiTask =
    containsAny(text, keywordSets.frontend) ||
    taskType === "code_change" && containsAny(text, ["component", "style", "design", "forge"]);

  if (!isUiTask) return undefined;

  return {
    uiPreset: DEFAULT_UI_PRESET,
    surfaces: DEFAULT_UI_SURFACES
  };
}

function mapRoutingGatesToEnvelopeGates(gates: RoutingGate[], taskType: RouteTaskType): TaskEnvelopeGate[] {
  const envelopeGates = new Set<TaskEnvelopeGate>();
  for (const gate of gates) {
    if (gate === "approval") envelopeGates.add("human_approval");
    if (gate === "qa") envelopeGates.add("qa");
    if (gate === "security") envelopeGates.add("security_review");
    if (gate === "release") envelopeGates.add("release_manager");
  }
  if (taskType === "code_change" || taskType === "bug_fix" || taskType === "config") {
    envelopeGates.add("code_review");
  }
  return [...envelopeGates];
}

export function buildTaskEnvelope(
  mission: RouteContext,
  route: Pick<AgentRoutingDecisionRecord, "taskType" | "complexity" | "riskLevel" | "requiredGates" | "providerLane" | "id">
): TaskEnvelope {
  const requiredGates = mapRoutingGatesToEnvelopeGates(route.requiredGates, route.taskType);
  const requiresCodeChange =
    route.taskType !== "answer_only" &&
    (route.taskType === "code_change" ||
      route.taskType === "bug_fix" ||
      route.taskType === "config" ||
      route.taskType === "app_creation");
  const requiresQa = route.taskType !== "answer_only" && requiredGates.includes("qa");
  const requiresCodeReview = route.taskType !== "answer_only" && requiredGates.includes("code_review");
  const requiresSecurityReview =
    route.taskType === "agent_profile_work" && requiredGates.includes("security_review")
      ? true
      : route.taskType !== "answer_only" && requiredGates.includes("security_review");
  const requiresReleaseGate = requiredGates.includes("release_manager");
  const modelLane = mapProviderLaneToModelLane(route.providerLane);

  return {
    taskId: route.id,
    createdAt: nowIso(),
    userGoal: mission.prompt,
    normalizedGoal: mission.objective,
    taskType: route.taskType,
    complexity: route.complexity,
    riskLevel: route.riskLevel,
    requiresRepoContext: requiresCodeChange || route.taskType === "repo_analysis",
    requiresCodeChange,
    requiresPlanning: route.complexity === "moderate" || route.complexity === "complex",
    requiresQa,
    requiresCodeReview,
    requiresSecurityReview,
    requiresReleaseGate,
    preferredLane: modelLane,
    selectedLane: modelLane,
    filesInScope: [],
    inScope: [mission.command],
    outOfScope: ["unrelated repositories", "production deploys without release gate"],
    relevantMemoryKeys: [],
    contextBudgetTokens: route.complexity === "complex" ? 12000 : route.complexity === "moderate" ? 8000 : 4000,
    acceptanceCriteria: [
      `Mission "${mission.title}" completes without policy violations.`,
      `Command "${mission.command}" is evaluated against sandbox policy.`,
      ...(requiresQa ? ["QA gate evidence is recorded before completion."] : []),
      ...(requiresSecurityReview ? ["Security review gate is satisfied for elevated risk."] : [])
    ],
    requiredGates,
    mode: "assisted",
    notes: [`Generated from deterministic route ${route.id} for mission ${mission.id}.`],
    uiGeneration: inferUiGeneration(mission, route.taskType)
  };
}

function isDocsPrimaryTask(text: string) {
  if (/\b(fix|typo|bug|patch|implement|refactor)\b/.test(text)) return false;
  const docsOnly =
    containsAny(text, keywordSets.docs) &&
    /\b(readme|docs|documentation|runbook|changelog|operator guide|release notes)\b/i.test(text);
  return docsOnly && !containsAny(text, keywordSets.frontend);
}

function countDomainSpan(text: string) {
  return [
    containsAny(text, keywordSets.frontend),
    containsAny(text, keywordSets.backend),
    containsAny(text, keywordSets.database),
    containsAny(text, keywordSets.integration)
  ].filter(Boolean).length;
}

function choosePrimaryAgent(text: string, taskType: RouteTaskType) {
  if (taskType === "answer_only" || taskType === "agent_profile_work") return "admin-agent";
  if (taskType === "research") return "issue-intake-researcher";
  if (taskType === "app_creation") return "frontend-ui-agent";
  if (taskType === "qa") return "qa-agent";
  if (taskType === "security") return "security-auditor";
  if (taskType === "release") return "release-manager";
  if (isDocsPrimaryTask(text)) return "docs-agent";
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
  const complexity = classifyComplexity(text, taskType);
  const riskLevel = classifyRisk(text);
  const domainSpan = countDomainSpan(text);
  const primaryAgent = choosePrimaryAgent(text, taskType);
  const supportingAgents = new Set<string>(["task-classifier", "quota-steward"]);

  if (taskType === "answer_only") {
    supportingAgents.add("systems-synthesizer");
  } else {
    if (complexity === "moderate" || complexity === "complex") {
      supportingAgents.add("product-agent");
    }
    if (complexity === "complex") {
      supportingAgents.add("architect-agent");
    }
    if (taskType === "research") {
      supportingAgents.add("repo-cartographer");
    }
    if (containsAny(text, keywordSets.frontend) && primaryAgent !== "frontend-ui-agent") supportingAgents.add("frontend-ui-agent");
    if (containsAny(text, keywordSets.backend) && primaryAgent !== "backend-service-agent") supportingAgents.add("backend-service-agent");
    if (containsAny(text, keywordSets.database)) supportingAgents.add("database-migration-agent");
    if (containsAny(text, keywordSets.integration)) supportingAgents.add("integration-broker");
    supportingAgents.add("systems-synthesizer");
  }

  const requiredGates = [...buildRequiredGates(riskLevel, taskType, mission.command)];
  if (taskType === "agent_profile_work" && isAgentProfileElevatedEdit(text)) {
    if (!requiredGates.includes("approval")) requiredGates.push("approval");
    if (!requiredGates.includes("security")) requiredGates.push("security");
  }
  if (requiredGates.includes("qa")) supportingAgents.add("qa-agent");
  if (requiredGates.includes("security")) supportingAgents.add("security-auditor");
  if (requiredGates.includes("release")) supportingAgents.add("release-manager");
  if (taskType === "code_change" || taskType === "bug_fix" || taskType === "config") supportingAgents.add("code-reviewer");

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

  const confidence = tier0RouteConfidence({ taskType, complexity, text, domainSpan });

  const plannerScore = scorePlannerNeed({
    complexity,
    taskType,
    domainSpan,
    routeConfidence: confidence,
    text
  });
  if (plannerScore.runFullPlanner) supportingAgents.add("planner-partitioner");
  else if (plannerScore.runLightweightPlanner) supportingAgents.add("planner-partitioner");

  const routeId = `route-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const providerLane = inferProviderLane(text, complexity, riskLevel);
  const routeCore = {
    id: routeId,
    taskType,
    complexity,
    riskLevel,
    requiredGates,
    providerLane
  };
  const taskEnvelope = buildTaskEnvelope(mission, routeCore);
  taskEnvelope.requiresPlanning = plannerScore.runFullPlanner || plannerScore.runLightweightPlanner;
  if (taskEnvelope.requiresRepoContext) {
    supportingAgents.add("context-minimizer");
  }

  let finalPrimary = primaryAgent;
  let finalTaskType = taskType;
  let finalSupporting = [...supportingAgents];
  let routeReason = `Deterministic route selected from task type ${taskType}, risk ${riskLevel}, planner score ${plannerScore.score}.`;

  if (taskType === "research") {
    const research = refineResearchRoute(text, taskEnvelope);
    finalPrimary = research.primaryAgentId;
    finalTaskType = research.recommendedTaskType;
    finalSupporting = [...new Set([...finalSupporting, ...research.supportingAgentIds])];
    taskEnvelope.taskType = research.recommendedTaskType;
    routeReason = `${routeReason} ${research.reason}`;
    if (research.askHuman) {
      taskEnvelope.notes.push("issue-intake-researcher: askHuman recommended for vague research prompt.");
    }
  }

  const supportingSet = new Set(finalSupporting);
  finalSupporting = finalSupporting.filter(
    (agentId) => !shouldPruneSupportingAgent(agentId, finalPrimary, supportingSet)
  );

  const routeDraft: AgentRoutingDecisionRecord = {
    id: routeId,
    workspaceId: mission.workspaceId,
    missionId: mission.id,
    runId: mission.runId,
    taskType: finalTaskType,
    complexity,
    riskLevel,
    selectedPrimaryAgentId: finalPrimary,
    supportingAgentIds: finalSupporting,
    skippedAgents,
    requiredGates,
    providerLane,
    routeConfidence: confidence,
    reason: routeReason,
    metadata: {
      taskEnvelope,
      providerLane,
      requiredGates,
      plannerScore,
      classifierTier: "tier0"
    },
    createdAt: nowIso()
  };

  const goalText = `${mission.title}\n${mission.objective}\n${mission.prompt}`;
  const withCache = applyMissionRouteCacheHint(routeDraft, goalText, installed.rootDir);
  recordMissionRouteCache(goalText, withCache, installed.rootDir);

  return withCache;
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

export { buildContextPacket, extractRepoPathsFromText } from "./context-minimizer";
export { shouldRunContextMinimizer, estimateTokensInScope } from "./context-triggers";
export { isAppCreationRequest, parseBuildIntent } from "./intake";
export { scorePlannerNeed } from "./planner-score";
export {
  refineClassificationTier1,
  refineClassificationTier2,
  refineClassificationTier2External,
  shouldRunTier1Classifier,
  shouldRunTier2Classifier,
  tier0RouteConfidence,
  type Tier0Classification,
  type Tier1ClassificationPatch,
  type Tier2ClassificationPatch
} from "./task-classifier-tier";
export {
  applyMissionRouteCacheHint,
  lookupSimilarMissionRoute,
  recordMissionRouteCache,
  semanticGoalSimilarity
} from "./mission-cache";
export { isVagueResearchPrompt, refineResearchRoute } from "./research-route";

export const chooseAgentForMission = (_agents: unknown, mission: Pick<MissionRecord, "title" | "objective" | "command">) => {
  const text = `${mission.title}\n${mission.objective}\n${mission.command}`.toLowerCase();
  const taskType = classifyTask(text);
  return { id: choosePrimaryAgent(text, taskType) };
};
