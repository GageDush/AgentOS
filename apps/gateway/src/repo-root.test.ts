import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGatewayRepoRoot } from "./repo-root";

describe("resolveGatewayRepoRoot", () => {
  it("finds monorepo root from apps/gateway", () => {
    const root = resolveGatewayRepoRoot(join(process.cwd()));
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name?: string };
    expect(pkg.name).toBe("agentos");
  });
});
