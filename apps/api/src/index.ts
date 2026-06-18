import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadRepoEnv } from "./load-env";

import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import {
  applyMemoryKeys,
  applyWikiMemoryEdits,
  listQueuedMemoryUpdates,
  resolveQueuedMemoryUpdate
} from "@agentos/agents";
import { chooseAgentForMission, parseBuildIntent } from "@agentos/orchestrator";
import { enqueueMissionRun } from "@agentos/queue";
import {
  approveRunReleaseGate,
  continueMissionRunAfterApproval,
  executeQuickAction,
  executeRichQuickAction,
  getRunGateStatus,
  handleChatMessage,
  pauseMissionRun,
  prepareRunReleaseGate,
  processPendingMissionRuns,
  processRun,
  bulkApprovePendingApprovals,
  resolveApprovalDecision,
  resumeMissionRun,
  retryMissionRun
} from "@agentos/runtime";
import { assessCommandPolicy } from "@agentos/sandbox";
import {
  buildForgeAgentRoster,
  type AgentRichQuickActionType,
  type LlmChatRequest,
  type MissionRecord,
  type MissionRun,
  type SandboxPermissionLevel
} from "@agentos/shared";
import {
  buildWikiGraph,
  cursorWikiSyncIntervalMs,
  expandWikiContext,
  getWikiBacklinks,
  isCursorWikiSyncEnabled,
  isMemoryWikiWriteEnabled,
  listWikiArticles,
  loadWikiArticle,
  loadWikiManifest,
  normalizeWikiSlug,
  rebuildWikiManifest,
  searchMemories,
  searchWikiArticles,
  syncChatGptPlanningToWiki,
  syncCursorSessionsToWiki
} from "@agentos/memory";
import { listRouteAliases, routeLlmCall } from "@agentos/llm-router";
import { findRepoRoot } from "@agentos/persistence";
import { evaluateBudget, evaluateQuotaSteward } from "@agentos/token-manager";
import { buildApiRuntimeOptions } from "./runtime-options";
import { getProviderId, providers } from "./providers";
import { buildPullRequestBody, createGitHubMissionIssue, createGitHubPullRequest } from "./github";
import { installApiAuthGuard, requireAuthWebSocket } from "./auth-guard";
import { resolveCorsOrigin } from "./cors-policy";
import { requireDiscordAdminApi } from "./discord-admin-guard";
import { mutateRateLimitPreHandler } from "./rate-limit";
import { renderAuthLoginRequiredPage, renderAuthMePage, renderAuthSuccessPage } from "./auth-pages";
import {
  buildDiscordAuthorizeUrl,
  createDiscordOperatorSession,
  getDiscordOAuthSuccessRedirect,
  isDiscordOAuthConfigured
} from "./discord-auth";
import { bootstrapDiscordGuild, loadDiscordGuildState, postChannelGuides, restructureDiscordGuild, syncDiscordCommands, syncDiscordRoles } from "./discord/bootstrap";
import { isDiscordBotEnabled } from "./discord/client";
import { startDiscordGateway } from "./discord/gateway";
import { ensureOperatorLaneIndicator } from "./discord/operator-lane-status";
import { dispatchDiscordInteraction, interactionPublicKeyConfigured, verifyInteractionRequest, type DiscordInteraction } from "./discord/interactions";
import { installDiscordPersistenceHooks } from "./discord/persistence-hooks";
import { registerScraperRoutes } from "./scraper/routes.js";
import { postSystemPulse, syncPendingApprovalsToDiscord } from "./discord/notify";
import {
  buildSessionCookie,
  clearSessionCookie,
  createOAuthState,
  createSessionToken,
  readCookieValue,
  readSessionToken,
  sessionCookieName,
  touchSessionCookie,
  operatorIdFromRequest
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

loadRepoEnv();
installDiscordPersistenceHooks();

/** Route auth classes: docs/architecture/api-auth-matrix.md */
const app = Fastify({ logger: true });
installApiAuthGuard(app);
app.addHook("preHandler", mutateRateLimitPreHandler);
const port = Number(process.env.AGENTOS_API_PORT ?? 8787);
const repoRoot = findRepoRoot(process.cwd());

app.addHook("preParsing", async (request, _reply, payload) => {
  if (!request.url.startsWith("/discord/interactions")) {
    return payload;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of payload) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks);
  (request as { rawBody?: string }).rawBody = raw.toString("utf8");
  const { Readable } = await import("node:stream");
  return Readable.from([raw]);
});

