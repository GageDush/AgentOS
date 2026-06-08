import type { AgentProfile, MissionRecord } from "@agentos/shared";

export const chooseAgentForMission = (agents: AgentProfile[], mission: Pick<MissionRecord, "title" | "objective" | "command">) => {
  const lower = `${mission.title} ${mission.objective} ${mission.command}`.toLowerCase();
  if (lower.includes("test") || lower.includes("lint") || lower.includes("typecheck")) {
    return agents.find((agent) => agent.id === "qa-agent");
  }
  if (lower.includes("security") || lower.includes("approval") || lower.includes(".env")) {
    return agents.find((agent) => agent.id === "security-agent");
  }
  if (lower.includes("docs") || lower.includes("readme")) {
    return agents.find((agent) => agent.id === "docs-agent");
  }
  if (lower.includes("refactor") || lower.includes("build") || lower.includes("implement")) {
    return agents.find((agent) => agent.id === "builder-agent");
  }
  return agents.find((agent) => agent.id === "agentos-operator") ?? agents[0];
};
