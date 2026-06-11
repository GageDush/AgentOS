import { loadRepoEnv } from "./load-env";

loadRepoEnv();

import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { chooseAgentForMission } from "@agentos/orchestrator";
import {
  continueMissionRunAfterApproval,
  executeQuickAction,
  handleChatMessage,
  pauseMissionRun,
  processPendingMissionRuns,
  processRun,
  resolveApprovalDecision,
  resumeMissionRun,
  retryMissionRun
} from "@agentos/runtime";
import { assessCommandPolicy } from "@agentos/sandbox";
import type { GatewayExecutionResult, LlmChatRequest, MissionRecord, MissionRun, SandboxPermissionLevel } from "@agentos/shared";
import { searchMemories } from "@agentos/memory";
import { findRepoRoot } from "@agentos/persistence";
import { evaluateBudget, evaluateQuotaSteward } from "@agentos/token-manager";
import { getProviderId, providers } from "./providers";
import { createGitHubMissionIssue } from "./github";
import { renderAuthLoginRequiredPage, renderAuthMePage, renderAuthSuccessPage } from "./auth-pages";
import {
  buildDiscordAuthorizeUrl,
  createDiscordOperatorSession,
  getDiscordOAuthSuccessRedirect,
  isDiscordOAuthConfigured
} from "./discord-auth";
import {
  buildSessionCookie,
  clearSessionCookie,
  createOAuthState,
  createSessionToken,
  readCookieValue,
  readSessionToken,
  sessionCookieName
} from "./session";
import {
  addAudit,
  addBudget,
  addUsageEvent,
  completeDemoMission,
  completeTask,
  createChatMessage,
  createChatThread,
  createMission,
  createMissionRun,
  createRoutine,
  createSession,
  createTask,
  ensureSessionForMission,
  failTask,
  archiveMemoryEntry,
  getChatThread,
  getDatabaseSnapshot,
  getMission,
  getMissionLogs,
  getMissionRun,
  getQuickAction,
  getRoutine,
  getSession,
  getTask,
  listChatMessages,
  listChatThreads,
  listPendingApprovals,
  listQuickActions,
  persistMemory,
  runDemoMission,
  startTask,
  store,
  updateMission,
  updateRoutine,
  usageSummary
} from "./store";

const app = Fastify({ logger: true });
const port = Number(process.env.AGENTOS_API_PORT ?? 8787);
const repoRoot = findRepoRoot(process.cwd());

function quotaStatus() {
  return evaluateQuotaSteward(store.usageEvents, repoRoot, {
    cursorBillingDay: Number(process.env.AGENTOS_CURSOR_BILLING_DAY ?? 1)
  });
}

await app.register(cors, { origin: true, credentials: true });
await app.register(websocket);

function permissionEscalates(level: SandboxPermissionLevel) {
  return !["observe", "safe_execute"].includes(level);
}

app.get("/health", async () => ({
  ok: true,
  service: "AgentOS API",
  mode: process.env.AGENTOS_MODEL_PROVIDER ?? "mock",
  provider: getProviderId(),
  timestamp: new Date().toISOString()
}));

app.get("/dashboard", async () => {
  const database = getDatabaseSnapshot();
  return {
    workspaces: database.workspaces,
    operators: database.operators,
    agents: database.agents,
    missions: database.missions,
    runs: database.missionRuns,
    approvals: database.approvals,
    audit: database.auditEvents,
    archive: database.memories,
    routines: database.routines,
    loadout: database.loadout,
    sessions: database.sessions,
    quickActions: database.quickActions,
    chatThreads: database.chatThreads,
    chatMessages: database.chatMessages.slice(-120),
    routingDecisions: database.routingDecisions,
    usage: usageSummary(),
    quota: quotaStatus(),
    system: {
      api: "online",
      worker: "online",
      gateway: "online",
      discordMode: process.env.DISCORD_BOT_TOKEN ? "real" : "mock",
      providerMode: getProviderId() === "mock" ? "mock" : "real"
    }
  };
});