function quotaStatus() {
  return evaluateQuotaSteward(store.usageEvents, repoRoot, {
    cursorBillingDay: Number(process.env.AGENTOS_CURSOR_BILLING_DAY ?? 1)
  });
}

function actingOperatorId(request: { headers: { cookie?: string } }) {
  return operatorIdFromRequest(request) ?? store.operators[0]?.id ?? "operator-local";
}

await app.register(cors, { origin: resolveCorsOrigin, credentials: true });
await app.register(websocket);
await registerScraperRoutes(app);

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

const agentPortraitDirs = [
  join(findRepoRoot(process.cwd()), "apps/api/public/agents"),
  join(findRepoRoot(process.cwd()), "apps/command-center/public/agents")
];

app.get("/media/agents/:file", async (request, reply) => {
  const file = (request.params as { file: string }).file;
  if (!/^[\w-]+\.png$/.test(file)) {
    return reply.code(400).send({ error: "Invalid agent portrait filename." });
  }
  const path = agentPortraitDirs.map((dir) => join(dir, file)).find((candidate) => existsSync(candidate));
  if (!path) {
    return reply.code(404).send({ error: "Agent portrait not found." });
  }
  reply.header("Cache-Control", "public, max-age=86400");
  return reply.type("image/png").send(readFileSync(path));
});

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
  const host = String(request.headers.host ?? "");
  return reply.redirect(buildDiscordAuthorizeUrl(state, host));
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
    const session = await createDiscordOperatorSession(query.code, String(request.headers.host ?? ""));
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
  if (token) {
    reply.header("Set-Cookie", touchSessionCookie(token));
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
  if (token) {
    reply.header("Set-Cookie", touchSessionCookie(token));
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

app.post("/missions/:id/questionnaire/generate", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  const body = (request.body ?? {}) as { description?: string };
  const description = body.description ?? mission.prompt ?? mission.objective ?? mission.title;
  const buildIntent = parseBuildIntent(description);
  const updated =
    updateMission(mission.id, {
      metadata: {
        ...(mission.metadata ?? {}),
        buildIntent,
        questionnaireStatus: "pending"
      }
    }) ?? mission;
  return { mission: updated, buildIntent };
});

app.get("/missions/:id/generated-app", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  const metadata = mission.metadata as { outputDir?: string; files?: string[] } | undefined;
  if (!metadata?.outputDir) return reply.code(404).send({ error: "No generated app for this mission." });
  return {
    missionId: mission.id,
    outputDir: metadata.outputDir,
    files: metadata.files ?? [],
    previewPath: metadata.outputDir
  };
});

app.post("/missions/:id/feedback", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  const body = (request.body ?? {}) as { text?: string; kind?: string };
  const metadata = mission.metadata as {
    buildIntent?: ReturnType<typeof parseBuildIntent>;
    lastFeedback?: { text: string; kind: string; at: string };
  };
  const feedbackText = body.text ?? "";
  const updated =
    updateMission(mission.id, {
      metadata: {
        ...(mission.metadata ?? {}),
        lastFeedback: { text: feedbackText, kind: body.kind ?? "functional", at: new Date().toISOString() },
        buildIntent: metadata?.buildIntent
          ? {
              ...metadata.buildIntent,
              answers: { ...(metadata.buildIntent.answers ?? {}), feedback: feedbackText }
            }
          : undefined
      }
    }) ?? mission;
  return { mission: updated };
});

