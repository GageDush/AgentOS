import type { AgentReport, TaskEnvelope } from "@agentos/shared";

export type PlannerMode = "full" | "lightweight";

export function buildPlannerReport(envelope: TaskEnvelope, mode: PlannerMode): AgentReport {
  const implementerAgent = envelope.taskType === "app_creation" ? "frontend-ui-agent" : "code-implementer";
  const subtasks =
    mode === "full"
      ? [
          { id: "plan-1", agent: implementerAgent, summary: "Primary implementation slice", dependsOn: [] as string[] },
          {
            id: "plan-2",
            agent: "docs-agent",
            summary: "Document the change",
            dependsOn: ["plan-1"]
          },
          { id: "plan-3", agent: "qa-agent", summary: "Verification gate", dependsOn: ["plan-1"] }
        ]
      : [{ id: "plan-lite-1", agent: "code-implementer", summary: "Single scoped implementation step", dependsOn: [] as string[] }];

  return {
    agent: "planner-partitioner",
    status: "complete",
    summary:
      mode === "full"
        ? `Planner partitioned ${envelope.taskType} work into ${subtasks.length} subtasks with acceptance checks.`
        : `Lightweight planner defined one subtask for ${envelope.taskType} (${envelope.complexity}).`,
    commandsRun: [],
    nextActions: subtasks.map((s) => s.agent),
    findings: [{ mode, subtasks, acceptanceCriteria: envelope.acceptanceCriteria.slice(0, 4) }]
  };
}
