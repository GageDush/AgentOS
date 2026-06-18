import { afterEach, describe, expect, it } from "vitest";
import { parseCorsOrigins, resolveCorsOrigin } from "./cors-policy";

describe("cors-policy", () => {
  const prev = process.env.AGENTOS_CORS_ORIGINS;

  afterEach(() => {
    if (prev === undefined) delete process.env.AGENTOS_CORS_ORIGINS;
    else process.env.AGENTOS_CORS_ORIGINS = prev;
  });

  it("returns null when env unset (allow all via fastify callback)", () => {
    delete process.env.AGENTOS_CORS_ORIGINS;
    expect(parseCorsOrigins()).toBeNull();
  });

  it("parses comma-separated origins", () => {
    process.env.AGENTOS_CORS_ORIGINS = "https://flous.dev, http://localhost:3000";
    expect(parseCorsOrigins()).toEqual(["https://flous.dev", "http://localhost:3000"]);
  });

  it("resolveCorsOrigin allows listed origins only", () => {
    process.env.AGENTOS_CORS_ORIGINS = "https://flous.dev";
    const results: boolean[] = [];
    resolveCorsOrigin("https://flous.dev", (_err, allow) => results.push(allow));
    resolveCorsOrigin("https://evil.example", (_err, allow) => results.push(allow));
    expect(results).toEqual([true, false]);
  });
});
