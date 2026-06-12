import { describe, expect, it } from "vitest";
import { resolveGatewayRepoRoot } from "./repo-root";
import { join } from "node:path";

describe("resolveGatewayRepoRoot", () => {
  it("finds monorepo root from apps/gateway", () => {
    const root = resolveGatewayRepoRoot(join(process.cwd()));
    expect(root.replace(/\\/g, "/")).toMatch(/AgenOS$/i);
  });
});
