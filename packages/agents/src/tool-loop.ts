export type ToolLoopLimits = {
  maxIterations: number;
  maxMinutes: number;
};

export function resolveToolLoopLimits(): ToolLoopLimits {
  return {
    maxIterations: Number(process.env.AGENTOS_TOOL_MAX_ITERATIONS ?? 32),
    maxMinutes: Number(process.env.AGENTOS_TOOL_MAX_MINUTES ?? 30)
  };
}

export class ToolLoopBudget {
  private readonly startedAt = Date.now();
  private iterations = 0;

  constructor(private readonly limits = resolveToolLoopLimits()) {}

  canContinue() {
    if (this.iterations >= this.limits.maxIterations) return false;
    const elapsedMs = Date.now() - this.startedAt;
    return elapsedMs < this.limits.maxMinutes * 60_000;
  }

  recordIteration() {
    this.iterations += 1;
  }

  snapshot() {
    return {
      iterations: this.iterations,
      maxIterations: this.limits.maxIterations,
      elapsedMs: Date.now() - this.startedAt,
      maxMinutes: this.limits.maxMinutes
    };
  }
}
