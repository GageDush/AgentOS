import { afterEach, describe, expect, it } from "vitest";
import { buildSessionCookie, sessionMaxAgeSeconds } from "./session";

describe("session cookies", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to a one-year max age", () => {
    delete process.env.AGENTOS_SESSION_MAX_AGE_SECONDS;
    expect(sessionMaxAgeSeconds()).toBe(60 * 60 * 24 * 365);
  });

  it("uses cross-site cookie attributes when a shared domain is configured", () => {
    process.env.AGENTOS_COOKIE_DOMAIN = ".flous.dev";
    process.env.AGENTOS_API_BASE_URL = "https://api.flous.dev";
    const cookie = buildSessionCookie("token-value", 3600);
    expect(cookie).toContain("Domain=.flous.dev");
    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Max-Age=3600");
  });
});
