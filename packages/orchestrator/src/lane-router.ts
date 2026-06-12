import type { ProviderLane, RouteComplexity, RouteRiskLevel } from "@agentos/shared";

export type LaneRouterInput = {
  text: string;
  complexity: RouteComplexity;
  riskLevel: RouteRiskLevel;
  quotaBlocked?: boolean;
  preferLocal?: boolean;
};

const PREMIUM_HINTS = [
  "architect",
  "security",
  "migration",
  "refactor",
  "multi-package",
  "integration",
  "mcp",
  "production"
];

const LOCAL_OK_HINTS = ["typo", "readme", "docs", "classify", "answer", "status", "lint", "typecheck"];

/**
 * RouteLLM-inspired lane selection: route simple work to cheaper lanes first.
 */
export function inferProviderLaneSmart(input: LaneRouterInput): ProviderLane {
  const text = input.text.toLowerCase();

  if (input.quotaBlocked || text.includes("defer") || text.includes("wait until reset")) {
    return "defer";
  }

  if (text.includes("ollama") || process.env.FEATURE_OLLAMA === "true") {
    if (input.complexity === "trivial" || input.complexity === "simple") {
      return "ollama_local";
    }
  }

  if (LOCAL_OK_HINTS.some((hint) => text.includes(hint)) && (input.riskLevel === "low" || input.riskLevel === "none")) {
    return input.preferLocal === false ? "mock_local" : "ollama_local";
  }

  if (PREMIUM_HINTS.some((hint) => text.includes(hint)) || input.complexity === "complex" || input.complexity === "unknown") {
    return process.env.FEATURE_OLLAMA === "true" ? "ollama_local" : "mock_local";
  }

  if (input.complexity === "moderate") {
    return process.env.FEATURE_OLLAMA === "true" ? "ollama_local" : "mock_local";
  }

  return "mock_local";
}

export function shouldPruneSupportingAgent(agentId: string, primaryAgentId: string, supporting: Set<string>) {
  if (agentId === primaryAgentId) return false;
  if (agentId === "task-classifier" || agentId === "quota-steward") return false;
  if (supporting.size <= 4) return false;
  const pruneCandidates = new Set(["architect-agent", "product-agent", "systems-synthesizer"]);
  if (supporting.size <= 6) return pruneCandidates.has(agentId) && agentId !== "systems-synthesizer";
  return pruneCandidates.has(agentId);
}
