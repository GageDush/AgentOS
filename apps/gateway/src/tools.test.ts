import { describe, expect, it, vi } from "vitest";
import { invokeGatewayTool, resolveRepoPath } from "./tools";
import { join } from "node:path";

describe("gateway tools", () => {
  const root = join(process.cwd());

  it("resolves paths inside repo", () => {
    expect(resolveRepoPath(root, "package.json")).toContain("package.json");
  });

  it("rejects path traversal", () => {
    expect(() => resolveRepoPath(root, "../../../etc/passwd")).toThrow(/escapes/);
  });

  it("invokes git.status via shell delegate", async () => {
    const executeShell = vi.fn(async () => ({
      ok: true,
      stdout: " M README.md",
      stderr: "",
      exitCode: 0
    }));
    const result = await invokeGatewayTool(root, { id: "git.status" }, executeShell);
    expect(result.ok).toBe(true);
    expect(result.stdout).toContain("README");
    expect(executeShell).toHaveBeenCalledWith("git status --short");
  });
});
