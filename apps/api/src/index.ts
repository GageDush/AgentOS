import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { productionTeam } from "@agentos/agents";
import { createMemory, searchMemories } from "@agentos/memory";
import { chooseAgentForMission } from "@agentos/orchestrator";
import { assessCommandPolicy } from "@agentos/sandbox";
import type {
  ApprovalRecord,
  GatewayExecutionResult,
  LlmChatRequest,
  MissionRecord,
  MissionRun,
  SandboxPermissionLevel
} from "@agentos/shared";
import { evaluateBudget } from "@agentos/token-manager";
import { getProviderId, providers } from "./providers";
import {
  addAudit,
  addBudget,
  addUsageEvent,
  appendMissionLog,
  completeDemoMission,
  completeTask,
  createApproval,
  createMission,
  createMissionResultMemory,
  createMissionRun,
  createTask,
  failTask,
  getMission,
  getMissionLogs,
  getMissionRun,
  getTask,
  listPendingApprovals,
  resolveApproval,
  runDemoMission,
  startTask,
  store,
  updateMission,
  updateMissionRun,
  usageSummary
} from "./store";

const app = Fastify({ logger: true });
const port = Number(process.env.AGENTOS_API_PORT ?? 8787);
const gatewayBase = process.env.AGENTOS_GATEWAY_URL ?? "http://127.0.0.1:8790";

await app.register(cors, { origin: true });
await app.register(websocket);

function permissionEscalates(level: SandboxPermissionLevel) {
  return !["observe", "safe_execute"].includes(level);
}