app.get("/missions/:id/generated-app/preview", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  const metadata = mission.metadata as { outputDir?: string; files?: string[] } | undefined;
  if (!metadata?.outputDir) return reply.code(404).send({ error: "No generated app for this mission." });
  const outputDir = metadata.outputDir;
  const readmePath = join(outputDir, "README.md");
  const pagePath = join(outputDir, "app", "page.tsx");
  return {
    missionId: mission.id,
    outputDir,
    files: metadata.files ?? [],
    readme: existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "",
    pageSource: existsSync(pagePath) ? readFileSync(pagePath, "utf8") : ""
  };
});

app.post("/missions/:id/regen", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  const body = (request.body ?? {}) as { feedback?: string; scope?: string };
  if (body.feedback?.trim()) {
    const metadata = mission.metadata as { buildIntent?: ReturnType<typeof parseBuildIntent> };
    updateMission(mission.id, {
      metadata: {
        ...(mission.metadata ?? {}),
        regenScope: body.scope ?? "full",
        lastFeedback: { text: body.feedback, kind: "regen", at: new Date().toISOString() },
        buildIntent: metadata?.buildIntent
          ? {
              ...metadata.buildIntent,
              answers: { ...(metadata.buildIntent.answers ?? {}), feedback: body.feedback }
            }
          : undefined
      }
    });
  }
  const refreshed = getMission(mission.id)!;
  const session = ensureSessionForMission(refreshed);
  const run = createMissionRun({
    workspaceId: refreshed.workspaceId,
    missionId: refreshed.id,
    sessionId: session.id,
    requestedByOperatorId: refreshed.requestedByOperatorId,
    operatorId: refreshed.operatorId,
    provider: refreshed.provider,
    model: refreshed.model,
    status: "queued",
    commandPolicy: refreshed.commandPolicy,
    requestedCommand: refreshed.command
  });
  const result = await processRun(run.id, buildApiRuntimeOptions({ sessionKey: run.id }));
  return { mission: getMission(refreshed.id), run: getMissionRun(run.id), result };
});