app.get("/policy/check", async (request) => {
  const query = request.query as { command?: string; sandboxLevel?: SandboxPermissionLevel };
  const commandDecision = assessCommandPolicy(query.command ?? "");
  const requestedLevel = query.sandboxLevel ?? "safe_execute";
  return {
    decision: commandDecision,
    requestedLevel,
    requiresControlGate: commandDecision.policy !== "auto_allowed" || permissionEscalates(requestedLevel),
    explanation:
      commandDecision.policy === "denied"
        ? "This command is blocked before execution."
        : commandDecision.policy === "approval_required"
          ? "This command is outside the small local allow-list and will pause in Control Gate."
          : permissionEscalates(requestedLevel)
            ? "The command is safe, but the requested sandbox level escalates beyond safe execution."
            : "This mission can run straight through without an approval pause."
  };
});

app.get("/providers/status", async () => {
  let ollama = { available: false, message: "Ollama not checked." };
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags");
    ollama = response.ok
      ? { available: true, message: "Ollama is reachable on loopback." }
      : { available: false, message: `Ollama returned HTTP ${response.status}.` };
  } catch {
    ollama = { available: false, message: "Ollama is unavailable at http://127.0.0.1:11434." };
  }
  return {
    defaultProvider: getProviderId(),
    ollama,
    mock: { available: true, message: "Mock provider is always available." }
  };
});

