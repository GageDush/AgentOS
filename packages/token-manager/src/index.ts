import type { UsageBudget, UsageEvent } from "@agentos/shared";
import { calculateUsageSummary } from "@agentos/shared";

export {
  clearAgentStopFile,
  enqueueResumeItem,
  evaluateQuotaSteward,
  gatePremiumProviderRun,
  listStoppedAgentIds,
  readAgentStopFile,
  readResumeQueue,
  writeAgentStopFile
} from "./quota-steward";
export type { QuotaEvaluation, ResumeQueueItem, StopFileRecord } from "./quota-steward";

export type BudgetDecision = {
  allowed: boolean;
  warning: boolean;
  reason?: string;
};

export const evaluateBudget = (
  events: UsageEvent[],
  budgets: UsageBudget[],
  estimatedCostUsd: number
): BudgetDecision => {
  const summary = calculateUsageSummary(events, budgets);
  const dailyAfter = summary.dailySpend + estimatedCostUsd;
  const monthlyAfter = summary.monthlySpend + estimatedCostUsd;
  const dailyWarnAt = summary.dailyLimit * (summary.warningThresholdPercent / 100);
  const monthlyWarnAt = summary.monthlyLimit * (summary.warningThresholdPercent / 100);

  if (summary.hardStopEnabled && summary.dailyLimit > 0 && dailyAfter > summary.dailyLimit) {
    return { allowed: false, warning: true, reason: "Daily hard stop would be exceeded." };
  }

  if (summary.hardStopEnabled && summary.monthlyLimit > 0 && monthlyAfter > summary.monthlyLimit) {
    return { allowed: false, warning: true, reason: "Monthly hard stop would be exceeded." };
  }

  return {
    allowed: true,
    warning:
      (summary.dailyLimit > 0 && dailyAfter >= dailyWarnAt) ||
      (summary.monthlyLimit > 0 && monthlyAfter >= monthlyWarnAt)
  };
};
