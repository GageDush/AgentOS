import type { RouteComplexity, RouteRiskLevel, RouteTaskType } from "@agentos/shared";

export type Tier0Classification = {
  taskType: RouteTaskType;
  complexity: RouteComplexity;
  riskLevel: RouteRiskLevel;
  confidence: number;
  askHuman: boolean;
  signals: string[];
};

export type Tier1ClassificationPatch = Partial<
  Pick<Tier0Classification, "taskType" | "complexity" | "riskLevel" | "askHuman">
> & {
  classifierTier: "tier0" | "tier1";
  confidence: number;
};

const TASK_TYPES: RouteTaskType[] = [
  "answer_only",
  "code_change",
  "bug_fix",
  "repo_analysis",
  "research",
  "qa",
  "security",
  "release",
  "config",
  "agent_profile_work",
  "app_creation"
];

const COMPLEXITIES: RouteComplexity[] = ["trivial", "simple", "moderate", "complex", "unknown"];

function parseJsonBlock(text: string): Record<string, unknown> | undefined {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return undefined;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function tier0RouteConfidence(input: {
  taskType: RouteTaskType;
  complexity: RouteComplexity;
  text: string;
  domainSpan: number;
}): number {
  let confidence = 0.72;
  if (input.taskType === "answer_only" || input.taskType === "qa" || input.taskType === "release") confidence += 0.1;
  if (input.complexity === "complex") confidence -= 0.08;
  if (input.domainSpan >= 3) confidence -= 0.06;
  if (/\bor\b|\bmaybe\b/.test(input.text)) confidence -= 0.12;
  return Number(Math.max(0.2, Math.min(0.99, confidence)).toFixed(2));
}

export function shouldRunTier1Classifier(tier0Confidence: number): boolean {
  return tier0Confidence >= 0.6 && tier0Confidence < 0.85;
}

export function shouldRunTier2Classifier(tier0Confidence: number, taskType: RouteTaskType, riskLevel: RouteRiskLevel): boolean {
  if (riskLevel === "critical" || taskType === "security" || taskType === "release") return true;
  return tier0Confidence < 0.6;
}

export type Tier2ClassificationPatch = Partial<
  Pick<Tier0Classification, "taskType" | "complexity" | "riskLevel" | "askHuman">
> & {
  classifierTier: "tier2";
  confidence: number;
  subscriptionLane: "subscription_codex" | "subscription_chatgpt" | "premium_api";
};

/**
 * Tier 2 uses subscription/premium lane metadata only (no external API call in local MVP).
 * Callers may route to Codex/ChatGPT when AGENTOS_CLASSIFIER_TIER2=external.
 */
export function refineClassificationTier2(
  tier0: Tier0Classification,
  options?: { preferCodex?: boolean }
): Tier2ClassificationPatch {
  const subscriptionLane = options?.preferCodex ? "subscription_codex" : "subscription_chatgpt";
  return {
    classifierTier: "tier2",
    taskType: tier0.taskType,
    complexity: tier0.complexity === "trivial" ? "simple" : tier0.complexity,
    riskLevel: tier0.riskLevel,
    askHuman: tier0.askHuman || tier0.riskLevel === "critical",
    confidence: Math.min(0.92, tier0.confidence + 0.12),
    subscriptionLane
  };
}

export async function refineClassificationTier2External(
  missionText: string,
  tier0: Tier0Classification,
  callLlm: (prompt: string) => Promise<string>,
  options?: { preferCodex?: boolean }
): Promise<Tier2ClassificationPatch> {
  const prompt = [
    "You are the AgentOS tier-2 task-classifier for premium/subscription lanes.",
    "Return ONLY JSON.",
    `Goal snippet: ${missionText.slice(0, 320)}`,
    `Tier0: taskType=${tier0.taskType}, complexity=${tier0.complexity}, risk=${tier0.riskLevel}, confidence=${tier0.confidence}`,
    `Valid taskType: ${TASK_TYPES.join("|")}`,
    `Valid complexity: ${COMPLEXITIES.join("|")}`,
    `Prefer lane: ${options?.preferCodex ? "subscription_codex" : "subscription_chatgpt"}`,
    '{"taskType":"...","complexity":"...","riskLevel":"low|medium|high|critical","askHuman":false,"confidence":0.0-1.0,"subscriptionLane":"subscription_codex|subscription_chatgpt|premium_api"}'
  ].join("\n");

  const raw = await callLlm(prompt);
  const parsed = parseJsonBlock(raw);
  if (!parsed) return refineClassificationTier2(tier0, options);

  const taskType = TASK_TYPES.includes(parsed.taskType as RouteTaskType)
    ? (parsed.taskType as RouteTaskType)
    : tier0.taskType;
  const complexity = COMPLEXITIES.includes(parsed.complexity as RouteComplexity)
    ? (parsed.complexity as RouteComplexity)
    : tier0.complexity;
  const riskLevel = ["none", "low", "medium", "high", "critical"].includes(String(parsed.riskLevel))
    ? (parsed.riskLevel as RouteRiskLevel)
    : tier0.riskLevel;
  const laneRaw = String(parsed.subscriptionLane ?? "");
  const subscriptionLane =
    laneRaw === "subscription_codex" || laneRaw === "subscription_chatgpt" || laneRaw === "premium_api"
      ? laneRaw
      : options?.preferCodex
        ? "subscription_codex"
        : "subscription_chatgpt";

  return {
    classifierTier: "tier2",
    taskType,
    complexity,
    riskLevel,
    askHuman: Boolean(parsed.askHuman) || riskLevel === "critical",
    confidence:
      typeof parsed.confidence === "number" ? Math.min(0.95, parsed.confidence) : Math.min(0.92, tier0.confidence + 0.15),
    subscriptionLane
  };
}

export async function refineClassificationTier1(
  missionText: string,
  tier0: Tier0Classification,
  callLlm: (prompt: string) => Promise<string>
): Promise<Tier1ClassificationPatch> {
  const prompt = [
    "You are the AgentOS task-classifier. Return ONLY JSON.",
    `Goal snippet: ${missionText.slice(0, 240)}`,
    `Tier0: taskType=${tier0.taskType}, complexity=${tier0.complexity}, risk=${tier0.riskLevel}, confidence=${tier0.confidence}`,
    `Valid taskType: ${TASK_TYPES.join("|")}`,
    `Valid complexity: ${COMPLEXITIES.join("|")}`,
    '{"taskType":"...","complexity":"...","riskLevel":"low|medium|high|critical","askHuman":false,"confidence":0.0-1.0}'
  ].join("\n");

  const raw = await callLlm(prompt);
  const parsed = parseJsonBlock(raw);
  if (!parsed) {
    return { classifierTier: "tier0", confidence: tier0.confidence };
  }

  const taskType = TASK_TYPES.includes(parsed.taskType as RouteTaskType)
    ? (parsed.taskType as RouteTaskType)
    : tier0.taskType;
  const complexity = COMPLEXITIES.includes(parsed.complexity as RouteComplexity)
    ? (parsed.complexity as RouteComplexity)
    : tier0.complexity;
  const riskLevel = ["none", "low", "medium", "high", "critical"].includes(String(parsed.riskLevel))
    ? (parsed.riskLevel as RouteRiskLevel)
    : tier0.riskLevel;

  return {
    classifierTier: "tier1",
    taskType,
    complexity,
    riskLevel,
    askHuman: Boolean(parsed.askHuman),
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : tier0.confidence
  };
}