app.get("/auth/discord", async (request, reply) => {
  if (!isDiscordOAuthConfigured()) {
    return reply.code(503).send({ error: "Discord OAuth is not configured." });
  }
  const state = createOAuthState();
  reply.header("Set-Cookie", `agentos_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
  return reply.redirect(buildDiscordAuthorizeUrl(state));
});

app.get("/auth/discord/callback", async (request, reply) => {
  if (!isDiscordOAuthConfigured()) {
    return reply.code(503).send({ error: "Discord OAuth is not configured." });
  }
  const query = request.query as { code?: string; state?: string; error?: string };
  if (query.error) {
    return reply.code(400).send({ error: query.error });
  }
  const expectedState = readCookieValue(request.headers.cookie, "agentos_oauth_state");
  if (!query.code || !query.state || !expectedState || query.state !== expectedState) {
    return reply.code(400).send({ error: "Invalid OAuth state." });
  }
  try {
    const session = await createDiscordOperatorSession(query.code);
    const token = createSessionToken(session);
    reply.header("Set-Cookie", [
      buildSessionCookie(token),
      "agentos_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    ]);
    return reply.redirect(getDiscordOAuthSuccessRedirect());
  } catch (error) {
    return reply.code(502).send({
      error: error instanceof Error ? error.message : "Discord OAuth callback failed."
    });
  }
});

function publicApiBaseUrl() {
  const port = process.env.AGENTOS_API_PORT ?? 8787;
  return process.env.AGENTOS_API_BASE_URL?.trim() || `http://127.0.0.1:${port}`;
}

function prefersHtmlResponse(acceptHeader?: string) {
  if (!acceptHeader) return false;
  return acceptHeader.includes("text/html") && !acceptHeader.includes("application/json");
}

app.get("/auth/success", async (request, reply) => {
  const token = readCookieValue(request.headers.cookie, sessionCookieName());
  const session = readSessionToken(token);
  const appUrl = process.env.AGENTOS_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  reply.type("text/html; charset=utf-8");
  if (!session) {
    return renderAuthLoginRequiredPage(publicApiBaseUrl());
  }
  return renderAuthSuccessPage(session, appUrl);
});

app.get("/auth/me", async (request, reply) => {
  const token = readCookieValue(request.headers.cookie, sessionCookieName());
  const session = readSessionToken(token);
  const appUrl = process.env.AGENTOS_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  if (!session) {
    if (prefersHtmlResponse(request.headers.accept)) {
      reply.type("text/html; charset=utf-8");
      return reply.code(401).send(renderAuthLoginRequiredPage(publicApiBaseUrl()));
    }
    return reply.code(401).send({ authenticated: false });
  }
  if (prefersHtmlResponse(request.headers.accept)) {
    reply.type("text/html; charset=utf-8");
    return renderAuthMePage(session, appUrl);
  }
  return { authenticated: true, session };
});

app.get("/", async (_request, reply) => reply.redirect("/auth/success"));

app.post("/auth/logout", async (_request, reply) => {
  reply.header("Set-Cookie", clearSessionCookie());
  return { ok: true };
});

app.get("/operators", async () => store.agents);
app.get("/workspaces", async () => store.workspaces);
app.get("/users", async () => store.operators);

app.get("/missions", async () => store.missions);
app.post("/missions", async (request) => {
  const body = request.body as Partial<MissionRecord> & { createGitHubIssue?: boolean };
  const chosen = chooseAgentForMission([], {
    title: body.title ?? "Untitled mission",
    objective: body.objective ?? "Run a local mission.",
    command: body.command ?? "git status"
  });
  const thread = createChatThread({
    title: body.title ? `${body.title} Control Thread` : "AgentOS Control Thread",
    scope: "mission"
  });
  const wantsGitHubIssue = Boolean(body.createGitHubIssue ?? body.metadata?.createGitHubIssue);
  let mission =
    createMission({
      ...body,
      operatorId: body.operatorId ?? chosen?.id ?? "agentos-operator",
      activeThreadId: body.activeThreadId ?? thread.id,
      status: "draft",
      metadata: {
        ...(body.metadata ?? {}),
        ...(wantsGitHubIssue ? { createGitHubIssue: true } : {})
      }
    }) ?? undefined;
  if (!mission) {
    throw new Error("Mission creation failed.");
  }
  if (wantsGitHubIssue) {
    try {
      const githubIssueUrl = createGitHubMissionIssue(mission);
      mission = updateMission(mission.id, {
        metadata: { ...(mission.metadata ?? {}), createGitHubIssue: true, githubIssueUrl }
      }) ?? mission;
    } catch (cause) {
      mission =
        updateMission(mission.id, {
          metadata: {
            ...(mission.metadata ?? {}),
            createGitHubIssue: true,
            githubIssueError: cause instanceof Error ? cause.message : "GitHub issue creation failed."
          }
        }) ?? mission;
    }
  }
  return mission;
});
app.get("/missions/:id", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  return mission;
});
app.post("/missions/:id/run", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  const session = ensureSessionForMission(mission);
  const run = createMissionRun({
    workspaceId: mission.workspaceId,
    missionId: mission.id,
    sessionId: session.id,
    requestedByOperatorId: mission.requestedByOperatorId,
    operatorId: mission.operatorId,
    provider: mission.provider,
    model: mission.model,
    status: "queued",
    commandPolicy: mission.commandPolicy,
    requestedCommand: mission.command
  });
  const result = await processRun(run.id);
  return { mission: getMission(mission.id), run: getMissionRun(run.id), result };
});

app.get("/runs", async () => store.missionRuns);
app.get("/runs/:id", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  return run;
});
app.get("/runs/:id/logs", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  return getMissionLogs(run.id);
});
app.post("/runs/:id/continue", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  const result = await continueMissionRunAfterApproval(run.id);
  return { run: getMissionRun(run.id), result };
});
app.post("/runs/:id/pause", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  return pauseMissionRun(run.id);
});
app.post("/runs/:id/resume", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  return resumeMissionRun(run.id);
});
app.post("/runs/:id/retry", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  return retryMissionRun(run.id);
});

