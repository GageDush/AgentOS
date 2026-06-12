import type { TaskEnvelope } from "@agentos/shared";

export type ContextMinimizerTriggerContext = {
  envelope: TaskEnvelope;
  supportingAgentCount: number;
  priorFailureCount?: number;
  tokensInScopeEstimate?: number;
  laneEscalated?: boolean;
};

/**
 * Metric-triggered context minimizer (Q12): not only requiresRepoContext.
 */
export function shouldRunContextMinimizer(ctx: ContextMinimizerTriggerContext): boolean {
  if (ctx.envelope.taskType === "answer_only") return false;
  if (ctx.envelope.requiresRepoContext) return true;
  if ((ctx.priorFailureCount ?? 0) >= 2) return true;
  if (ctx.laneEscalated) return true;
  if (ctx.supportingAgentCount >= 2) return true;

  const budget = ctx.envelope.contextBudgetTokens || 4000;
  const tokens = ctx.tokensInScopeEstimate ?? 0;
  if (tokens > 0 && tokens / budget > 0.7) return true;

  return false;
}

export function estimateTokensInScope(envelope: TaskEnvelope, pathCount: number): number {
  const perFile = envelope.complexity === "complex" ? 900 : envelope.complexity === "moderate" ? 600 : 350;
  return pathCount * perFile + envelope.userGoal.length + envelope.normalizedGoal.length;
}