app.post("/missions/:id/questionnaire/submit", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  const body = (request.body ?? {}) as { answers?: Record<string, string> };
  const answers = body.answers ?? {};
  const buildIntent = (mission.metadata as { buildIntent?: ReturnType<typeof parseBuildIntent> } | undefined)?.buildIntent;
  const updated =
    updateMission(mission.id, {
      metadata: {
        ...(mission.metadata ?? {}),
        buildIntent: buildIntent ? { ...buildIntent, answers } : undefined,
        questionnaireStatus: "submitted",
        questionnaireAnswers: answers
      }
    }) ?? mission;
  return { mission: updated, answers };
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
  await enqueueMissionRun(run.id);
  const result = await processRun(run.id, buildApiRuntimeOptions({ sessionKey: run.id }));
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
  const result = await processRun(run.id, buildApiRuntimeOptions({ sessionKey: run.id }));
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

app.get("/agents/roster", async () => ({ agents: buildForgeAgentRoster() }));

app.get("/memory/wiki", async () => {
  const articles = listWikiArticles(repoRoot).filter((article) => !article.archived);
  return { articles, count: articles.length };
});

app.get("/memory/wiki/manifest", async () => {
  const manifest = loadWikiManifest(repoRoot) ?? rebuildWikiManifest(repoRoot);
  return manifest;
});

// Wikilink graph for the /wiki Map view. Same shape as graph.json, but archived
// articles (and their edges) are dropped; orphans are hidden unless requested.
app.get("/memory/wiki/graph", async (request, reply) => {
  const includeOrphans = (request.query as { includeOrphans?: string }).includeOrphans === "true";
  const graph = buildWikiGraph(repoRoot);

  const articles: typeof graph.articles = {};
  for (const [slug, summary] of Object.entries(graph.articles)) {
    if (!summary.archived) articles[slug] = summary;
  }
  const visible = new Set(Object.keys(articles));

  const filterMap = (map: Record<string, string[]>): Record<string, string[]> => {
    const next: Record<string, string[]> = {};
    for (const [slug, targets] of Object.entries(map)) {
      if (!visible.has(slug)) continue;
      const kept = targets.filter((target) => visible.has(target));
      if (kept.length) next[slug] = kept;
    }
    return next;
  };

  const outbound = filterMap(graph.outbound);
  const inbound = filterMap(graph.inbound);

  let resultArticles = articles;
  if (!includeOrphans) {
    const linked = new Set<string>();
    for (const [slug, targets] of Object.entries(outbound)) {
      linked.add(slug);
      for (const target of targets) linked.add(target);
    }
    for (const [slug, targets] of Object.entries(inbound)) {
      linked.add(slug);
      for (const target of targets) linked.add(target);
    }
    resultArticles = Object.fromEntries(Object.entries(articles).filter(([slug]) => linked.has(slug)));
  }

  void reply.header("Cache-Control", "private, max-age=30");
  return { articles: resultArticles, outbound, inbound };
});

app.post("/memory/wiki/rebuild", async () => {
  const manifest = rebuildWikiManifest(repoRoot);
  addAudit("memory.wiki_rebuilt", "operator-api", `Rebuilt wiki manifest (${manifest.articles.length} articles).`);
  return { ok: true, count: manifest.articles.length, generatedAt: manifest.generatedAt };
});

app.get("/memory/wiki/article", async (request, reply) => {
  const slug = normalizeWikiSlug((request.query as { slug?: string }).slug ?? "");
  if (!slug) return reply.code(400).send({ error: "Query parameter slug is required." });
  const article = loadWikiArticle(repoRoot, slug);
  if (!article) return reply.code(404).send({ error: "Wiki article not found." });
  const backlinks = getWikiBacklinks(repoRoot, slug).map((item) => ({
    slug: item.slug,
    title: item.title
  }));
  return { article, backlinks };
});

app.get("/memory/wiki/backlinks", async (request, reply) => {
  const slug = normalizeWikiSlug((request.query as { slug?: string }).slug ?? "");
  if (!slug) return reply.code(400).send({ error: "Query parameter slug is required." });
  const backlinks = getWikiBacklinks(repoRoot, slug);
  return {
    slug,
    backlinks: backlinks.map((item) => ({ slug: item.slug, title: item.title, path: item.path }))
  };
});

app.post("/memory/wiki/search", async (request) => {
  const body = (request.body ?? {}) as { query?: string; limit?: number };
  const matches = searchWikiArticles(repoRoot, body.query ?? "", body.limit ?? 12);
  return { query: body.query ?? "", matches };
});

app.post("/memory/wiki/expand", async (request) => {
  const body = (request.body ?? {}) as {
    query?: string;
    maxHops?: number;
    maxChars?: number;
    maxArticles?: number;
    maxSections?: number;
    sectionLevel?: boolean;
    seedSlugs?: string[];
    repoPaths?: string[];
    taskType?: string;
  };
  const result = expandWikiContext(repoRoot, body.query ?? "", {
    maxHops: body.maxHops,
    maxChars: body.maxChars,
    maxArticles: body.maxArticles,
    maxSections: body.maxSections,
    sectionLevel: body.sectionLevel,
    seedSlugs: body.seedSlugs,
    signals: {
      repoPaths: body.repoPaths,
      taskType: body.taskType
    }
  });
  return result;
});

app.post("/memory/wiki/sync-chatgpt", async (request, reply) => {
  if (!isMemoryWikiWriteEnabled()) {
    return reply.code(400).send({
      error: "Memory wiki write is disabled. Set FEATURE_MEMORY_WIKI=true and AGENTOS_MEMORY_WIKI_WRITE=true."
    });
  }
  const body = (request.body ?? {}) as { full?: boolean };
  const result = syncChatGptPlanningToWiki(repoRoot, { full: body.full === true });
  addAudit(
    "memory.wiki_chatgpt_sync",
    "operator-api",
    `ChatGPT planning sync: indexed=${result.indexed} updated=${result.updated} skipped=${result.skipped}`
  );
  return { ok: true, ...result };
});

app.post("/memory/wiki/sync-cursor", async (request, reply) => {
  if (!isMemoryWikiWriteEnabled()) {
    return reply.code(400).send({
      error: "Memory wiki write is disabled. Set FEATURE_MEMORY_WIKI=true and AGENTOS_MEMORY_WIKI_WRITE=true."
    });
  }
  const body = (request.body ?? {}) as { full?: boolean; applyCrossLinks?: boolean };
  const result = syncCursorSessionsToWiki(repoRoot, {
    full: body.full === true,
    applyCrossLinks: body.applyCrossLinks !== false
  });
  addAudit(
    "memory.wiki_cursor_sync",
    "operator-api",
    `Cursor wiki sync: indexed=${result.indexed} updated=${result.updated} skipped=${result.skipped}`
  );
  return { ok: true, ...result };
});

app.get("/memory/queue", async (request) => {
  const runId = (request.query as { runId?: string }).runId;
  const items = listQueuedMemoryUpdates(findRepoRoot(), runId).map((item) => ({
    id: item.id,
    queuedAt: item.queuedAt,
    memoryKeys: item.memoryKeys,
    wikiEdits: item.wikiEdits,
    summary: item.summary,
    sourceAgent: item.sourceAgent,
    missionId: item.missionId,
    runId: item.runId
  }));
  return { items };
});

app.post("/memory/queue/:id/approve", async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const item = resolveQueuedMemoryUpdate(id);
  if (!item) return reply.code(404).send({ error: "Queued memory update not found." });
  if (item.wikiEdits?.length) {
    const appliedWikiSlugs = applyWikiMemoryEdits(item, repoRoot);
    addAudit(
      "memory.wiki_applied",
      "operator-api",
      `Approved wiki edits: ${appliedWikiSlugs.join(", ")}.`,
      item.missionId,
      item.runId
    );
    return { ok: true, appliedWikiSlugs };
  }
  applyMemoryKeys(item, item.memoryKeys, repoRoot);
  addAudit("memory.update_applied", "operator-api", `Approved memory keys: ${item.memoryKeys.join(", ")}.`, item.missionId, item.runId);
  return { ok: true, appliedKeys: item.memoryKeys };
});