app.get("/routines", async () => store.routines);
app.post("/routines", async (request) => createRoutine(request.body as Record<string, unknown>));
app.post("/routines/:id/toggle", async (request, reply) => {
  const routine = getRoutine((request.params as { id: string }).id);
  if (!routine) return reply.code(404).send({ error: "Routine not found" });
  const updated = updateRoutine(routine.id, {
    enabled: !routine.enabled,
    status: routine.enabled ? "paused" : "scheduled"
  });
  addAudit("routine.toggled", "agentos-operator", `${updated?.enabled ? "Enabled" : "Paused"} routine: ${routine.title}`);
  return updated;
});
app.post("/routines/:id/run", async (request, reply) => {
  const routine = getRoutine((request.params as { id: string }).id);
  if (!routine) return reply.code(404).send({ error: "Routine not found" });
  const mission = createMission({
    workspaceId: routine.workspaceId,
    requestedByOperatorId: routine.requestedByOperatorId,
    title: routine.title,
    objective: routine.objective,
    prompt: routine.prompt,
    command: routine.command,
    sandboxLevel: routine.sandboxLevel,
    provider: routine.provider,
    model: routine.model,
    operatorId: chooseAgentForMission([], {
      title: routine.title,
      objective: routine.objective,
      command: routine.command
    })?.id
  });
  const session = ensureSessionForMission(mission);
  const run = createMissionRun({
    workspaceId: mission.workspaceId,
    missionId: mission.id,
    sessionId: session.id,
    requestedByOperatorId: mission.requestedByOperatorId,
    operatorId: mission.operatorId,
    provider: mission.provider,
    model: mission.model,
    status: "queued",
    commandPolicy: mission.commandPolicy,
    requestedCommand: mission.command
  });
  updateRoutine(routine.id, {
    latestRunId: run.id,
    lastRunAt: new Date().toISOString(),
    status: "running"
  });
  const result = await processRun(run.id);
  return { mission, run: getMissionRun(run.id), routine: getRoutine(routine.id), result };
});

app.get("/loadout", async () => store.loadout);
app.get("/sessions", async () => store.sessions);
app.post("/sessions", async (request) => createSession(request.body as Record<string, unknown>));
app.post("/sessions/:id/pause", async (request, reply) => {
  const session = getSession((request.params as { id: string }).id);
  if (!session) return reply.code(404).send({ error: "Session not found" });
  if (session.latestRunId) return pauseMissionRun(session.latestRunId);
  return { ok: false, summary: "Session has no run to pause." };
});
app.post("/sessions/:id/resume", async (request, reply) => {
  const session = getSession((request.params as { id: string }).id);
  if (!session) return reply.code(404).send({ error: "Session not found" });
  if (session.latestRunId) return resumeMissionRun(session.latestRunId);
  return { ok: false, summary: "Session has no run to resume." };
});

app.get("/agents", async () => store.agents);
app.get("/agents/:id", async (request, reply) => {
  const agent = store.agents.find((item) => item.id === (request.params as { id: string }).id);
  if (!agent) return reply.code(404).send({ error: "Agent not found" });
  return agent;
});

app.get("/tasks", async () => store.tasks);
app.post("/tasks", async (request) => createTask(request.body as Record<string, string>));
app.get("/tasks/:id", async (request, reply) => {
  const task = getTask((request.params as { id: string }).id);
  if (!task) return reply.code(404).send({ error: "Task not found" });
  return task;
});
app.post("/tasks/:id/run", async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const task = startTask(id);
  if (!task) return reply.code(404).send({ error: "Task not found" });

  addAudit("task.started", task.assignedAgentId ?? "agentos-operator", `Started task: ${task.title}`);

  try {
    const provider = providers[getProviderId()];
    const result = await provider.chat({
      prompt: task.prompt || task.description,
      model: (request.body as { model?: string } | undefined)?.model,
      agentId: task.assignedAgentId,
      saveMemory: true
    });
    completeTask(id, result.response);
    addAudit("task.completed", task.assignedAgentId ?? "agentos-operator", `Completed task: ${task.title}`);
    const memory = persistMemory({
      type: "task_memory",
      title: `Task result: ${task.title}`,
      content: result.response,
      taskId: task.id,
      agentId: task.assignedAgentId,
      source: result.provider,
      tags: ["task", "result"],
      importance: 6,
      archived: false
    });
    createChatMessage({
      threadId: store.chatThreads[0]?.id ?? "thread-local-command-center",
      role: "system",
      content: `Task completed: ${task.title}`,
      operatorId: task.assignedAgentId
    });
    addAudit("archive.entry_written", task.assignedAgentId ?? "agentos-operator", `Stored task result for ${task.title}`);
    return { task: getTask(id), llm: result, memory };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown task execution failure.";
    failTask(id, message);
    addAudit("task.failed", task.assignedAgentId ?? "agentos-operator", `Task failed: ${task.title}`);
    return reply.code(502).send({ error: message, task: getTask(id) });
  }
});

