import type { AgentProfile, AgentTask } from "@agentos/shared";

export const chooseAgentForTask = (agents: AgentProfile[], task: AgentTask) => {
  const lower = `${task.title} ${task.description}`.toLowerCase();
  if (lower.includes("test") || lower.includes("qa")) return agents.find((agent) => agent.id === "qa-agent");
  if (lower.includes("security") || lower.includes("approval")) return agents.find((agent) => agent.id === "security-agent");
  if (lower.includes("docs")) return agents.find((agent) => agent.id === "docs-agent");
  return agents.find((agent) => agent.id === "agentos-operator") ?? agents[0];
};
