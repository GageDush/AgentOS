import type { RouteComplexity, RouteTaskType } from "@agentos/shared";

export type PlannerScoreInput = {
  complexity: RouteComplexity;
  taskType: RouteTaskType;
  domainSpan: number;
  routeConfidence: number;
  text: string;
};

export type PlannerScoreResult = {
  score: number;
  runFullPlanner: boolean;
  runLightweightPlanner: boolean;
};

/**
 * Scores whether planner-partitioner should run (~95% skip target for trivial work).
 */
export function scorePlannerNeed(input: PlannerScoreInput): PlannerScoreResult {
  if (input.taskType === "answer_only" || input.taskType === "qa") {
    return { score: 0, runFullPlanner: false, runLightweightPlanner: false };
  }

  let score = 0;
  if (input.complexity === "complex") score += 0.35;
  else if (input.complexity === "moderate") score += 0.15;

  score += Math.min(input.domainSpan, 4) * 0.12;

  if (input.taskType === "research" || input.taskType === "app_creation") score += 0.2;
  if (input.routeConfidence < 0.85) score += 0.15;

  const ambiguity = (input.text.match(/\bor\b|\bmaybe\b|\bunclear\b|\?/g) ?? []).length;
  score += Math.min(ambiguity, 3) * 0.05;

  if (input.routeConfidence >= 0.85 && input.complexity === "simple") score -= 0.1;

  const normalized = Math.max(0, Math.min(1, score));
  return {
    score: Number(normalized.toFixed(2)),
    runFullPlanner: normalized >= 0.65,
    runLightweightPlanner: normalized >= 0.45 && normalized < 0.65
  };
}