app.get("/archive", async () => store.memories);
app.get("/memory", async () => store.memories);
app.post("/memory", async (request) => {
  const body = request.body as Omit<Parameters<typeof persistMemory>[0], "workspaceId" | "id" | "createdAt" | "updatedAt">;
  const memory = persistMemory(body);
  return memory;
});
app.post("/memory/search", async (request) => {
  const body = request.body as { query?: string };
  return searchMemories(store.memories, body.query ?? "");
});
app.post("/memory/:id/archive", async (request, reply) => {
  const memory = archiveMemoryEntry((request.params as { id: string }).id);
  if (!memory) return reply.code(404).send({ error: "Memory not found" });
  return memory;
});

app.get("/usage", async () => store.usageEvents);
app.get("/usage/summary", async () => usageSummary());
app.get("/quota/status", async () => quotaStatus());
app.get("/usage/budgets", async () => store.budgets);
app.post("/usage/budgets", async (request) => addBudget(request.body as Parameters<typeof addBudget>[0]));
app.post("/usage/mock-event", async (request, reply) => {
  const body = request.body as { estimatedCostUsd?: number; promptTokens?: number; completionTokens?: number };
  const decision = evaluateBudget(store.usageEvents, store.budgets, body.estimatedCostUsd ?? 0);
  if (!decision.allowed) return reply.code(402).send({ blocked: true, decision });
  const promptTokens = body.promptTokens ?? 900;
  const completionTokens = body.completionTokens ?? 300;
  return {
    decision,
    event: addUsageEvent({
      provider: "mock",
      model: "mock-agentos-local",
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd: body.estimatedCostUsd ?? 0,
      agentId: "agentos-operator",
      taskId: "task-command-center",
      runId: "run-seed"
    })
  };
});

app.get("/approvals", async () => store.approvals);
app.get("/control-gate", async () => ({
  pending: listPendingApprovals(),
  recent: store.approvals.slice(0, 20),
  quickActions: listQuickActions().filter((action) => !action.consumedAt)
}));
app.post("/approvals/:id/approve-once", async (request, reply) => resolveApprovalDecision((request.params as { id: string }).id, "approved", "once", store.operators[0]?.id ?? "operator-local"));
app.post("/approvals/:id/approve-for-mission", async (request, reply) =>
  resolveApprovalDecision((request.params as { id: string }).id, "approved", "mission", store.operators[0]?.id ?? "operator-local")
);
app.post("/approvals/:id/deny", async (request, reply) => resolveApprovalDecision((request.params as { id: string }).id, "denied", undefined, store.operators[0]?.id ?? "operator-local"));

app.get("/quick-actions", async () => listQuickActions());
app.post("/quick-actions/:id/consume", async (request, reply) => {
  const action = getQuickAction((request.params as { id: string }).id);
  if (!action) return reply.code(404).send({ error: "Quick action not found" });
  return executeQuickAction(action.id, store.operators[0]?.id ?? "operator-local");
});

