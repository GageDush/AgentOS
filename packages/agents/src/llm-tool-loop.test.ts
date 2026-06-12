import { describe, expect, it, vi } from "vitest";
import type { ToolRequest, ToolResult } from "@agentos/shared";
import { parseToolCallsFromLlm, runLlmToolLoop } from "./llm-tool-loop";
import { ToolLoopBudget } from "./tool-loop";

describe("llm-tool-loop", () => {
  it("parses fenced tool JSON", () => {
    const text = 'Plan:\n```json\n{"id":"read","path":"src/index.ts"}\n```';
    expect(parseToolCallsFromLlm(text)).toEqual([{ id: "read", path: "src/index.ts" }]);
  });

  it("runs bounded LLM tool rounds", async () => {
    let round = 0;
    const llmRound = vi.fn(async () => {
      round += 1;
      if (round === 1) return '```json\n{"id":"grep","pattern":"export","path":"src"}\n```';
      return "done without tools";
    });
    const executeTool = vi.fn(async (req: ToolRequest): Promise<ToolResult> => ({
      id: req.id,
      ok: true,
      stdout: "export function x"
    }));

    const budget = new ToolLoopBudget({ maxIterations: 5, maxMinutes: 5 });
    const result = await runLlmToolLoop(llmRound, executeTool, { budget, maxRounds: 3 });

    expect(result.rounds).toBe(2);
    expect(result.toolsRun[0]).toContain("grep");
    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(result.excerpts.join("\n")).toContain("export function x");
  });
});