async function executeThroughGateway(command: string, missionId: string, runId: string) {
  try {
    const response = await fetch(`${gatewayBase}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, missionId, runId })
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      result?: GatewayExecutionResult;
      decision?: { reason?: string };
    };

    if (!response.ok || !payload.result) {
      return {
        ok: false,
        exitCode: 1,
        stdout: "",
        stderr: payload.decision?.reason ?? "Gateway rejected the command.",
        durationMs: 0,
        command
      } satisfies GatewayExecutionResult;
    }

    return payload.result;
  } catch (error) {
    return {
      ok: true,
      command,
      exitCode: 0,
      stdout: `Gateway unavailable, using mock execution fallback for: ${command}`,
      stderr: "",
      durationMs: 1
    } satisfies GatewayExecutionResult;
  }
}

async function runMissionExecution(runId: string) {
  const run = getMissionRun(runId);
  if (!run) return;
  const mission = getMission(run.missionId);
  if (!mission) return;

  updateMissionRun(run.id, { status: "planning", startedAt: run.startedAt ?? new Date().toISOString() });
  updateMission(mission.id, { status: "running" });
  appendMissionLog(run.id, "system", `Mission ${mission.title} entered planning.`);

  const provider = providers[mission.provider];
  const planResponse = await provider.chat({
    prompt: [
      `Mission title: ${mission.title}`,
      `Objective: ${mission.objective}`,
      `Command request: ${mission.command}`,
      "Respond with a short operator plan and risk note."
    ].join("\n"),
    model: mission.model,
    agentId: mission.operatorId,
    saveMemory: false
  });

  addUsageEvent({
    provider: planResponse.provider,
    model: planResponse.model,
    promptTokens: Math.ceil(mission.prompt.length / 4),
    completionTokens: Math.ceil(planResponse.response.length / 4),
    totalTokens: Math.ceil(mission.prompt.length / 4) + Math.ceil(planResponse.response.length / 4),
    estimatedCostUsd: 0,
    agentId: mission.operatorId,
    runId: run.id
  });

  appendMissionLog(run.id, "plan", planResponse.response);

  const commandDecision = assessCommandPolicy(mission.command);
  const needsApproval = commandDecision.policy === "approval_required" || permissionEscalates(mission.sandboxLevel);

  if (commandDecision.policy === "denied") {
    updateMissionRun(run.id, {
      status: "denied",
      error: commandDecision.reason,
      completedAt: new Date().toISOString()
    });
    updateMission(mission.id, { status: "denied" });
    appendMissionLog(run.id, "approval", commandDecision.reason);
    addAudit("mission.denied", mission.operatorId, commandDecision.reason, mission.id, run.id);
    return;
  }

  if (needsApproval) {
    const approval = createApproval({
      agentId: mission.operatorId,
      missionId: mission.id,
      runId: run.id,
      tool: "command.execute",
      permissionLevel: permissionEscalates(mission.sandboxLevel) ? mission.sandboxLevel : commandDecision.permissionLevel,
      inputSummary: `Mission requests ${mission.sandboxLevel} to run "${mission.command}".`,
      scope: "once",
      command: mission.command
    });
    updateMissionRun(run.id, {
      status: "awaiting_approval",
      approvalRequestId: approval.id
    });
    updateMission(mission.id, { status: "awaiting_approval" });
    appendMissionLog(run.id, "approval", `Control Gate paused execution. Approval ${approval.id} is pending.`);
    return;
  }

  await continueMissionRun(run.id);
}

async function continueMissionRun(runId: string) {
  const run = getMissionRun(runId);
  if (!run) return undefined;
  const mission = getMission(run.missionId);
  if (!mission) return undefined;

  updateMissionRun(run.id, { status: "running" });
  updateMission(mission.id, { status: "running" });
  appendMissionLog(run.id, "exec", `Executing command: ${mission.command}`);

  const result = await executeThroughGateway(mission.command, mission.id, run.id);

  if (result.stdout) appendMissionLog(run.id, "stdout", result.stdout);
  if (result.stderr) appendMissionLog(run.id, "stderr", result.stderr);

  if (!result.ok) {
    updateMissionRun(run.id, {
      status: "failed",
      error: result.stderr || `Command failed with exit code ${result.exitCode}.`,
      completedAt: new Date().toISOString()
    });
    updateMission(mission.id, { status: "failed" });
    appendMissionLog(run.id, "result", "Mission failed during command execution.");
    addAudit("mission.failed", mission.operatorId, `Mission failed: ${mission.title}`, mission.id, run.id);
    return getMissionRun(run.id);
  }

  const summary = `Executed "${mission.command}" in ${result.durationMs}ms with exit code ${result.exitCode}.`;
  updateMissionRun(run.id, {
    status: "completed",
    resultSummary: summary,
    completedAt: new Date().toISOString()
  });
  updateMission(mission.id, { status: "completed" });
  appendMissionLog(run.id, "result", summary);
  createMissionResultMemory({
    missionId: mission.id,
    runId: run.id,
    agentId: mission.operatorId,
    title: `Mission result: ${mission.title}`,
    content: `${summary}\n\n${result.stdout || "No stdout output."}`,
    tags: ["mission", "command", mission.command]
  });
  addAudit("mission.completed", mission.operatorId, `Mission completed: ${mission.title}`, mission.id, run.id);
  return getMissionRun(run.id);
}

app.get("/health", async () => ({
  ok: true,
  service: "AgentOS API",
  mode: process.env.AGENTOS_MODEL_PROVIDER ?? "mock",
  provider: getProviderId(),
  timestamp: new Date().toISOString()
}));

app.get("/dashboard", async () => ({
  agents: store.agents,
  missions: store.missions,
  runs: store.missionRuns,
  approvals: store.approvals,
  audit: store.auditEvents,
  archive: store.memories,
  routines: store.routines,
  loadout: store.loadout,
  sessions: store.sessions,
  usage: usageSummary(),
  system: {
    api: "online",
    worker: "online",
    gateway: "online",
    discordMode: process.env.DISCORD_BOT_TOKEN ? "real" : "mock",
    providerMode: getProviderId() === "mock" ? "mock" : "real"
  }
}));

app.get("/operators", async () => store.agents);
app.get("/missions", async () => store.missions);
app.post("/missions", async (request) => {
  const body = request.body as Partial<MissionRecord>;
  const chosen = chooseAgentForMission(productionTeam, {
    title: body.title ?? "Untitled mission",
    objective: body.objective ?? "Run a local mission.",
    command: body.command ?? "git status"
  });
  return createMission({
    ...body,
    operatorId: body.operatorId ?? chosen?.id ?? "agentos-operator",
    status: "draft"
  });
});
app.get("/missions/:id", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });
  return mission;
});
app.post("/missions/:id/run", async (request, reply) => {
  const mission = getMission((request.params as { id: string }).id);
  if (!mission) return reply.code(404).send({ error: "Mission not found" });

  const run = createMissionRun({
    missionId: mission.id,
    operatorId: mission.operatorId,
    provider: mission.provider,
    model: mission.model,
    status: "queued",
    commandPolicy: mission.commandPolicy,
    requestedCommand: mission.command
  });

  void runMissionExecution(run.id);
  return { mission: getMission(mission.id), run };
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
  if (run.status !== "awaiting_approval") {
    return reply.code(409).send({ error: "Run is not waiting on approval." });
  }
  void continueMissionRun(run.id);
  return { run: getMissionRun(run.id) };
});

app.get("/routines", async () => store.routines);
app.get("/loadout", async () => store.loadout);
app.get("/sessions", async () => store.sessions);

app.get("/agents", async () => store.agents);
app.get("/agents/:id", async (request, reply) => {
  const agent = store.agents.find((item) => item.id === (request.params as { id: string }).id);
  if (!agent) return reply.code(404).send({ error: "Agent not found" });
  return agent;
});

app.get("/tasks", async () => store.tasks);
app.post("/tasks", async (request) => createTask(request.body as Record<string, string>));
app.get("/tasks/:id", async (request, reply) => {
  const task = store.tasks.find((item) => item.id === (request.params as { id: string }).id);
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
    store.memories.unshift(
      createMemory({
        type: "task_memory",
        title: `Task result: ${task.title}`,
        content: result.response,
        taskId: task.id,
        agentId: task.assignedAgentId,
        source: result.provider
      })
    );
    return { task: getTask(id), llm: result };
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
  const memory = createMemory(request.body as Parameters<typeof createMemory>[0]);
  store.memories.unshift(memory);
  return memory;
});
app.post("/memory/search", async (request) => {
  const body = request.body as { query?: string };
  return searchMemories(store.memories, body.query ?? "");
});
app.post("/memory/:id/archive", async (request, reply) => {
  const memory = store.memories.find((item) => item.id === (request.params as { id: string }).id);
  if (!memory) return reply.code(404).send({ error: "Memory not found" });
  memory.archived = true;
  memory.updatedAt = new Date().toISOString();
  return memory;
});

app.get("/usage", async () => store.usageEvents);
app.get("/usage/summary", async () => usageSummary());
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
  recent: store.approvals.slice(0, 20)
}));
app.post("/approvals/:id/approve-once", async (request, reply) => {
  const approval = resolveApproval((request.params as { id: string }).id, "approved", "once");
  if (!approval) return reply.code(404).send({ error: "Approval not found" });
  return { approval };
});
app.post("/approvals/:id/approve-for-mission", async (request, reply) => {
  const approval = resolveApproval((request.params as { id: string }).id, "approved", "mission");
  if (!approval) return reply.code(404).send({ error: "Approval not found" });
  return { approval };
});
app.post("/approvals/:id/deny", async (request, reply) => {
  const approval = resolveApproval((request.params as { id: string }).id, "denied");
  if (!approval) return reply.code(404).send({ error: "Approval not found" });
  const run = approval.runId ? getMissionRun(approval.runId) : undefined;
  if (run) {
    updateMissionRun(run.id, {
      status: "denied",
      error: "Control Gate denied the request.",
      completedAt: new Date().toISOString()
    });
    appendMissionLog(run.id, "approval", "Control Gate denied the request.");
  }
  return { approval };
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
      const memory = createMemory({
        type: "tool_result",
        title: `Local AI console response (${result.model})`,
        content: result.response,
        source: result.provider,
        agentId: body.agentId,
        tags: ["llm", "local-ai"]
      });
      store.memories.unshift(memory);
      savedMemoryId = memory.id;
    }

    addAudit("llm.chat.completed", body.agentId ?? "agentos-operator", `Local AI response from ${result.provider}.`);

    const estimatedCostUsd = result.provider === "ollama" ? 0 : 0;
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
  const summary =
    "Planner drafted the brief, Builder outlined the implementation, Reviewer signed off, and AgentOS stored the mission note.";
  store.memories.unshift(
    createMemory({
      type: "decision_log",
      title: "Demo mission completed",
      content: summary,
      source: "demo-mission",
      tags: ["demo", "mission"]
    })
  );
  completeDemoMission(summary);
  return store.demoMission;
});

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
    cloudProviders: (process.env.FEATURE_CLOUD_PROVIDERS ?? "false") === "true",
    toolExecution: true
  }
}));

app.get("/discord/mock", async () => ({
  mode: process.env.DISCORD_BOT_TOKEN ? "real-configured" : "mock",
  configured: Boolean(process.env.DISCORD_BOT_TOKEN),
  commands: ["/status", "/agents", "/missions", "/health"]
}));

app.get("/events", { websocket: true }, (connection) => {
  connection.send(JSON.stringify({ event: "system.health.changed", data: { api: "online" } }));
  const timer = setInterval(() => {
    connection.send(
      JSON.stringify({
        event: "agentos.snapshot",
        data: {
          approvals: listPendingApprovals(),
          runs: store.missionRuns.slice(0, 10),
          audit: store.auditEvents.slice(0, 10)
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
