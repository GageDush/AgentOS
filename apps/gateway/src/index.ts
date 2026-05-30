import Fastify from "fastify";

const app = Fastify({ logger: true });
const port = Number(process.env.AGENTOS_GATEWAY_PORT ?? 8790);

app.get("/health", async () => ({
  ok: true,
  service: "AgentOS Gateway",
  mode: "mock",
  timestamp: new Date().toISOString()
}));

app.post("/tools/mock-run", async (request) => ({
  accepted: true,
  mode: "mock",
  request: request.body,
  result: "Tool execution is intentionally stubbed until approval and sandbox rules are finalized."
}));

await app.listen({ port, host: "0.0.0.0" });
