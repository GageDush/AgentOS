import type { AgentReport, ContextPacket, TaskEnvelope } from "@agentos/shared";
import { resolveCanonicalAgentId } from "@agentos/shared";
import { executeAgentStep } from "./executor";
import type { PlannerMode } from "./planner";
import { buildPlannerReport } from "./planner";

export type PlannerSubtask = {
  id: string;
  agent: string;
  summary: string;
  dependsOn?: string[];
};

const SKIP_IN_SUBTASK_LOOP = new Set(["qa-agent", "release-manager", "planner-partitioner", "systems-synthesizer"]);

export function extractPlannerSubtasks(plannerReport: AgentReport): PlannerSubtask[] {
  const finding = plannerReport.findings?.[0] as { subtasks?: PlannerSubtask[] } | undefined;
  return finding?.subtasks?.filter((task) => !SKIP_IN_SUBTASK_LOOP.has(task.agent)) ?? [];
}

export function sortPlannerSubtasks(subtasks: PlannerSubtask[]): PlannerSubtask[] {
  const byId = new Map(subtasks.map((task) => [task.id, task]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: PlannerSubtask[] = [];

  function visit(task: PlannerSubtask) {
    if (visited.has(task.id)) return;
    if (visiting.has(task.id)) return;
    visiting.add(task.id);
    for (const depId of task.dependsOn ?? []) {
      const dep = byId.get(depId);
      if (dep) visit(dep);
    }
    visiting.delete(task.id);
    visited.add(task.id);
    ordered.push(task);
  }

  for (const task of subtasks) visit(task);
  return ordered;
}

export function shouldSkipPrimaryAfterSubtasks(primaryProfileId: string, subtaskReports: AgentReport[]) {
  const canonical = resolveCanonicalAgentId(primaryProfileId);
  return subtaskReports.some((report) => resolveCanonicalAgentId(report.agent) === canonical);
}

export async function executePlannerSubtasks(
  envelope: TaskEnvelope,
  contextPacket: ContextPacket | undefined,
  mode: PlannerMode
): Promise<{ planner: AgentReport; subtaskReports: AgentReport[]; primarySkipped: boolean }> {
  const planner = buildPlannerReport(envelope, mode);
  const subtasks = sortPlannerSubtasks(extractPlannerSubtasks(planner));
  const subtaskReports: AgentReport[] = [];

  for (const subtask of subtasks) {
    const report = await executeAgentStep(subtask.agent, envelope, contextPacket);
    subtaskReports.push({
      ...report,
      summary: `${subtask.summary}: ${report.summary}`
    });
  }

  return { planner, subtaskReports, primarySkipped: false };
}