app.post("/memory/queue/:id/dismiss", async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const item = resolveQueuedMemoryUpdate(id);
  if (!item) return reply.code(404).send({ error: "Queued memory update not found." });
  addAudit("memory.update_dismissed", "operator-api", `Dismissed memory keys: ${item.memoryKeys.join(", ")}.`, item.missionId, item.runId);
  return { ok: true };
});

app.get("/usage", async () => store.usageEvents);
app.get("/usage/summary", async () => usageSummary());
app.get("/quota/status", async () => quotaStatus());
app.get("/usage/budgets", async () => store.budgets);
app.post("/usage/budgets", async (request) => addBudget(request.body as Parameters<typeof addBudget>[0]));

// ── LLM router (Phase 1: additive — existing providers/agents callers unchanged) ──
app.post("/llm/chat", async (request, reply) => {
  const body = (request.body ?? {}) as LlmChatRequest & {
    messages?: Array<{ role: string; content: string }>;
    alias?: string;
    missionId?: string;
    runId?: string;
    estimatedCostUsd?: number;
  };

  const prompt =
    body.prompt?.trim() ||
    body.messages?.filter((m) => m.role === "user").map((m) => m.content).join("\n").trim();

  if (!prompt) {
    return reply.code(400).send({ ok: false, error: "Prompt is required." });
  }

  const result = await routeLlmCall(repoRoot, store.usageEvents, {
    prompt,
    messages: body.messages,
    alias: body.alias,
    model: body.model,
    agentId: body.agentId,
    missionId: body.missionId,
    runId: body.runId,
    estimatedCostUsd: body.estimatedCostUsd,
    budgets: store.budgets
  });

  if (result.ok && result.usageEvent) {
    addUsageEvent({
      provider: result.usageEvent.provider,
      model: result.usageEvent.model,
      promptTokens: result.usageEvent.promptTokens,
      completionTokens: result.usageEvent.completionTokens,
      totalTokens: result.usageEvent.totalTokens,
      estimatedCostUsd: result.usageEvent.estimatedCostUsd,
      agentId: result.usageEvent.agentId,
      taskId: result.usageEvent.taskId,
      runId: result.usageEvent.runId
    });
    addAudit(
      "llm.route.completed",
      result.usageEvent.agentId ?? "operator-api",
      `Routed via ${result.provider}/${result.model} (${result.lane}).`,
      result.usageEvent.taskId,
      result.usageEvent.runId
    );
  } else if (result.blocked) {
    addAudit(
      "llm.route.blocked",
      body.agentId ?? "operator-api",
      result.blockReason ?? "Router blocked the call.",
      body.missionId,
      body.runId
    );
    return reply.code(429).send(result);
  } else if (!result.ok) {
    return reply.code(502).send(result);
  }

  let savedMemoryId: string | undefined;
  if (body.saveMemory !== false && result.text) {
    const memory = persistMemory({
      type: "tool_result",
      title: `LLM router response (${result.model})`,
      content: result.text,
      source: result.provider,
      agentId: body.agentId,
      tags: ["llm", "router"],
      importance: 5,
      archived: false
    });
    savedMemoryId = memory.id;
  }

  return {
    ...result,
    response: result.text,
    savedMemoryId
  };
});

