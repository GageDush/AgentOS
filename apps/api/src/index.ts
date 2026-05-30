import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { createMemory, searchMemories } from "@agentos/memory";
import { evaluateBudget } from "@agentos/token-manager";
import { addBudget, addUsageEvent, createTask, resolveApproval, store, usageSummary } from "./store";

const app = Fastify({ logger: true });
const port = Number(process.env.AGENTOS_API_PORT ?? 8787);

await app.register(cors, { origin: true });
await app.register(websocket);

app.get("/health", async () => ({
  ok: true,
  service: "AgentOS API",
  mode: process.env.AGENTOS_MODEL_PROVIDER ?? "mock",
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
app.get("/system", async () => ({
  api: "online",
  worker: "online",
  gateway: "online",
  discordMode: process.env.DISCORD_BOT_TOKEN ? "real" : "mock",
  providerMode: process.env.AGENTOS_MODEL_PROVIDER === "mock" ? "mock" : "real"
}));

app.get("/discord/mock", async () => ({
  mode: "mock",
  commands: ["/status", "/agents", "/tasks", "/task-create", "/assign", "/approve", "/deny", "/logs", "/tokens", "/memory-search"]
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
