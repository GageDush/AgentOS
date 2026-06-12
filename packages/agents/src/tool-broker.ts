import type { ToolRequest, ToolResult } from "@agentos/shared";
import { randomUUID } from "node:crypto";
import { runImplementerToolLoop } from "./implementer-tool-loop";
import { ToolLoopBudget } from "./tool-loop";

export function isToolExecutionEnabled() {
  const raw = process.env.FEATURE_TOOL_EXECUTION?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export type ToolBrokerOptions = {
  gatewayUrl?: string;
  missionId?: string;
  runId?: string;
};

export async function executeTool(request: ToolRequest, options?: ToolBrokerOptions): Promise<ToolResult> {
  const gatewayUrl = (options?.gatewayUrl ?? process.env.AGENTOS_GATEWAY_URL ?? "http://127.0.0.1:8790").replace(
    /\/$/,
    ""
  );
  const body: ToolRequest = {
    ...request,
    missionId: request.missionId ?? options?.missionId,
    runId: request.runId ?? options?.runId,
    leaseId: request.leaseId ?? randomUUID()
  };

  const response = await fetch(`${gatewayUrl}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      id: body.id,
      ok: false,
      error: `Gateway tool HTTP ${response.status}: ${text.slice(0, 300)}`,
      leaseId: body.leaseId
    };
  }

  return (await response.json()) as ToolResult;
}

export async function probeImplementerContext(
  scopedFiles: string[],
  options?: ToolBrokerOptions
): Promise<{ toolsRun: string[]; excerpts: string[]; budget?: ReturnType<ToolLoopBudget["snapshot"]> }> {
  if (!isToolExecutionEnabled() || scopedFiles.length === 0) {
    return { toolsRun: [], excerpts: [] };
  }

  const budget = new ToolLoopBudget();
  return runImplementerToolLoop(scopedFiles, (request) => executeTool(request, options), {
    budget,
    missionId: options?.missionId,
    runId: options?.runId
  });
}
