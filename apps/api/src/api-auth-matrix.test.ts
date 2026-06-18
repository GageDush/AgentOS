import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");

describe("api-auth-matrix", () => {
  it("documents every Fastify route with a valid auth class", () => {
    const script = join(repoRoot, "scripts/functionalization/check-auth-matrix.mjs");
    const result = spawnSync(process.execPath, [script], { cwd: repoRoot, encoding: "utf8" });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain("Auth matrix check: PASS");
  });
});