app.get("/llm/routes", async () => {
  const aliases = listRouteAliases(repoRoot);
  let ollama = false;
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags");
    ollama = response.ok;
  } catch {
    ollama = false;
  }
  let litellm = false;
  const litellmEnabled = process.env.FEATURE_LITELLM_PROXY === "true";
  if (litellmEnabled) {
    try {
      const base = process.env.AGENTOS_LITELLM_BASE_URL ?? "http://127.0.0.1:4000";
      const response = await fetch(`${base}/health`);
      litellm = response.ok;
    } catch {
      litellm = false;
    }
  }
  return {
    mode: process.env.AGENTOS_LLM_ROUTER_MODE ?? "local-first",
    litellmEnabled,
    health: { ollama, litellm },
    aliases
  };
});

app.get("/llm/activity", async (request) => {
  const limitRaw = Number((request.query as { limit?: string }).limit ?? 50);
  const limit = Math.max(1, Math.min(500, Number.isFinite(limitRaw) ? limitRaw : 50));
  const events = [...store.usageEvents].slice(-limit).reverse();
  return { events, count: events.length };
});
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
app.post("/approvals/:id/approve-once", async (request, reply) =>
  resolveApprovalDecision((request.params as { id: string }).id, "approved", "once", actingOperatorId(request))
);
app.post("/approvals/:id/approve-for-mission", async (request, reply) =>
  resolveApprovalDecision((request.params as { id: string }).id, "approved", "mission", actingOperatorId(request))
);
app.post("/approvals/:id/deny", async (request, reply) =>
  resolveApprovalDecision((request.params as { id: string }).id, "denied", undefined, actingOperatorId(request))
);
app.post("/approvals/bulk/approve-once", async (request) =>
  bulkApprovePendingApprovals(actingOperatorId(request))
);

app.get("/quick-actions", async () => listQuickActions());
app.post("/quick-actions/:id/consume", async (request, reply) => {
  const action = getQuickAction((request.params as { id: string }).id);
  if (!action) return reply.code(404).send({ error: "Quick action not found" });
  return executeQuickAction(action.id, actingOperatorId(request));
});

