import type { ToolId, ToolRequest, ToolResult } from "@agentos/shared";
import type { ToolExecutor } from "./implementer-tool-loop";
import { ToolLoopBudget } from "./tool-loop";

const TOOL_IDS: ToolId[] = [
  "read",
  "grep",
  "glob.list",
  "shell",
  "git.status",
  "git.diff",
  "task.spawn",
  "memory.search",
  "patch.apply"
];

export function isLlmToolLoopEnabled() {
  const raw = process.env.FEATURE_LLM_TOOL_LOOP?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function normalizeToolId(raw: unknown): ToolId | undefined {
  if (typeof raw !== "string") return undefined;
  const id = raw.trim() as ToolId;
  return TOOL_IDS.includes(id) ? id : undefined;
}

/** Parse tool calls from fenced JSON or single-line tool JSON in LLM output. */
export function parseToolCallsFromLlm(text: string): ToolRequest[] {
  const calls: ToolRequest[] = [];
  const seen = new Set<string>();

  const push = (candidate: Record<string, unknown>) => {
    const id = normalizeToolId(candidate.id ?? candidate.tool);
    if (!id) return;
    const request: ToolRequest = {
      id,
      path: typeof candidate.path === "string" ? candidate.path : undefined,
      pattern: typeof candidate.pattern === "string" ? candidate.pattern : undefined,
      glob: typeof candidate.glob === "string" ? candidate.glob : undefined,
      command: typeof candidate.command === "string" ? candidate.command : undefined
    };
    const key = JSON.stringify(request);
    if (seen.has(key)) return;
    seen.add(key);
    calls.push(request);
  };

  for (const match of text.matchAll(/```(?:json|tool)?\s*([\s\S]*?)```/gi)) {
    try {
      const parsed = JSON.parse(match[1]!.trim()) as unknown;
      if (Array.isArray(parsed)) parsed.forEach((item) => push(item as Record<string, unknown>));
      else if (parsed && typeof parsed === "object") push(parsed as Record<string, unknown>);
    } catch {
      /* ignore malformed blocks */
    }
  }

  for (const match of text.matchAll(/\{[^{}]*"(?:id|tool)"\s*:\s*"[^"]+"/g)) {
    try {
      push(JSON.parse(match[0]) as Record<string, unknown>);
    } catch {
      /* ignore */
    }
  }

  return calls;
}

export type LlmToolLoopResult = {
  toolsRun: string[];
  excerpts: string[];
  budget: ReturnType<ToolLoopBudget["snapshot"]>;
  rounds: number;
  finalText?: string;
};

/**
 * Iterative LLM → tool-call → result loop (P1).
 * `llmRound` receives prior tool output excerpts and returns the next model message.
 */
export async function runLlmToolLoop(
  llmRound: (priorExcerpts: string[]) => Promise<string>,
  executeTool: ToolExecutor,
  options?: { budget?: ToolLoopBudget; maxRounds?: number; missionId?: string; runId?: string }
): Promise<LlmToolLoopResult> {
  const budget = options?.budget ?? new ToolLoopBudget();
  const toolsRun: string[] = [];
  const excerpts: string[] = [];
  const maxRounds = options?.maxRounds ?? 4;
  let rounds = 0;
  let finalText: string | undefined;

  while (budget.canContinue() && rounds < maxRounds) {
    rounds += 1;
    const text = await llmRound(excerpts);
    finalText = text;
    const calls = parseToolCallsFromLlm(text);
    if (!calls.length) break;

    for (const call of calls) {
      if (!budget.canContinue()) break;
      budget.recordIteration();
      const result = await executeTool({
        ...call,
        missionId: options?.missionId,
        runId: options?.runId
      });
      const label = `${call.id}:${call.path ?? call.pattern ?? call.command ?? call.glob ?? ""}`;
      toolsRun.push(label);
      if (result.ok && result.stdout) excerpts.push(`${label}\n${result.stdout.slice(0, 500)}`);
      else if (result.error) excerpts.push(`${label}\nerror: ${result.error}`);
    }
  }

  return { toolsRun, excerpts, budget: budget.snapshot(), rounds, finalText };
}
