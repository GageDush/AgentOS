import { describe, expect, it, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import { installApiAuthGuard, isApiAuthRequired, isPublicApiRoute, requireAuthWebSocket } from "./auth-guard";
import { buildSessionCookie, createSessionToken, type OperatorSession } from "./session";

const session: OperatorSession = {
  provider: "discord",
  discordUserId: "123",
  username: "tester",
  operatorId: "operator-test",
  issuedAt: new Date().toISOString()
};

describe("auth-guard", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-for-auth-guard";
    process.env.AGENTOS_API_REQUIRE_AUTH = "true";
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("isApiAuthRequired respects explicit env", () => {
    process.env.AGENTOS_API_REQUIRE_AUTH = "false";
    expect(isApiAuthRequired()).toBe(false);
    process.env.AGENTOS_API_REQUIRE_AUTH = "true";
    expect(isApiAuthRequired()).toBe(true);
  });

  it("classifies public routes", () => {
    expect(isPublicApiRoute("GET", "/health")).toBe(true);
    expect(isPublicApiRoute("GET", "/auth/me")).toBe(true);
    expect(isPublicApiRoute("POST", "/discord/interactions")).toBe(true);
    expect(isPublicApiRoute("POST", "/missions")).toBe(false);
    expect(isPublicApiRoute("POST", "/worker/process")).toBe(false);
  });

  it("blocks unauthenticated mutations when auth required", async () => {
    const app = Fastify();
    installApiAuthGuard(app);
    app.post("/missions", async () => ({ ok: true }));
    await app.ready();

    const response = await app.inject({ method: "POST", url: "/missions", payload: {} });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("allows authenticated session cookie", async () => {
    const app = Fastify();
    installApiAuthGuard(app);
    app.post("/missions", async () => ({ ok: true }));
    await app.ready();

    const token = createSessionToken(session);
    const response = await app.inject({
      method: "POST",
      url: "/missions",
      headers: { cookie: buildSessionCookie(token) },
      payload: {}
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("websocket auth helper rejects missing session when required", () => {
    expect(requireAuthWebSocket({ headers: {} })).toBe(false);
    const token = createSessionToken(session);
    expect(requireAuthWebSocket({ headers: { cookie: buildSessionCookie(token) } })).toBe(true);
  });
});
