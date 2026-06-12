import { assessCommandPolicy } from "@agentos/sandbox";
import { loadInstalledAgentProfiles } from "@agentos/agents";
import { determineMissionRoute, parseConversationalIntent } from "@agentos/orchestrator";
import type { AgentOSDatabase, PersistenceAdapter, QuickActionBlueprint } from "@agentos/persistence";
import { getPersistenceAdapter } from "@agentos/persistence";
import { evaluateQuotaSteward } from "@agentos/token-manager";
import {
  nowIso,
  type AgentRichMessageScope,
  type AgentRichQuickActionType,
  type AgentRoutingDecisionRecord,
  type ApprovalRecord,
  type AuditEvent,
  type ChatMessageRecord,
  type ConversationalIntent,
  type MissionRecord,
  type MissionRun,
  type MissionRunLog,
  type QuickActionRecord,
  type QuickActionType,
  type RouteRiskLevel,
  type RoutingGate,
  validateRichQuickActionScope
} from "@agentos/shared";

const IMPLEMENTER_AGENT_IDS = new Set(["code-implementer", "frontend-ui-agent", "backend-service-agent"]);
const COMPLETION_GATES = ["qa", "security", "release"] as const;
type CompletionGate = (typeof COMPLETION_GATES)[number];

function gatePassEvent(gate: CompletionGate) {
  return `gate.${gate}_passed`;
}

function hasGatePassAudit(persistence: PersistenceAdapter, runId: string, gate: CompletionGate) {
  return persistence.listAuditEvents().some((event) => event.runId === runId && event.event === gatePassEvent(gate));
}

function getUnsatisfiedCompletionGates(persistence: PersistenceAdapter, requiredGates: RoutingGate[], runId: string) {
  return COMPLETION_GATES.filter((gate) => requiredGates.includes(gate) && !hasGatePassAudit(persistence, runId, gate));
}

function applyQuotaStewardToRoute(
  route: AgentRoutingDecisionRecord,
  usageEvents: ReturnType<PersistenceAdapter["listUsageEvents"]>,
  repoRoot: string
): AgentRoutingDecisionRecord {
  const quotaEval = evaluateQuotaSteward(usageEvents, repoRoot);
  const quotaSteward = {
    allowed: quotaEval.allowed,
    blocked: quotaEval.blocked,
    warning: quotaEval.warning,
    reason: quotaEval.reason
  };
  if (quotaEval.blocked && route.providerLane !== "defer") {
    return {
      ...route,
      providerLane: "defer" as const,
      reason: `${route.reason} Quota steward deferred execution because a subscription bucket is depleted.`,
      metadata: {
        ...route.metadata,
        quotaSteward
      }
    };
  }
  return {
    ...route,
    metadata: {
      ...route.metadata,
      quotaSteward
    }
  };
}

function createGateQuickActionBlueprints(missionId: string, runId: string, gates: CompletionGate[]): QuickActionBlueprint[] {
  const blueprints: QuickActionBlueprint[] = [];
  if (gates.includes("qa")) {
    blueprints.push({
      missionId,
      runId,
      label: "Run QA",
      emoji: "🧪",
      actionType: "run_qa",
      riskLevel: "low"
    });
  }
  if (gates.includes("security")) {
    blueprints.push({
      missionId,
      runId,
      label: "Security Review",
      emoji: "🔒",
      actionType: "security_review",
      riskLevel: "medium"
    });
  }
  return blueprints;
}

export type RuntimeOptions = {
  persistence?: PersistenceAdapter;
  gatewayBase?: string;
  workerId?: string;
  leaseDurationMs?: number;
  maxAttempts?: number;
};

export type RuntimeActionResult = {
  ok: boolean;
  summary: string;
  runId?: string;
  missionId?: string;
  approvalRequestId?: string;
  quickActionIds?: string[];
};

const defaultGatewayBase = process.env.AGENTOS_GATEWAY_URL ?? "http://127.0.0.1:8790";

function adapterFrom(options?: RuntimeOptions) {
  return options?.persistence ?? getPersistenceAdapter();
}

function gatewayFrom(options?: RuntimeOptions) {
  return options?.gatewayBase ?? defaultGatewayBase;
}

function workerFrom(options?: RuntimeOptions) {
  return options?.workerId ?? "worker-local";
}

function leaseDurationFrom(options?: RuntimeOptions) {
  return options?.leaseDurationMs ?? 60_000;
}

