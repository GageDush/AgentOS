import type { ToolRequest, ToolResult } from "@agentos/shared";
import { ToolLoopBudget } from "./tool-loop";

export type ToolExecutor = (request: ToolRequest) => Promise<ToolResult>;

export type ImplementerToolLoopResult = {
  toolsRun: string[];
  excerpts: string[];
  budget: ReturnType<ToolLoopBudget["snapshot"]>;
};

/**
 * Bounded read/grep/git probe loop for gateway implementer dispatch (P1).
 */
export async function runImplementerToolLoop(
  scopedFiles: string[],
  executeTool: ToolExecutor,
  options?: { budget?: ToolLoopBudget; missionId?: string; runId?: string }
): Promise<ImplementerToolLoopResult> {
  const budget = options?.budget ?? new ToolLoopBudget();
  const toolsRun: string[] = [];
  const excerpts: string[] = [];
  const base = { missionId: options?.missionId, runId: options?.runId };

  for (const file of scopedFiles.slice(0, 3)) {
    if (!budget.canContinue()) break;
    budget.recordIteration();
    const read = await executeTool({ id: "read", path: file, ...base });
    toolsRun.push(`read:${file}`);
    if (read.ok && read.stdout) excerpts.push(read.stdout.slice(0, 400));
  }

  const primary = scopedFiles[0];
  if (primary && budget.canContinue()) {
    budget.recordIteration();
    const grep = await executeTool({ id: "grep", pattern: "export", path: primary, ...base });
    toolsRun.push(`grep:${primary}`);
    if (grep.ok && grep.stdout) excerpts.push(grep.stdout.slice(0, 200));
  }

  if (budget.canContinue()) {
    budget.recordIteration();
    const status = await executeTool({ id: "git.status", ...base });
    toolsRun.push("git.status");
    if (status.ok && status.stdout) excerpts.push(status.stdout.slice(0, 200));
  }

  if (primary && budget.canContinue()) {
    budget.recordIteration();
    const diff = await executeTool({ id: "git.diff", path: primary, ...base });
    toolsRun.push(`git.diff:${primary}`);
    if (diff.ok && diff.stdout) excerpts.push(diff.stdout.slice(0, 300));
  }

  return { toolsRun, excerpts, budget: budget.snapshot() };
}