app.post("/rich-actions/execute", async (request, reply) => {
  const body = request.body as {
    actionType?: AgentRichQuickActionType;
    scope?: {
      missionId?: string;
      runId?: string;
      approvalRequestId?: string;
      correlationId?: string;
    };
    threadId?: string;
    operatorId?: string;
  };
  if (!body.actionType) {
    return reply.code(400).send({ error: "actionType is required." });
  }
  const result = await executeRichQuickAction({
    actionType: body.actionType,
    operatorId: actingOperatorId(request),
    scope: body.scope ?? {},
    threadId: body.threadId
  });
  if (result.ok && body.actionType === "approve" && result.runId) {
    await continueMissionRunAfterApproval(result.runId);
  }
  return result;
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

app.get("/mission/demo", async () => store.demoMission);
app.post("/mission/demo/run", async () => {
  const demoPlayback = runDemoMission();
  const mission = createMission({
    title: "Platform demo quality gate",
    objective: "Run the local AgentOS demo mission through worker and gateway typecheck.",
    prompt: "Execute the platform demo quality gate and summarize results.",
    command: "pnpm typecheck",
    sandboxLevel: "workspace_write",
    provider: "mock",
    model: "mock-agentos-local",
    status: "queued"
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
  const result = await processRun(run.id, buildApiRuntimeOptions({ sessionKey: run.id }));
  const summary = result.summary || "Platform demo mission completed.";
  completeDemoMission(summary);
  return {
    demoMission: store.demoMission,
    demoPlayback,
    mission: getMission(mission.id),
    run: getMissionRun(run.id),
    result
  };
});

app.get("/runs/:id/gates", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  return getRunGateStatus(run.id);
});

app.post("/runs/:id/gates/release/prepare", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  const body = (request.body ?? {}) as { operatorId?: string };
  return prepareRunReleaseGate(run.id, body.operatorId ?? "agentos-operator");
});

app.post("/runs/:id/gates/release/approve", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  const body = (request.body ?? {}) as { operatorId?: string };
  return approveRunReleaseGate(run.id, body.operatorId ?? "agentos-operator");
});

app.post("/runs/:id/release/pr", async (request, reply) => {
  const run = getMissionRun((request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  const mission = getMission(run.missionId);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  const gates = getRunGateStatus(run.id);
  if (gates.pending.includes("release")) {
    return reply.code(409).send({ error: "Release gate must pass before opening a PR." });
  }
  const prepared = store.auditEvents.find((event) => event.runId === run.id && event.event === "release.prepared");
  const releaseReport = (prepared?.metadata as { releaseReport?: import("@agentos/shared").ReleaseReport } | undefined)?.releaseReport;
  if (!releaseReport) {
    return reply.code(409).send({ error: "Run release review before creating a PR." });
  }
  try {
    const prUrl = createGitHubPullRequest({
      title: `[AgentOS] ${mission.title}`,
      body: buildPullRequestBody(mission, releaseReport),
      draft: true
    });
    updateMission(mission.id, {
      metadata: { ...(mission.metadata ?? {}), githubPrUrl: prUrl, releaseReport }
    });
    addAudit("release.pr_created", "release-manager", `Draft PR prepared for ${mission.title}.`, mission.id, run.id);
    return { ok: true, prUrl, mission: getMission(mission.id), run };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "PR creation failed.";
    return reply.code(502).send({ error: message });
  }
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
  guild: loadDiscordGuildState(),
  commands: ["/agentos chat", "/agentos commands", "/agentos status", "/agentos tasks", "/agentos tokens"]
}));

app.post("/discord/interactions", async (request, reply) => {
  const rawBody = (request as { rawBody?: string }).rawBody ?? "";
  if (!verifyInteractionRequest(request.headers, rawBody)) {
    request.log.warn("Discord interaction signature verification failed.");
    return reply.code(401).send({ error: "Invalid request signature." });
  }
  try {
    const payload = JSON.parse(rawBody) as DiscordInteraction;
    const response = await dispatchDiscordInteraction(payload, "http");
    if (response === undefined) {
      return reply.code(204).send();
    }
    return reply.send(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord interaction failed.";
    request.log.error({ err: error }, "Discord interaction handler error.");
    return reply.send({
      type: 4,
      data: {
        embeds: [
          {
            title: "AgentOS error",
            description: message,
            color: 0xff3b5c
          }
        ],
        flags: 64
      }
    });
  }
});

app.post("/discord/restructure", { preHandler: requireDiscordAdminApi }, async (_request, reply) => {
  if (!process.env.DISCORD_BOT_TOKEN?.trim() || !process.env.DISCORD_GUILD_ID?.trim()) {
    return reply.code(503).send({ error: "Discord bot restructure is not configured." });
  }
  try {
    const state = await restructureDiscordGuild();
    return { ok: true, state };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord restructure failed.";
    return reply.code(502).send({ error: message });
  }
});

app.post("/discord/bootstrap", { preHandler: requireDiscordAdminApi }, async (_request, reply) => {
  if (!process.env.DISCORD_BOT_TOKEN?.trim() || !process.env.DISCORD_GUILD_ID?.trim()) {
    return reply.code(503).send({ error: "Discord bot bootstrap is not configured." });
  }
  try {
    const state = await bootstrapDiscordGuild();
    return { ok: true, state };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord bootstrap failed.";
    return reply.code(502).send({ error: message });
  }
});

app.post("/discord/sync-commands", { preHandler: requireDiscordAdminApi }, async (_request, reply) => {
  if (!process.env.DISCORD_BOT_TOKEN?.trim() || !process.env.DISCORD_GUILD_ID?.trim()) {
    return reply.code(503).send({ error: "Discord command sync is not configured." });
  }
  try {
    const result = await syncDiscordCommands();
    return { ok: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord command sync failed.";
    return reply.code(502).send({ error: message });
  }
});

app.post("/discord/sync-roles", { preHandler: requireDiscordAdminApi }, async (_request, reply) => {
  if (!process.env.DISCORD_BOT_TOKEN?.trim() || !process.env.DISCORD_GUILD_ID?.trim()) {
    return reply.code(503).send({ error: "Discord role sync is not configured." });
  }
  try {
    const result = await syncDiscordRoles();
    return { ok: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord role sync failed.";
    return reply.code(502).send({ error: message });
  }
});

app.post("/discord/sync-outbox", async () => {
  if (!isDiscordBotEnabled()) {
    return { ok: false, mode: "mock" };
  }
  const approvals = await syncPendingApprovalsToDiscord();
  return { ok: true, approvals };
});

app.post("/discord/post-guides", { preHandler: requireDiscordAdminApi }, async (_request, reply) => {
  if (!process.env.DISCORD_BOT_TOKEN?.trim() || !process.env.DISCORD_GUILD_ID?.trim()) {
    return reply.code(503).send({ error: "Discord bot is not configured." });
  }
  try {
    const result = await postChannelGuides();
    return { ok: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord channel guides failed.";
    return reply.code(502).send({ error: message });
  }
});

app.post("/discord/pulse", async () => {
  if (!isDiscordBotEnabled()) {
    return { ok: false, mode: "mock" };
  }
  const pulse = await postSystemPulse();
  return { ok: pulse.ok, pulse };
});

app.get("/events", { websocket: true }, (connection, request) => {
  if (!requireAuthWebSocket(request)) {
    connection.close(4401, "Authentication required");
    return;
  }
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

function runCursorWikiSync(reason: string) {
  if (!isCursorWikiSyncEnabled() || !isMemoryWikiWriteEnabled()) return;
  try {
    const result = syncCursorSessionsToWiki(repoRoot, { applyCrossLinks: true });
    app.log.info({ reason, ...result }, "Cursor wiki sync completed.");
  } catch (error) {
    app.log.warn({ err: error, reason }, "Cursor wiki sync failed.");
  }
}

try {
  await app.listen({ port, host: "0.0.0.0" });
  if (isCursorWikiSyncEnabled()) {
    runCursorWikiSync("startup");
    setInterval(() => runCursorWikiSync("interval"), cursorWikiSyncIntervalMs());
  }
  if (isDiscordBotEnabled()) {
    if (!interactionPublicKeyConfigured()) {
      app.log.warn(
        "DISCORD_PUBLIC_KEY is missing — slash commands and buttons will fail until it is set in .env and the Interactions Endpoint URL is reachable."
      );
    }
    void syncPendingApprovalsToDiscord().catch((error) => {
      app.log.warn({ err: error }, "Discord approval outbox sync failed on startup.");
    });
    void startDiscordGateway().then((result) => {
      app.log.info({ result }, "Discord gateway for #general chat.");
    });
    void ensureOperatorLaneIndicator().catch((error) => {
      app.log.warn({ err: error }, "Discord operator lane status indicator failed on startup.");
    });
  }
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
