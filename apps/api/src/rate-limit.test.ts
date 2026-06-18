import { describe, expect, it, beforeEach } from "vitest";
import Fastify from "fastify";
import { installApiAuthGuard } from "./auth-guard";
import { mutateRateLimitPreHandler, resetMutateRateLimitBuckets } from "./rate-limit";

describe("mutate rate limit", () => {
  beforeEach(() => {
    resetMutateRateLimitBuckets();
    process.env.AGENTOS_MUTATE_RATE_LIMIT_MAX = "2";
    process.env.AGENTOS_MUTATE_RATE_LIMIT_WINDOW_MS = "60000";
    process.env.AGENTOS_API_REQUIRE_AUTH = "false";
  });

  it("returns 429 after exceeding mutate budget", async () => {
    const app = Fastify();
    app.addHook("preHandler", mutateRateLimitPreHandler);
    app.post("/missions", async () => ({ ok: true }));
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/missions", payload: {} })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/missions", payload: {} })).statusCode).toBe(200);
    const limited = await app.inject({ method: "POST", url: "/missions", payload: {} });
    expect(limited.statusCode).toBe(429);
    await app.close();
  });

  it("does not limit GET requests", async () => {
    const app = Fastify();
    installApiAuthGuard(app);
    app.addHook("preHandler", mutateRateLimitPreHandler);
    app.get("/health", async () => ({ ok: true }));
    await app.ready();

    for (let i = 0; i < 5; i += 1) {
      expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    }
    await app.close();
  });
});