app.get("/chat/threads", async () => listChatThreads());
app.post("/chat/threads", async (request) => createChatThread(request.body as Record<string, unknown>));
app.get("/chat/threads/:id/messages", async (request, reply) => {
  const thread = getChatThread((request.params as { id: string }).id);
  if (!thread) return reply.code(404).send({ error: "Thread not found" });
  return listChatMessages(thread.id);
});
app.post("/chat/threads/:id/messages", async (request, reply) => {
  const thread = getChatThread((request.params as { id: string }).id);
  if (!thread) return reply.code(404).send({ error: "Thread not found" });
  const body = request.body as { content?: string; operatorId?: string };
  if (!body.content?.trim()) return reply.code(400).send({ error: "Message content is required." });
  return handleChatMessage(thread.id, body.operatorId ?? thread.operatorId, body.content);
});

app.get("/audit", async () => store.auditEvents);
app.post("/llm/chat", async (request, reply) => {
  const body = request.body as LlmChatRequest;
  if (!body?.prompt?.trim()) {
    return reply.code(400).send({ ok: false, error: "Prompt is required." });
  }

  try {
    const provider = providers[getProviderId()];
    const result = await provider.chat(body);
    let savedMemoryId: string | undefined;

    if (body.saveMemory !== false) {
      const memory = persistMemory({
        type: "tool_result",
        title: `Local AI console response (${result.model})`,
        content: result.response,
        source: result.provider,
        agentId: body.agentId,
        tags: ["llm", "local-ai"],
        importance: 5,
        archived: false
      });
      savedMemoryId = memory.id;
    }

    addAudit("llm.chat.completed", body.agentId ?? "agentos-operator", `Local AI response from ${result.provider}.`);

    const estimatedCostUsd = 0;
    const promptTokens = Math.ceil(body.prompt.length / 4);
    const completionTokens = Math.ceil(result.response.length / 4);
    addUsageEvent({
      provider: result.provider,
      model: result.model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd,
      agentId: body.agentId,
      runId: `llm-${Date.now()}`
    });

    return {
      ...result,
      savedMemoryId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local AI provider failure.";
    return reply.code(502).send({ ok: false, error: message, provider: getProviderId() });
  }
});

app.get("/mission/demo", async () => store.demoMission);
app.post("/mission/demo/run", async () => {
  const mission = runDemoMission();
  const summary = "The Office Demo is archival, but its safe playback still works for demos.";
  completeDemoMission(summary);
  return store.demoMission;
});

app.post("/worker/process", async () => processPendingMissionRuns());

app.get("/system", async () => ({
  api: "online",
  worker: "online",
  gateway: "online",
  discordMode: process.env.DISCORD_BOT_TOKEN ? "real" : "mock",
  providerMode: getProviderId() === "mock" ? "mock" : "real",
  features: {
    ollama: (process.env.FEATURE_OLLAMA ?? "true") === "true",
    discord: (process.env.FEATURE_DISCORD ?? "false") === "true" && Boolean(process.env.DISCORD_BOT_TOKEN),
    demoMode: (process.env.FEATURE_DEMO_MODE ?? "true") === "true",
    cloudProviders: false,
    toolExecution: true,
    conversationalControl: true,
    quickActions: true
  }
}));

app.get("/discord/mock", async () => ({
  mode: process.env.DISCORD_BOT_TOKEN ? "real-configured" : "mock",
  configured: Boolean(process.env.DISCORD_BOT_TOKEN),
  commands: ["status summary", "show active mission", "approve that", "show details"]
}));

app.get("/events", { websocket: true }, (connection) => {
  connection.send(JSON.stringify({ event: "system.health.changed", data: { api: "online" } }));
  const timer = setInterval(() => {
    const database = getDatabaseSnapshot();
    connection.send(
      JSON.stringify({
        event: "agentos.snapshot",
        data: {
          approvals: database.approvals.filter((approval) => approval.status === "pending"),
          runs: database.missionRuns.slice(0, 10),
          audit: database.auditEvents.slice(0, 10),
          quickActions: database.quickActions.filter((action) => !action.consumedAt).slice(0, 10)
        }
      })
    );
  }, 2500);
  connection.on("close", () => clearInterval(timer));
});

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
