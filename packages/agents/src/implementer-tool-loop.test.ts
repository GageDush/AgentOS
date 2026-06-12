import { describe, expect, it } from "vitest";
import type { ToolRequest, ToolResult } from "@agentos/shared";
import { runImplementerToolLoop } from "./implementer-tool-loop";
import { ToolLoopBudget } from "./tool-loop";

describe("runImplementerToolLoop", () => {
  it("runs bounded tools against scoped files", async () => {
    const calls: ToolRequest[] = [];
    const executeTool = async (request: ToolRequest): Promise<ToolResult> => {
      calls.push(request);
      if (request.id === "read") return { id: "read", ok: true, stdout: `content:${request.path}` };
      if (request.id === "grep") return { id: "grep", ok: true, stdout: "export function foo" };
      if (request.id === "git.status") return { id: "git.status", ok: true, stdout: " M file.ts" };
      if (request.id === "git.diff") return { id: "git.diff", ok: true, stdout: "diff chunk" };
      return { id: request.id, ok: false, error: "unknown" };
    };

    const budget = new ToolLoopBudget({ maxIterations: 8, maxMinutes: 5 });
    const result = await runImplementerToolLoop(["src/a.ts", "src/b.ts"], executeTool, { budget });

    expect(result.toolsRun.some((t) => t.startsWith("read:"))).toBe(true);
    expect(result.toolsRun).toContain("git.status");
    expect(result.excerpts.join("\n")).toContain("content:src/a.ts");
    expect(calls.length).toBeGreaterThan(2);
    expect(result.budget.iterations).toBeGreaterThan(0);
  });

  it("stops when budget exhausted", async () => {
    const budget = new ToolLoopBudget({ maxIterations: 1, maxMinutes: 5 });
    const result = await runImplementerToolLoop(
      ["a.ts", "b.ts", "c.ts"],
      async (req) => ({ id: req.id, ok: true, stdout: "x" }),
      { budget }
    );
    expect(result.budget.iterations).toBeLessThanOrEqual(1);
    expect(result.toolsRun.length).toBeLessThanOrEqual(1);
  });
});
