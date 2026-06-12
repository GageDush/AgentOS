import type { RouteTaskType, TaskEnvelope } from "@agentos/shared";

export type ResearchRouteDecision = {
  recommendedTaskType: RouteTaskType;
  primaryAgentId: string;
  supportingAgentIds: string[];
  askHuman: boolean;
  reason: string;
};

const VAGUE_MARKERS = ["fix it", "make it work", "something is broken", "not working", "help", "idk", "???"];

export function isVagueResearchPrompt(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 24) return true;
  return VAGUE_MARKERS.some((marker) => text.includes(marker));
}

export function refineResearchRoute(text: string, envelope: Pick<TaskEnvelope, "taskType" | "userGoal">): ResearchRouteDecision {
  const vague = isVagueResearchPrompt(`${text}\n${envelope.userGoal}`);
  const wantsRepoFacts = /how does|where is|architecture|structure|overview|map/i.test(text);
  const wantsCode = /implement|fix|add|refactor|bug/i.test(text);

  if (wantsCode && !vague) {
    return {
      recommendedTaskType: "code_change",
      primaryAgentId: "code-implementer",
      supportingAgentIds: ["issue-intake-researcher", "context-minimizer", "systems-synthesizer"],
      askHuman: false,
      reason: "Research prompt implies actionable code work; reclassified to code_change."
    };
  }

  if (wantsRepoFacts) {
    return {
      recommendedTaskType: "repo_analysis",
      primaryAgentId: "repo-cartographer",
      supportingAgentIds: ["issue-intake-researcher", "systems-synthesizer"],
      askHuman: false,
      reason: "Research prompt needs repo facts; cartographer leads."
    };
  }

  return {
    recommendedTaskType: "research",
    primaryAgentId: "issue-intake-researcher",
    supportingAgentIds: vague ? ["admin-agent", "systems-synthesizer"] : ["repo-cartographer", "systems-synthesizer"],
    askHuman: vague,
    reason: vague
      ? "Vague research intake; issue-intake-researcher clarifies before planning."
      : "Standard research flow via intake then optional cartographer."
  };
}
