import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { createMemory, searchMemories } from "@agentos/memory";
import { evaluateBudget } from "@agentos/token-manager";
import type { LlmChatRequest } from "@agentos/shared";
import { getProviderId, providers } from "./providers";
import {
  addAudit,
  addBudget,
  addUsageEvent,
  completeDemoMission,
  completeTask,
  createTask,
  failTask,
  getTask,
  resolveApproval,
  runDemoMission,
  startTask,
  store,
  usageSummary
} from "./store";

const app = Fastify({ logger: true });
const port = Number(process.env.AGENTOS_API_PORT ?? 8787);

await app.register(cors, { origin: true });
await app.register(websocket);

app.get("/health", async () => ({
  ok: true,
  service: "AgentOS API",
  mode: process.env.AGENTOS_MODEL_PROVIDER ?? "mock",
  provider: getProviderId(),
  timestamp: new Date().toISOString()
}));

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

app.get("/runs", async () => store.runs);
app.get("/runs/:id", async (request, reply) => {
  const run = store.runs.find((item) => item.id === (request.params as { id: string }).id);
  if (!run) return reply.code(404).send({ error: "Run not found" });
  return run;
});

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
app.post("/memory/:id/attach-agent", async (request, reply) => {
  const memory = store.memories.find((item) => item.id === (request.params as { id: string }).id);
  if (!memory) return reply.code(404).send({ error: "Memory not found" });
  memory.agentId = (request.body as { agentId?: string }).agentId;
  memory.updatedAt = new Date().toISOString();
  return memory;
});
app.post("/memory/:id/attach-task", async (request, reply) => {
  const memory = store.memories.find((item) => item.id === (request.params as { id: string }).id);
  if (!memory) return reply.code(404).send({ error: "Memory not found" });
  memory.taskId = (request.body as { taskId?: string }).taskId;
  memory.updatedAt = new Date().toISOString();
  return memory;
});

app.get("/usage", async () => store.usageEvents);
app.get("/usage/summary", async () => usageSummary());
app.get("/usage/budgets", async () => store.budgets);
app.post("/usage/budgets", async (request) => addBudget(request.body as Parameters<typeof addBudget>[0]));
app.patch("/usage/budgets/:id", async (request, reply) => {
  const budget = store.budgets.find((item) => item.id === (request.params as { id: string }).id);
  if (!budget) return reply.code(404).send({ error: "Budget not found" });
  Object.assign(budget, request.body);
  return budget;
});
app.get("/usage/alerts", async () => {
  const summary = usageSummary();
  const dailyWarning = summary.dailyLimit > 0 && summary.dailySpend >= summary.dailyLimit * 0.8;
  return dailyWarning ? [{ id: "daily-warning", level: "warning", message: "Daily budget threshold reached." }] : [];
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
app.post("/approvals/:id/approve", async (request, reply) => {
  const approval = resolveApproval((request.params as { id: string }).id, "approved");
  if (!approval) return reply.code(404).send({ error: "Approval not found" });
  return approval;
});
app.post("/approvals/:id/deny", async (request, reply) => {
  const approval = resolveApproval((request.params as { id: string }).id, "denied");
  if (!approval) return reply.code(404).send({ error: "Approval not found" });
  return approval;
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
    toolExecution: (process.env.FEATURE_TOOL_EXECUTION ?? "false") === "true"
  }
}));

app.get("/discord/mock", async () => ({
  mode: process.env.DISCORD_BOT_TOKEN ? "real-configured" : "mock",
  configured: Boolean(process.env.DISCORD_BOT_TOKEN),
  commands: ["/status", "/agents", "/tasks", "/health"]
}));
app.get("/discord/status", async () => ({
  configured: Boolean(process.env.DISCORD_BOT_TOKEN),
  mode: process.env.DISCORD_BOT_TOKEN ? "real-configured" : "mock",
  commands: ["/status", "/agents", "/tasks", "/health"],
  note: "Read-only Discord integration is scaffolded but intentionally not executing tasks yet."
}));

app.get("/events", { websocket: true }, (connection) => {
  connection.send(JSON.stringify({ event: "system.health.changed", data: { api: "online" } }));
  const timer = setInterval(() => {
    connection.send(JSON.stringify({ event: "agent.status.changed", data: store.agents }));
  }, 5000);
  connection.on("close", () => clearInterval(timer));
});

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