function maxAttemptsFrom(options?: RuntimeOptions) {
  return options?.maxAttempts ?? 3;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function addAudit(database: AgentOSDatabase, event: string, actor: string, summary: string, missionId?: string, runId?: string) {
  const audit: AuditEvent = {
    id: makeId("audit"),
    workspaceId: database.workspaces[0].id,
    event,
    actor,
    summary,
    missionId,
    runId,
    createdAt: nowIso()
  };
  database.auditEvents.unshift(audit);
  return audit;
}

function isExpired(timestamp?: string) {
  return Boolean(timestamp && Date.parse(timestamp) <= Date.now());
}

function clearRunLease(run: MissionRun) {
  run.claimedByWorkerId = undefined;
  run.claimedAt = undefined;
  run.leaseExpiresAt = undefined;
}

function appendMissionLog(database: AgentOSDatabase, runId: string, level: MissionRunLog["level"], message: string) {
  const log: MissionRunLog = {
    id: makeId("run-log"),
    runId,
    level,
    message,
    createdAt: nowIso()
  };
  database.missionLogs.push(log);
  return log;
}

function expireRelatedQuickActions(database: AgentOSDatabase, predicate: (action: QuickActionRecord) => boolean) {
  const timestamp = nowIso();
  database.quickActions.forEach((action) => {
    if (!action.consumedAt && !isExpired(action.expiresAt) && predicate(action)) {
      action.expiresAt ??= timestamp;
    }
  });
}

function createQuickAction(
  database: AgentOSDatabase,
  input: Omit<QuickActionRecord, "id" | "workspaceId" | "createdAt" | "consumedAt" | "consumedByOperatorId">
) {
  const existing = database.quickActions.find(
    (action) =>
      action.actionType === input.actionType &&
      action.missionId === input.missionId &&
      action.runId === input.runId &&
      action.approvalRequestId === input.approvalRequestId &&
      !action.consumedAt &&
      !isExpired(action.expiresAt)
  );
  if (existing) {
    return existing;
  }
  const action: QuickActionRecord = {
    id: makeId("quick"),
    workspaceId: database.workspaces[0].id,
    ...input,
    createdAt: nowIso()
  };
  database.quickActions.unshift(action);
  addAudit(
    database,
    "quick_action.created",
    "agentos-runtime",
    `Created quick action ${action.emoji} ${action.label}.`,
    action.missionId,
    action.runId
  );
  return action;
}

function createStandardRunQuickActions(database: AgentOSDatabase, mission: MissionRecord, run: MissionRun) {
  const actions: QuickActionRecord[] = [];
  actions.push(
    createQuickAction(database, {
      missionId: mission.id,
      runId: run.id,
      label: "Details",
      emoji: "👀",
      actionType: "details",
      riskLevel: "low"
    }),
    createQuickAction(database, {
      missionId: mission.id,
      runId: run.id,
      label: "Summarize",
      emoji: "🧾",
      actionType: "summarize",
      riskLevel: "low"
    })
  );
  if (run.status === "running" || run.status === "planning") {
    actions.push(
      createQuickAction(database, {
        missionId: mission.id,
        runId: run.id,
        label: "Pause",
        emoji: "⏸️",
        actionType: "pause",
        riskLevel: "low"
      })
    );
  }
  if (run.status === "failed") {
    actions.push(
      createQuickAction(database, {
        missionId: mission.id,
        runId: run.id,
        label: "Retry",
        emoji: "🔁",
        actionType: "retry",
        riskLevel: "medium"
      })
    );
  }
  return actions;
}

function buildStandardRunQuickActionBlueprints(mission: MissionRecord, run: MissionRun): QuickActionBlueprint[] {
  const actions: QuickActionBlueprint[] = [
    {
      missionId: mission.id,
      runId: run.id,
      label: "Details",
      emoji: "👀",
      actionType: "details",
      riskLevel: "low"
    },
    {
      missionId: mission.id,
      runId: run.id,
      label: "Summarize",
      emoji: "🧾",
      actionType: "summarize",
      riskLevel: "low"
    }
  ];
  if (run.status === "running" || run.status === "planning") {
    actions.push({
      missionId: mission.id,
      runId: run.id,
      label: "Pause",
      emoji: "⏸️",
      actionType: "pause",
      riskLevel: "low"
    });
  }
  if (run.status === "failed") {
    actions.push({
      missionId: mission.id,
      runId: run.id,
      label: "Retry",
      emoji: "🔁",
      actionType: "retry",
      riskLevel: "medium"
    });
  }
  return actions;
}

function createApprovalQuickActions(database: AgentOSDatabase, approval: ApprovalRecord) {
  return [
    createQuickAction(database, {
      missionId: approval.missionId,
      runId: approval.runId,
      approvalRequestId: approval.id,
      label: "Approve",
      emoji: "✅",
      actionType: "approve",
      riskLevel: "medium"
    }),
    createQuickAction(database, {
      missionId: approval.missionId,
      runId: approval.runId,
      approvalRequestId: approval.id,
      label: "Deny",
      emoji: "❌",
      actionType: "deny",
      riskLevel: "medium"
    }),
    createQuickAction(database, {
      missionId: approval.missionId,
      runId: approval.runId,
      approvalRequestId: approval.id,
      label: "Details",
      emoji: "👀",
      actionType: "details",
      riskLevel: "low"
    })
  ];
}

function buildApprovalQuickActionBlueprints(approval: ApprovalRecord): QuickActionBlueprint[] {
  return [
    {
      missionId: approval.missionId,
      runId: approval.runId,
      approvalRequestId: approval.id,
      label: "Approve",
      emoji: "✅",
      actionType: "approve",
      riskLevel: "medium"
    },
    {
      missionId: approval.missionId,
      runId: approval.runId,
      approvalRequestId: approval.id,
      label: "Deny",
      emoji: "❌",
      actionType: "deny",
      riskLevel: "medium"
    },
    {
      missionId: approval.missionId,
      runId: approval.runId,
      approvalRequestId: approval.id,
      label: "Details",
      emoji: "👀",
      actionType: "details",
      riskLevel: "low"
    }
  ];
}

function getMission(database: AgentOSDatabase, missionId?: string) {
  return missionId ? database.missions.find((mission) => mission.id === missionId) : undefined;
}

function getRun(database: AgentOSDatabase, runId?: string) {
  return runId ? database.missionRuns.find((run) => run.id === runId) : undefined;
}

function getPendingApproval(database: AgentOSDatabase, approvalId?: string) {
  if (!approvalId) return undefined;
  return database.approvals.find((approval) => approval.id === approvalId && approval.status === "pending");
}

function createApproval(database: AgentOSDatabase, mission: MissionRecord, run: MissionRun, permissionLevel: ApprovalRecord["permissionLevel"], command: string) {
  const approval: ApprovalRecord = {
    id: makeId("approval"),
    workspaceId: mission.workspaceId,
    requestedByOperatorId: mission.requestedByOperatorId,
    agentId: run.operatorId,
    missionId: mission.id,
    sessionId: mission.sessionId,
    runId: run.id,
    tool: "command.execute",
    permissionLevel,
    inputSummary: `Mission requests ${permissionLevel} to run "${command}".`,
    status: "pending",
    scope: "once",
    command,
    createdAt: nowIso()
  };
  database.approvals.unshift(approval);
  run.approvalRequestId = approval.id;
  run.status = "awaiting_approval";
  mission.status = "awaiting_approval";
  addAudit(database, "approval.requested", run.operatorId, `Approval requested for ${command}.`, mission.id, run.id);
  appendMissionLog(database, run.id, "approval", `Approval ${approval.id} requested for ${command}.`);
  createApprovalQuickActions(database, approval);
  return approval;
}

type PendingCompletion = {
  summary: string;
  stdout?: string;
  stderr?: string;
  durationMs: number;
  exitCode: number;
};

function readPendingCompletion(persistence: PersistenceAdapter, runId: string): PendingCompletion | undefined {
  const blocked = persistence
    .listAuditEvents()
    .find((event) => event.runId === runId && event.event === "gate.completion_blocked");
  const pending = blocked?.metadata?.pendingCompletion;
  if (!pending || typeof pending !== "object") return undefined;
  const record = pending as PendingCompletion;
  if (typeof record.summary !== "string") return undefined;
  return record;
}

async function tryFinalizeRunAfterGates(runId: string, operatorId: string, options?: RuntimeOptions): Promise<RuntimeActionResult> {
  const persistence = adapterFrom(options);
  const run = persistence.getMissionRunById(runId);
  if (!run) return { ok: false, summary: "Run not found.", runId };
  const route = run.routeDecisionId
    ? persistence.snapshot().routingDecisions.find((entry) => entry.id === run.routeDecisionId)
    : undefined;
  if (!route) return { ok: false, summary: "Route decision not found.", runId, missionId: run.missionId };
  const pendingGates = getUnsatisfiedCompletionGates(persistence, route.requiredGates, runId);
  if (pendingGates.length > 0) {
    return {
      ok: false,
      summary: `Completion still blocked pending gates: ${pendingGates.join(", ")}.`,
      runId,
      missionId: run.missionId
    };
  }
  const pendingCompletion = readPendingCompletion(persistence, runId);
  if (!pendingCompletion) {
    return { ok: true, summary: "All required gates passed.", runId, missionId: run.missionId };
  }
  const mission = persistence.getMissionById(run.missionId);
  if (!mission) return { ok: false, summary: "Mission not found.", runId };
  const completed = persistence.completeRunBundle({
    runId: run.id,
    missionId: mission.id,
    summary: pendingCompletion.summary,
    stdout: pendingCompletion.stdout,
    stderr: pendingCompletion.stderr,
    resultLogMessage: pendingCompletion.summary,
    auditActor: operatorId,
    correlationId: run.correlationId ?? route.id,
    archiveEntry: {
      id: makeId("archive"),
      workspaceId: mission.workspaceId,
      type: "task_memory",
      title: `Mission result: ${mission.title}`,
      content: `${pendingCompletion.summary}\n\n${pendingCompletion.stdout || "No stdout output."}`,
      source: "mission-run",
      missionId: mission.id,
      runId: run.id,
      agentId: run.operatorId,
      tags: ["mission", "result", mission.command],
      importance: 7,
      archived: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    usageEvent: {
      workspaceId: mission.workspaceId,
      provider: "local-gateway",
      model: route.providerLane,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      agentId: run.operatorId,
      runId: run.id
    },
    metadata: { durationMs: pendingCompletion.durationMs, exitCode: pendingCompletion.exitCode, finalizedAfterGates: true }
  });
  if (!completed) return { ok: false, summary: "Unable to finalize run after gates passed.", runId, missionId: mission.id };
  for (const action of buildStandardRunQuickActionBlueprints(completed.mission, completed.run)) {
    persistence.createQuickAction(action);
  }
  return {
    ok: true,
    summary: completed.run.resultSummary ?? pendingCompletion.summary,
    runId: completed.run.id,
    missionId: completed.mission.id
  };
}

async function executeDeterministicGateCheck(
  gate: "qa" | "security",
  runId: string | undefined,
  missionId: string | undefined,
  operatorId: string,
  options?: RuntimeOptions
): Promise<RuntimeActionResult> {
  const persistence = adapterFrom(options);
  const gatewayBase = gatewayFrom(options);
  const database = persistence.snapshot();
  const run = runId ? getRun(database, runId) : database.missionRuns.find((item) => item.status === "paused" || item.status === "running");
  const mission = missionId ? getMission(database, missionId) : run ? getMission(database, run.missionId) : undefined;
  if (!run || !mission) {
    return { ok: false, summary: `No active run available for ${gate} gate checks.` };
  }
  const commands = gate === "qa" ? ["pnpm typecheck", "pnpm test"] : ["git diff"];
  for (const command of commands) {
    const decision = assessCommandPolicy(command);
    if (decision.policy === "denied") {
      persistence.appendAuditEvent({
        event: `gate.${gate}_failed`,
        actor: operatorId,
        summary: `${gate} gate failed: ${command} is denied by sandbox policy.`,
        missionId: mission.id,
        runId: run.id,
        metadata: { command, policy: decision.policy }
      });
      return { ok: false, summary: `${gate} gate failed because ${command} is denied.`, missionId: mission.id, runId: run.id };
    }
    const gateway = await executeGatewayCommand(command, mission.id, run.id, gatewayBase);
    if (!gateway.ok || !gateway.result?.ok) {
      persistence.appendAuditEvent({
        event: `gate.${gate}_failed`,
        actor: operatorId,
        summary: `${gate} gate failed on ${command}.`,
        missionId: mission.id,
        runId: run.id,
        metadata: {
          command,
          exitCode: gateway.result?.exitCode,
          stderr: gateway.result?.stderr
        }
      });
      return {
        ok: false,
        summary: `${gate} gate failed on ${command}.`,
        missionId: mission.id,
        runId: run.id
      };
    }
    persistence.appendAuditEvent({
      event: "command.executed",
      actor: "gateway",
      summary: `Gate check executed ${command}.`,
      missionId: mission.id,
      runId: run.id,
      metadata: { gate, command }
    });
  }
  persistence.appendAuditEvent({
    event: gatePassEvent(gate),
    actor: operatorId,
    summary: `${gate} gate passed via deterministic checks.`,
    missionId: mission.id,
    runId: run.id
  });
  return tryFinalizeRunAfterGates(run.id, operatorId, options);
}

async function executeGatewayCommand(command: string, missionId: string, runId: string, gatewayBase: string) {
  try {
    const response = await fetch(`${gatewayBase}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, missionId, runId })
    });
    return (await response.json()) as {
      ok?: boolean;
      result?: {
        ok: boolean;
        command: string;
        exitCode: number;
        stdout: string;
        stderr: string;
        durationMs: number;
      };
      decision?: { reason?: string };
    };
  } catch (error) {
    return {
      ok: false,
      decision: {
        reason: error instanceof Error ? error.message : "Gateway unavailable."
      }
    };
  }
}

function updateSessionState(database: AgentOSDatabase, mission: MissionRecord, run: MissionRun) {
  const session = mission.sessionId ? database.sessions.find((item) => item.id === mission.sessionId) : undefined;
  if (!session) return;
  session.latestRunId = run.id;
  session.updatedAt = nowIso();
  if (run.status === "awaiting_approval" || run.status === "paused") session.status = "paused";
  else if (run.status === "completed") session.status = "complete";
  else if (run.status === "failed" || run.status === "denied") session.status = "failed";
  else session.status = "active";
  session.summary = `Mission ${mission.title} is ${run.status}.`;
}

export async function processPendingMissionRuns(options?: RuntimeOptions) {
  const persistence = adapterFrom(options);
  const workerId = workerFrom(options);
  const gatewayBase = gatewayFrom(options);
  const maxAttempts = maxAttemptsFrom(options);
  const results: RuntimeActionResult[] = [];
  while (true) {
    const claimed = persistence.claimNextQueuedRun({
      workerId,
      maxAttempts,
      leaseDurationMs: leaseDurationFrom(options)
    });
    if (!claimed.ok) break;
    persistence.appendMissionLog(claimed.run.id, "system", claimed.reclaimed ? `Worker ${workerId} reclaimed the expired lease.` : `Worker ${workerId} claimed the run.`);
    if (claimed.reclaimed) {
      persistence.appendAuditEvent({
        event: "worker.lease_expired",
        actor: workerId,
        summary: `Recovered expired lease for ${claimed.run.id}.`,
        missionId: claimed.mission.id,
        runId: claimed.run.id
      });
    }
    const result = await processRun(claimed.run.id, {
      persistence,
      gatewayBase,
      workerId,
      maxAttempts,
      leaseDurationMs: leaseDurationFrom(options)
    });
    results.push(result);
  }
  return results;
}

export async function processRun(runId: string, options?: RuntimeOptions): Promise<RuntimeActionResult> {
  const persistence = adapterFrom(options);
  const gatewayBase = gatewayFrom(options);
  const workerId = workerFrom(options);
  const leaseDurationMs = leaseDurationFrom(options);
  const maxAttempts = maxAttemptsFrom(options);
  const installed = loadInstalledAgentProfiles();

  let claimedMissionId = runId;
  let claimedRunId = runId;
  const preclaimed = persistence.getMissionRunById(runId);
  if (preclaimed?.claimedByWorkerId !== workerId) {
    const claimed = persistence.claimNextQueuedRun({
      workerId,
      maxAttempts,
      leaseDurationMs,
      specificRunId: runId
    });
    if (!claimed.ok) {
      return { ok: false, summary: `Run ${runId} was not claimable.` };
    }
    persistence.appendMissionLog(claimed.run.id, "system", claimed.reclaimed ? `Worker ${workerId} reclaimed the expired lease.` : `Worker ${workerId} claimed the run.`);
    claimedMissionId = claimed.mission.id;
    claimedRunId = claimed.run.id;
  } else if (preclaimed) {
    claimedMissionId = preclaimed.missionId;
    claimedRunId = preclaimed.id;
  }

  const claimedMission = persistence.getMissionById(claimedMissionId);
  const claimedRun = persistence.getMissionRunById(claimedRunId);
  if (!claimedMission || !claimedRun) {
    return { ok: false, summary: `Run ${runId} lost its mission context.` };
  }
  const baseRoute = determineMissionRoute(installed, {
    id: claimedMission.id,
    workspaceId: claimedMission.workspaceId,
    title: claimedMission.title,
    objective: claimedMission.objective,
    prompt: claimedMission.prompt,
    command: claimedMission.command,
    runId: claimedRun.id
  });
  const route = applyQuotaStewardToRoute(baseRoute, persistence.listUsageEvents(claimedMission.workspaceId), installed.rootDir);
  const routeInfo = persistence.recordRouteDecisionBundle({
    routeDecision: route,
    missionId: claimedMission.id,
    runId: claimedRun.id,
    primaryAgentId: route.selectedPrimaryAgentId,
    logMessage: `Primary agent ${route.selectedPrimaryAgentId}. Supporting: ${route.supportingAgentIds.join(", ")}.`,
    auditActor: route.selectedPrimaryAgentId,
    correlationId: claimedRun.correlationId ?? route.id,
    metadata: {
      requiredGates: route.requiredGates,
      providerLane: route.providerLane,
      taskEnvelope: route.metadata?.taskEnvelope
    }
  });
  if (!routeInfo) {
    return { ok: false, summary: `Unable to persist route for run ${claimedRun.id}.`, missionId: claimedMission.id, runId: claimedRun.id };
  }
  const routeRun = routeInfo.run ?? claimedRun;
  for (const action of buildStandardRunQuickActionBlueprints(routeInfo.mission, routeRun)) {
    persistence.createQuickAction(action);
  }

  const commandDecision = assessCommandPolicy(routeInfo.mission.command);
  persistence.appendAuditEvent({
    event: "sandbox.command_evaluated",
    actor: "sandbox",
    summary: `${routeInfo.mission.command} => ${commandDecision.policy}.`,
    missionId: routeInfo.mission.id,
    runId: routeRun.id
  });
  persistence.appendMissionLog(routeRun.id, "system", commandDecision.reason);

  const needsApproval =
    commandDecision.policy === "approval_required" ||
    routeInfo.routingDecision.requiredGates.includes("approval") ||
    routeInfo.mission.sandboxLevel !== "observe" && routeInfo.mission.sandboxLevel !== "safe_execute";

  if (commandDecision.policy === "denied") {
    const failed = persistence.failRunBundle({
      runId: routeInfo.run?.id ?? claimedRun.id,
      missionId: routeInfo.mission.id,
      error: commandDecision.reason,
      status: "denied",
      missionStatus: "denied",
      logMessage: commandDecision.reason,
      auditActor: "sandbox",
      correlationId: routeInfo.run?.correlationId ?? routeInfo.routingDecision.id,
      metadata: { policy: commandDecision.policy, permissionLevel: commandDecision.permissionLevel },
      expireActionTypes: ["pause", "resume", "approve", "deny", "release"]
    });
    if (failed) {
      for (const action of buildStandardRunQuickActionBlueprints(failed.mission, failed.run)) {
        persistence.createQuickAction(action);
      }
    }
    return { ok: false, summary: commandDecision.reason, missionId: routeInfo.mission.id, runId: routeRun.id };
  }

  if (needsApproval) {
    const approvalBundle = persistence.createApprovalRequestBundle({
      approval: {
        workspaceId: routeInfo.mission.workspaceId,
        requestedByOperatorId: routeInfo.mission.requestedByOperatorId,
        agentId: routeInfo.run?.operatorId ?? claimedRun.operatorId,
        missionId: routeInfo.mission.id,
        sessionId: routeInfo.mission.sessionId,
        runId: routeInfo.run?.id ?? claimedRun.id,
        tool: "command.execute",
        permissionLevel: commandDecision.permissionLevel,
        inputSummary: `Mission requests ${commandDecision.permissionLevel} to run "${routeInfo.mission.command}".`,
        scope: "once",
        command: routeInfo.mission.command,
        correlationId: routeInfo.run?.correlationId ?? routeInfo.routingDecision.id
      },
      quickActions: buildApprovalQuickActionBlueprints({
        id: "pending",
        workspaceId: routeInfo.mission.workspaceId,
        requestedByOperatorId: routeInfo.mission.requestedByOperatorId,
        agentId: routeInfo.run?.operatorId ?? claimedRun.operatorId,
        missionId: routeInfo.mission.id,
        sessionId: routeInfo.mission.sessionId,
        runId: routeInfo.run?.id ?? claimedRun.id,
        tool: "command.execute",
        permissionLevel: commandDecision.permissionLevel,
        inputSummary: "",
        status: "pending",
        scope: "once",
        command: routeInfo.mission.command,
        createdAt: nowIso()
      }).map((action) => ({ ...action, approvalRequestId: undefined })),
      releaseRunLease: true,
      runStatus: "awaiting_approval",
      missionStatus: "awaiting_approval",
      logMessage: `Approval requested for ${routeInfo.mission.command}.`,
      auditActor: routeInfo.run?.operatorId ?? claimedRun.operatorId,
      correlationId: routeInfo.run?.correlationId ?? routeInfo.routingDecision.id,
      metadata: { permissionLevel: commandDecision.permissionLevel }
    });
    const approval = approvalBundle?.approval;
    if (!approval) {
      return { ok: false, summary: "Unable to create approval request.", missionId: routeInfo.mission.id, runId: routeInfo.run?.id ?? claimedRun.id };
    }
    return {
      ok: true,
      summary: `Approval ${approval.id} requested.`,
      missionId: routeInfo.mission.id,
      runId: routeRun.id,
      approvalRequestId: approval.id
    };
  }

  if (routeInfo.routingDecision.providerLane === "defer") {
    const deferred = persistence.pauseRunBundle({
      runId: routeRun.id,
      actor: workerId,
      summary: "Deferred by quota steward until a subscription bucket resets.",
      correlationId: routeRun.correlationId ?? routeInfo.routingDecision.id,
      metadata: { quotaSteward: routeInfo.routingDecision.metadata?.quotaSteward }
    });
    persistence.appendAuditEvent({
      event: "quota.deferred",
      actor: "quota-steward",
      summary: "Run deferred because a subscription provider bucket is depleted.",
      missionId: routeInfo.mission.id,
      runId: routeRun.id,
      correlationId: routeRun.correlationId ?? routeInfo.routingDecision.id,
      metadata: { quotaSteward: routeInfo.routingDecision.metadata?.quotaSteward }
    });
    if (deferred) {
      for (const action of buildStandardRunQuickActionBlueprints(deferred.mission, deferred.run)) {
        persistence.createQuickAction(action);
      }
    }
    return {
      ok: false,
      summary: "Run deferred by quota steward until subscription capacity resets.",
      missionId: routeInfo.mission.id,
      runId: routeRun.id
    };
  }

  persistence.startRunExecutionBundle({
    runId: routeRun.id,
    actor: workerId,
    correlationId: routeRun.correlationId ?? routeInfo.routingDecision.id,
    metadata: { command: routeInfo.mission.command }
  });

  const gateway = await executeGatewayCommand(routeInfo.mission.command, routeInfo.mission.id, routeRun.id, gatewayBase);
  if (!gateway.ok || !gateway.result) {
    const failed = persistence.failRunBundle({
      runId: routeInfo.run?.id ?? claimedRun.id,
      missionId: routeInfo.mission.id,
      error: gateway.decision?.reason ?? "Gateway execution failed.",
      logMessage: gateway.decision?.reason ?? "Gateway execution failed.",
      auditActor: "gateway",
      correlationId: routeInfo.run?.correlationId ?? routeInfo.routingDecision.id,
      metadata: { command: routeInfo.mission.command },
      retryQuickAction: {
        missionId: routeInfo.mission.id,
        runId: routeInfo.run?.id ?? claimedRun.id,
        label: "Retry",
        emoji: "🔁",
        actionType: "retry",
        riskLevel: "medium"
      },
      expireActionTypes: ["pause", "resume", "approve", "deny"]
    });
    if (failed) {
      for (const action of buildStandardRunQuickActionBlueprints(failed.mission, failed.run)) {
        persistence.createQuickAction(action);
      }
      return { ok: false, summary: failed.run.error ?? "Gateway execution failed.", missionId: failed.mission.id, runId: failed.run.id };
    }
    return { ok: false, summary: gateway.decision?.reason ?? "Gateway execution failed.", missionId: routeInfo.mission.id, runId: routeInfo.run?.id ?? claimedRun.id };
  }

  persistence.appendAuditEvent({
    event: "command.executed",
    actor: "gateway",
    summary: `Executed ${routeInfo.mission.command}.`,
    missionId: routeInfo.mission.id,
    runId: routeInfo.run?.id ?? claimedRun.id,
    correlationId: routeInfo.run?.correlationId ?? routeInfo.routingDecision.id
  });

  if (!gateway.result.ok) {
    const failed = persistence.failRunBundle({
      runId: routeInfo.run?.id ?? claimedRun.id,
      missionId: routeInfo.mission.id,
      error: gateway.result.stderr || `Command failed with exit code ${gateway.result.exitCode}.`,
      logMessage: gateway.result.stderr || `Command failed with exit code ${gateway.result.exitCode}.`,
      auditActor: routeInfo.run?.operatorId ?? claimedRun.operatorId,
      correlationId: routeInfo.run?.correlationId ?? routeInfo.routingDecision.id,
      metadata: { exitCode: gateway.result.exitCode },
      retryQuickAction: {
        missionId: routeInfo.mission.id,
        runId: routeInfo.run?.id ?? claimedRun.id,
        label: "Retry",
        emoji: "🔁",
        actionType: "retry",
        riskLevel: "medium"
      },
      expireActionTypes: ["pause", "resume", "approve", "deny"]
    });
    if (failed) {
      for (const action of buildStandardRunQuickActionBlueprints(failed.mission, failed.run)) {
        persistence.createQuickAction(action);
      }
      return { ok: false, summary: failed.run.error ?? "Command failed.", missionId: failed.mission.id, runId: failed.run.id };
    }
    return { ok: false, summary: gateway.result.stderr || `Command failed with exit code ${gateway.result.exitCode}.`, missionId: routeInfo.mission.id, runId: routeInfo.run?.id ?? claimedRun.id };
  }

  const resultSummary = `Executed "${routeInfo.mission.command}" in ${gateway.result.durationMs}ms with exit code ${gateway.result.exitCode}.`;
  const pendingGates = getUnsatisfiedCompletionGates(
    persistence,
    routeInfo.routingDecision.requiredGates,
    routeInfo.run?.id ?? claimedRun.id
  );
  if (pendingGates.length > 0) {
    const pendingCompletion: PendingCompletion = {
      summary: resultSummary,
      stdout: gateway.result.stdout,
      stderr: gateway.result.stderr || undefined,
      durationMs: gateway.result.durationMs,
      exitCode: gateway.result.exitCode
    };
    const paused = persistence.pauseRunBundle({
      runId: routeInfo.run?.id ?? claimedRun.id,
      actor: workerId,
      summary: `Command finished; waiting on gates: ${pendingGates.join(", ")}.`,
      correlationId: routeInfo.run?.correlationId ?? routeInfo.routingDecision.id,
      metadata: { pendingGates, pendingCompletion }
    });
    persistence.appendAuditEvent({
      event: "gate.completion_blocked",
      actor: workerId,
      summary: `Completion blocked pending gates: ${pendingGates.join(", ")}.`,
      missionId: routeInfo.mission.id,
      runId: routeInfo.run?.id ?? claimedRun.id,
      correlationId: routeInfo.run?.correlationId ?? routeInfo.routingDecision.id,
      metadata: { pendingGates, pendingCompletion }
    });
    if (paused) {
      for (const action of createGateQuickActionBlueprints(paused.mission.id, paused.run.id, pendingGates)) {
        persistence.createQuickAction(action);
      }
      for (const action of buildStandardRunQuickActionBlueprints(paused.mission, paused.run)) {
        persistence.createQuickAction(action);
      }
    }
    return {
      ok: true,
      summary: `${resultSummary} Completion blocked pending gates: ${pendingGates.join(", ")}.`,
      missionId: routeInfo.mission.id,
      runId: routeInfo.run?.id ?? claimedRun.id
    };
  }

  const completed = persistence.completeRunBundle({
    runId: routeInfo.run?.id ?? claimedRun.id,
    missionId: routeInfo.mission.id,
    summary: resultSummary,
    stdout: gateway.result.stdout,
    stderr: gateway.result.stderr || undefined,
    resultLogMessage: resultSummary,
    auditActor: routeInfo.run?.operatorId ?? claimedRun.operatorId,
    correlationId: routeInfo.run?.correlationId ?? routeInfo.routingDecision.id,
    archiveEntry: {
      id: makeId("archive"),
      workspaceId: routeInfo.mission.workspaceId,
      type: "task_memory",
      title: `Mission result: ${routeInfo.mission.title}`,
      content: `${resultSummary}\n\n${gateway.result.stdout || "No stdout output."}`,
      source: "mission-run",
      missionId: routeInfo.mission.id,
      runId: routeInfo.run?.id ?? claimedRun.id,
      agentId: routeInfo.run?.operatorId ?? claimedRun.operatorId,
      tags: ["mission", "result", routeInfo.mission.command],
      importance: 7,
      archived: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    },
    usageEvent: {
      workspaceId: routeInfo.mission.workspaceId,
      provider: "local-gateway",
      model: routeInfo.routingDecision.providerLane,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      agentId: routeInfo.run?.operatorId ?? claimedRun.operatorId,
      runId: routeInfo.run?.id ?? claimedRun.id
    },
    metadata: { durationMs: gateway.result.durationMs, exitCode: gateway.result.exitCode }
  });
  if (completed) {
    for (const action of buildStandardRunQuickActionBlueprints(completed.mission, completed.run)) {
      persistence.createQuickAction(action);
    }
    return { ok: true, summary: completed.run.resultSummary ?? resultSummary, missionId: completed.mission.id, runId: completed.run.id };
  }
  return { ok: false, summary: "Unable to persist run completion.", missionId: routeInfo.mission.id, runId: routeInfo.run?.id ?? claimedRun.id };
}

function formatMissionSummary(database: AgentOSDatabase, mission?: MissionRecord, run?: MissionRun) {
  if (!mission || !run) return "No active mission is selected.";
  const route = run.routeDecisionId ? database.routingDecisions.find((entry) => entry.id === run.routeDecisionId) : undefined;
  return [
    `${mission.title} is ${run.status}.`,
    `Command: ${mission.command}.`,
    route ? `Primary agent: ${route.selectedPrimaryAgentId}. Gates: ${route.requiredGates.join(", ") || "none"}.` : "Route details are not available yet.",
    run.resultSummary ?? run.error ?? "Run is still in progress."
  ].join(" ");
}

export async function continueMissionRunAfterApproval(runId: string, options?: RuntimeOptions) {
  const persistence = adapterFrom(options);
  const run = persistence.getMissionRunById(runId);
  if (!run || run.status !== "awaiting_approval") return { ok: false, summary: "Run is not waiting for approval.", runId };
  persistence.releaseRunLease({
    runId,
    status: "queued",
    missionStatus: "queued"
  });
  persistence.appendMissionLog(runId, "approval", "Approval resolved; run requeued for worker execution.");
  return processRun(runId, options);
}

export function pauseMissionRun(runId: string, options?: RuntimeOptions) {
  const persistence = adapterFrom(options);
  const paused = persistence.pauseRunBundle({ runId, actor: "operator" });
  if (!paused) return { ok: false, summary: "Run not found.", runId };
  return { ok: true, summary: `Paused ${paused.mission.title}.`, missionId: paused.mission.id, runId: paused.run.id };
}

export async function resumeMissionRun(runId: string, options?: RuntimeOptions) {
  const persistence = adapterFrom(options);
  const resumed = persistence.resumeRunBundle({ runId, actor: "operator" });
  if (!resumed) return { ok: false, summary: "Run not found.", runId };
  return processRun(runId, options);
}

export async function retryMissionRun(runId: string, options?: RuntimeOptions) {
  const persistence = adapterFrom(options);
  const retried = persistence.retryRunBundle({ runId, actor: "operator" });
  if (!retried) return { ok: false, summary: "Unable to retry the run.", runId };
  return processRun(retried.run.id, options);
}

function consumeQuickAction(database: AgentOSDatabase, actionId: string, operatorId: string) {
  const action = database.quickActions.find((item) => item.id === actionId);
  if (!action || action.consumedAt) return undefined;
  action.consumedAt = nowIso();
  action.consumedByOperatorId = operatorId;
  addAudit(database, "quick_action.consumed", operatorId, `Consumed quick action ${action.label}.`, action.missionId, action.runId);
  return structuredClone(action);
}

export async function executeQuickAction(actionId: string, operatorId: string, options?: RuntimeOptions) {
  const persistence = adapterFrom(options);
  const consumed = persistence.consumeQuickActionBundle({
    actionId,
    operatorId,
    expireSiblingActionTypes: ["approve", "deny", "pause", "resume", "retry"]
  });
  const action = consumed?.action;
  if (!action) return { ok: false, summary: "Quick action not found or already consumed." };

  switch (action.actionType) {
    case "approve":
      return resolveApprovalDecision(action.approvalRequestId!, "approved", "once", operatorId, options);
    case "deny":
      return resolveApprovalDecision(action.approvalRequestId!, "denied", undefined, operatorId, options);
    case "pause":
      return pauseMissionRun(action.runId!, options);
    case "resume":
      return resumeMissionRun(action.runId!, options);
    case "retry":
      return retryMissionRun(action.runId!, options);
    case "details":
    case "summarize": {
      const database = persistence.snapshot();
      const summary = formatMissionSummary(database, getMission(database, action.missionId), getRun(database, action.runId));
      return { ok: true, summary, missionId: action.missionId, runId: action.runId };
    }
    case "run_qa":
      return executeDeterministicGateCheck("qa", action.runId, action.missionId, operatorId, options);
    case "security_review":
      return executeDeterministicGateCheck("security", action.runId, action.missionId, operatorId, options);
    case "release":
      return { ok: false, summary: "Release remains gated and is not executed automatically.", missionId: action.missionId, runId: action.runId };
  }
}

export async function resolveApprovalDecision(
  approvalId: string,
  status: ApprovalRecord["status"],
  scope: ApprovalRecord["scope"] | undefined,
  operatorId: string,
  options?: RuntimeOptions
) {
  const persistence = adapterFrom(options);
  if (status === "approved") {
    const approval = persistence.snapshot().approvals.find((item) => item.id === approvalId);
    if (approval?.runId) {
      const run = persistence.getMissionRunById(approval.runId);
      if (run && IMPLEMENTER_AGENT_IDS.has(run.operatorId) && operatorId === run.operatorId) {
        return {
          ok: false,
          summary: "Implementer agents cannot self-approve their own runs.",
          approvalRequestId: approvalId,
          runId: run.id,
          missionId: run.missionId
        };
      }
    }
  }
  const approvalBundle = persistence.resolveApprovalDecisionBundle({
    approvalId,
    status,
    scope,
    operatorId,
    runStatus: status === "approved" ? "queued" : "denied",
    missionStatus: status === "approved" ? "queued" : "denied",
    error: status === "denied" ? "Control Gate denied the request." : undefined,
    logMessage: status === "approved" ? "Approval resolved; run requeued for worker execution." : "Control Gate denied the request."
  });

  if (!approvalBundle) {
    return { ok: false, summary: "Approval not found.", approvalRequestId: approvalId };
  }

  if (status === "approved" && approvalBundle.approval.runId) {
    const continued = await processRun(approvalBundle.approval.runId, options);
    return { ...continued, approvalRequestId: approvalBundle.approval.id };
  }

  return {
    ok: true,
    summary: `Approval ${approvalBundle.approval.id} ${status}.`,
    missionId: approvalBundle.approval.missionId,
    runId: approvalBundle.approval.runId,
    approvalRequestId: approvalBundle.approval.id
  };
}

function createAssistantMessage(database: AgentOSDatabase, threadId: string, missionId: string | undefined, runId: string | undefined, content: string, askHuman: boolean, intentType: string) {
  const message: ChatMessageRecord = {
    id: makeId("chat"),
    workspaceId: database.workspaces[0].id,
    threadId,
    role: "assistant",
    content,
    operatorId: database.operators[0].id,
    missionId,
    runId,
    intentType,
    askHuman,
    createdAt: nowIso()
  };
  database.chatMessages.push(message);
  return message;
}

function createUserMessage(database: AgentOSDatabase, threadId: string, operatorId: string, missionId: string | undefined, runId: string | undefined, content: string, intent: ConversationalIntent) {
  const message: ChatMessageRecord = {
    id: makeId("chat"),
    workspaceId: database.workspaces[0].id,
    threadId,
    role: "user",
    content,
    operatorId,
    missionId,
    runId,
    intentType: intent.type,
    askHuman: intent.askHuman,
    createdAt: nowIso()
  };
  database.chatMessages.push(message);
  addAudit(database, "chat.message_received", operatorId, content, missionId, runId);
  return message;
}

export async function handleChatMessage(
  threadId: string,
  operatorId: string,
  content: string,
  options?: RuntimeOptions
) {
  const persistence = adapterFrom(options);
  const database = persistence.snapshot();
  const activeRun = database.missionRuns.find((run) => run.status === "awaiting_approval" || run.status === "running" || run.status === "paused" || run.status === "failed");
  const activeMission = activeRun ? getMission(database, activeRun.missionId) : database.missions.find((mission) => mission.status === "running" || mission.status === "awaiting_approval" || mission.status === "paused");
  const intent = parseConversationalIntent(content, {
    activeMission,
    activeRun,
    pendingApprovalIds: database.approvals.filter((approval) => approval.status === "pending").map((approval) => approval.id)
  });
  persistence.appendChatExchangeBundle({
    threadId,
    userMessage: {
      threadId,
      role: "user",
      content,
      operatorId,
      missionId: activeMission?.id,
      runId: activeRun?.id,
      intentType: intent.type,
      askHuman: intent.askHuman
    },
    audit: {
      event: "chat.message_received",
      actor: operatorId,
      summary: content,
      missionId: activeMission?.id,
      runId: activeRun?.id
    }
  });
  const context = {
    intent,
    activeMissionId: activeMission?.id,
    activeRunId: activeRun?.id
  };

  let result: RuntimeActionResult;
  switch (context.intent.type) {
    case "approve_active":
      result = await resolveApprovalDecision(context.intent.targetApprovalRequestId!, "approved", "once", operatorId, options);
      break;
    case "deny_active":
      result = await resolveApprovalDecision(context.intent.targetApprovalRequestId!, "denied", undefined, operatorId, options);
      break;
    case "pause_active":
      result = await pauseMissionRun(context.intent.targetRunId!, options);
      break;
    case "resume_active":
      result = await resumeMissionRun(context.intent.targetRunId!, options);
      break;
    case "retry_last":
      result = await retryMissionRun(context.intent.targetRunId!, options);
      break;
    case "run_qa":
      result = await executeDeterministicGateCheck("qa", context.intent.targetRunId, context.intent.targetMissionId, operatorId, options);
      break;
    case "security_review":
      result = await executeDeterministicGateCheck("security", context.intent.targetRunId, context.intent.targetMissionId, operatorId, options);
      break;
    case "show_details":
    case "summarize":
      {
      const latest = persistence.snapshot();
      result = {
        ok: true,
        summary: formatMissionSummary(latest, getMission(latest, context.intent.targetMissionId), getRun(latest, context.intent.targetRunId)),
        missionId: context.intent.targetMissionId,
        runId: context.intent.targetRunId
      };
      break;
      }
    case "release":
      result = { ok: false, summary: "Release and commit actions stay gated and are not executed automatically.", missionId: context.intent.targetMissionId, runId: context.intent.targetRunId };
      break;
    case "clarify":
    default:
      result = { ok: false, summary: context.intent.reason, missionId: context.intent.targetMissionId, runId: context.intent.targetRunId };
      break;
  }

  const message = persistence.appendChatExchangeBundle({
    threadId,
    assistantMessage: {
      threadId,
      role: "assistant",
      content: result.summary,
      operatorId,
      missionId: result.missionId,
      runId: result.runId,
      intentType: context.intent.type,
      askHuman: context.intent.askHuman
    }
  }).assistantMessage!;
  return { intent: context.intent, result, message };
}

export async function executeRichQuickAction(
  input: {
    actionType: AgentRichQuickActionType;
    operatorId: string;
    scope: AgentRichMessageScope;
    threadId?: string;
  },
  options?: RuntimeOptions
): Promise<RuntimeActionResult> {
  const persistence = adapterFrom(options);
  const database = persistence.snapshot();
  const pendingApprovals = database.approvals.filter((approval) => approval.status === "pending");
  const validated = validateRichQuickActionScope(input.actionType, input.scope, { pendingApprovals });
  if (!validated.ok) {
    return { ok: false, summary: validated.reason };
  }
  const scope = validated.scope;

  switch (input.actionType) {
    case "approve":
      return resolveApprovalDecision(scope.approvalRequestId!, "approved", "once", input.operatorId, options);
    case "deny":
      return resolveApprovalDecision(scope.approvalRequestId!, "denied", undefined, input.operatorId, options);
    case "request_more_information": {
      persistence.appendAuditEvent({
        event: "rich_action.request_more_information",
        actor: input.operatorId,
        summary: "Operator asked for more information via rich card.",
        missionId: scope.missionId,
        runId: scope.runId,
        correlationId: scope.correlationId
      });
      if (input.threadId) {
        persistence.appendChatExchangeBundle({
          threadId: input.threadId,
          assistantMessage: {
            threadId: input.threadId,
            role: "assistant",
            content: "Ash needs more information before proceeding. What should change?",
            operatorId: input.operatorId,
            missionId: scope.missionId,
            runId: scope.runId,
            intentType: "clarify",
            askHuman: true
          }
        });
      }
      return {
        ok: true,
        summary: "Ash requested more information from the operator.",
        missionId: scope.missionId,
        runId: scope.runId,
        approvalRequestId: scope.approvalRequestId
      };
    }
    case "agent_received_response":
      persistence.appendAuditEvent({
        event: "rich_action.agent_received_response",
        actor: input.operatorId,
        summary: "Operator marked the agent response as received.",
        missionId: scope.missionId,
        runId: scope.runId,
        correlationId: scope.correlationId
      });
      return {
        ok: true,
        summary: "Marked agent response as received.",
        missionId: scope.missionId,
        runId: scope.runId,
        approvalRequestId: scope.approvalRequestId
      };
    case "agent_responding":
      persistence.appendAuditEvent({
        event: "rich_action.agent_responding",
        actor: input.operatorId,
        summary: "Agent is responding to operator input.",
        missionId: scope.missionId,
        runId: scope.runId,
        correlationId: scope.correlationId
      });
      return {
        ok: true,
        summary: "Ash is responding to the latest operator message.",
        missionId: scope.missionId,
        runId: scope.runId,
        approvalRequestId: scope.approvalRequestId
      };
    case "agent_completed_task":
      persistence.appendAuditEvent({
        event: "rich_action.agent_completed_task",
        actor: input.operatorId,
        summary: "Agent marked the scoped task as complete.",
        missionId: scope.missionId,
        runId: scope.runId,
        correlationId: scope.correlationId
      });
      return {
        ok: true,
        summary: "Ash marked the scoped task complete.",
        missionId: scope.missionId,
        runId: scope.runId,
        approvalRequestId: scope.approvalRequestId
      };
    default:
      return { ok: false, summary: "Unsupported rich quick action." };
  }
}

