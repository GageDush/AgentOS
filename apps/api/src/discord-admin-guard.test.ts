import { describe, expect, it, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import { isDiscordAdminApiEnabled, requireDiscordAdminApi } from "./discord-admin-guard";
import { buildSessionCookie, createSessionToken, type OperatorSession } from "./session";

const session: OperatorSession = {
  provider: "discord",
  discordUserId: "1",
  username: "admin",
  operatorId: "operator-admin",
  issuedAt: new Date().toISOString()
};

describe("discord-admin-guard", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-discord-admin";
    process.env.FEATURE_DISCORD_ADMIN_ROUTES = "false";
    process.env.AGENTOS_API_REQUIRE_AUTH = "true";
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("isDiscordAdminApiEnabled respects env", () => {
    expect(isDiscordAdminApiEnabled()).toBe(false);
    process.env.FEATURE_DISCORD_ADMIN_ROUTES = "true";
    expect(isDiscordAdminApiEnabled()).toBe(true);
  });

  it("blocks bootstrap when feature flag is off", async () => {
    const app = Fastify();
    app.post("/discord/bootstrap", { preHandler: requireDiscordAdminApi }, async () => ({ ok: true }));
    await app.ready();

    const token = createSessionToken(session);
    const response = await app.inject({
      method: "POST",
      url: "/discord/bootstrap",
      headers: { cookie: buildSessionCookie(token) }
    });
    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("allows bootstrap when flag on and session present", async () => {
    process.env.FEATURE_DISCORD_ADMIN_ROUTES = "true";
    const app = Fastify();
    app.post("/discord/bootstrap", { preHandler: requireDiscordAdminApi }, async () => ({ ok: true }));
    await app.ready();

    const token = createSessionToken(session);
    const response = await app.inject({
      method: "POST",
      url: "/discord/bootstrap",
      headers: { cookie: buildSessionCookie(token) }
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
