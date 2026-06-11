import { assessCommandPolicy } from "@agentos/sandbox";
import { loadInstalledAgentProfiles } from "@agentos/agents";
import { determineMissionRoute, parseConversationalIntent } from "@agentos/orchestrator";
import type { AgentOSDatabase, PersistenceAdapter, QuickActionBlueprint } from "@agentos/persistence";
import { getPersistenceAdapter } from "@agentos/persistence";
import {
  nowIso,
  type ApprovalRecord,
  type AuditEvent,
  type ChatMessageRecord,
  type ConversationalIntent,
  type MissionRecord,
  type MissionRun,
  type MissionRunLog,
  type QuickActionRecord,
  type QuickActionType,
  type RouteRiskLevel
} from "@agentos/shared";

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
  const route = determineMissionRoute(installed, {
    id: claimedMission.id,
    workspaceId: claimedMission.workspaceId,
    title: claimedMission.title,
    objective: claimedMission.objective,
    prompt: claimedMission.prompt,
    command: claimedMission.command,
    runId: claimedRun.id
  });
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
      providerLane: route.providerLane
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
      return { ok: true, summary: "QA gate request recorded.", missionId: action.missionId, runId: action.runId };
    case "security_review":
      return { ok: true, summary: "Security review request recorded.", missionId: action.missionId, runId: action.runId };
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
      result = createFollowUpGateMission("QA review", "pnpm test", "qa-agent", context.intent.targetMissionId, options);
      break;
    case "security_review":
      result = createFollowUpGateMission("Security review", "git diff", "security-auditor", context.intent.targetMissionId, options);
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

function createFollowUpGateMission(label: string, command: string, operatorId: string, parentMissionId: string | undefined, options?: RuntimeOptions): RuntimeActionResult {
  const persistence = adapterFrom(options);
  const parentMission = parentMissionId ? persistence.getMissionById(parentMissionId) : undefined;
  const created = persistence.createMissionBundle({
    mission: {
      title: `${label}${parentMission ? ` for ${parentMission.title}` : ""}`,
      objective: `${label} requested from conversational control.`,
      prompt: `${label} was requested from chat. Keep the review deterministic and safe.`,
      operatorId,
      sessionId: parentMission?.sessionId,
      status: "queued",
      sandboxLevel: command === "pnpm test" ? "safe_execute" : "observe",
      command,
      commandPolicy: "approval_required",
      provider: "mock",
      model: "mock-agentos-local"
    },
    initialRun: {
      status: "queued",
      commandPolicy: "approval_required",
      requestedCommand: command
    },
    audit: {
      actor: operatorId,
      summary: `Created follow-up ${label.toLowerCase()} mission.`
    }
  });
  void processRun(created.run.id, options);
  return { ok: true, summary: `${label} mission queued.`, missionId: created.mission.id, runId: created.run.id };
}
