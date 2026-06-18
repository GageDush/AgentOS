/* ────────────────────────────────────────────────────────────────────────
   @agentos/llm-router — self-hosted, OpenRouter-style routing for AgentOS.

   Phase 1 (additive): a single entrypoint `routeLlmCall` that resolves a model
   alias, runs the quota-steward + budget gates BEFORE any paid lane, then
   executes against Ollama (local lane) or a LiteLLM sidecar (cloud lanes) with
   fallback down the alias chain. Every successful call yields a UsageEvent the
   caller persists. Inference still costs money on paid providers — this layer
   makes routing, caps, and logging local and free.

   NOTE: existing callers (apps/api/providers.ts, packages/agents/llm.ts) are
   intentionally NOT refactored in this pass — they keep working unchanged. Flip
   them to `routeLlmCall` in a follow-up once verified on the Windows stack.
   ──────────────────────────────────────────────────────────────────────── */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { UsageBudget, UsageEvent } from "@agentos/shared";
import { evaluateBudget, evaluateQuotaSteward } from "@agentos/token-manager";

export type LlmRouterMessage = { role: string; content: string };

export type LlmRouterRequest = {
  prompt?: string;
  messages?: LlmRouterMessage[];
  alias?: string;
  model?: string;
  agentId?: string;
  missionId?: string;
  runId?: string;
  estimatedCostUsd?: number;
  /** Per-attempt timeout (ms). Mirrors the old direct-fetch AbortSignal.timeout. */
  timeoutMs?: number;
  /** Optional budgets (apps/api passes store.budgets) — when omitted the budget
   *  gate is skipped but the quota-steward gate still runs. */
  budgets?: UsageBudget[];
};

export type LlmRouterAttempt = { model: string; ok: boolean; error?: string; durationMs: number };

export type LlmRouterResult = {
  ok: boolean;
  text: string;
  provider: string;
  model: string;
  lane: string;
  attempts: LlmRouterAttempt[];
  usage?: { promptTokens?: number; completionTokens?: number; costUsd?: number };
  usageEvent?: UsageEvent;
  blocked?: boolean;
  blockReason?: string;
};

type AliasConfig = {
  lanes?: string[];
  models: string[];
  maxTokens?: number;
  requiresApproval?: boolean;
};

type ModelRoutesConfig = {
  defaultLane: string;
  defaultAlias?: string;
  aliases: Record<string, AliasConfig>;
  fallback?: { enabled?: boolean; billSuccessfulOnly?: boolean };
};

const DEFAULT_CONFIG: ModelRoutesConfig = {
  defaultLane: "local_ollama",
  defaultAlias: "agentos-coder",
  aliases: {
    "agentos-coder": { lanes: ["local_ollama", "cheap_cloud"], models: ["ollama/qwen2.5-coder:7b", "openai/gpt-4o-mini"] },
  },
  fallback: { enabled: true, billSuccessfulOnly: true },
};

// Rough $/1k-token estimate for the post-hoc cost when the caller doesn't supply one.
const PRICE_PER_1K: Record<string, number> = {
  "openai/gpt-4o-mini": 0.0006,
  "openai/gpt-4o": 0.005,
  "anthropic/claude-sonnet-4-20250514": 0.006,
};

export function loadModelRoutes(repoRoot: string): ModelRoutesConfig {
  try {
    const path = join(repoRoot, "configs", "model-routes.json");
    if (!existsSync(path)) return DEFAULT_CONFIG;
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<ModelRoutesConfig>;
    return {
      defaultLane: parsed.defaultLane ?? DEFAULT_CONFIG.defaultLane,
      defaultAlias: parsed.defaultAlias ?? DEFAULT_CONFIG.defaultAlias,
      aliases: parsed.aliases ?? DEFAULT_CONFIG.aliases,
      fallback: { ...DEFAULT_CONFIG.fallback, ...(parsed.fallback ?? {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function isLocalModel(model: string): boolean {
  return model.toLowerCase().startsWith("ollama/");
}

export function providerFromModel(model: string): string {
  const head = model.split("/")[0]?.toLowerCase() ?? "unknown";
  return head;
}

function messagesFor(request: LlmRouterRequest): LlmRouterMessage[] {
  if (request.messages?.length) return request.messages;
  return [{ role: "user", content: request.prompt ?? "" }];
}

function resolveModels(config: ModelRoutesConfig, request: LlmRouterRequest): { models: string[]; alias: string } {
  if (request.model) return { models: [request.model], alias: request.alias ?? "(override)" };
  const aliasKey = request.alias ?? config.defaultAlias ?? Object.keys(config.aliases)[0];
  const alias = aliasKey ? config.aliases[aliasKey] : undefined;
  if (!alias?.models?.length) return { models: ["ollama/qwen2.5-coder:7b"], alias: aliasKey ?? "agentos-coder" };
  return { models: alias.models, alias: aliasKey };
}

function laneForModel(model: string): string {
  if (isLocalModel(model)) return "local_ollama";
  const p = providerFromModel(model);
  if (p === "openai" || p === "openrouter") return "cheap_cloud";
  if (p === "anthropic") return "premium_api";
  return "cheap_cloud";
}

function estimateCost(model: string, totalTokens: number, override?: number): number {
  if (typeof override === "number" && override > 0) return override;
  if (isLocalModel(model)) return 0;
  const rate = PRICE_PER_1K[model] ?? 0.001;
  return Number(((totalTokens / 1000) * rate).toFixed(6));
}

type CallOutcome = {
  ok: boolean;
  text: string;
  error?: string;
  promptTokens: number;
  completionTokens: number;
};

async function callOllama(model: string, messages: LlmRouterMessage[], signal?: AbortSignal): Promise<CallOutcome> {
  const base = process.env.AGENTOS_OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const ollamaModel = model.replace(/^ollama\//i, "");
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: ollamaModel, messages, stream: false }),
    signal,
  });
  if (!response.ok) {
    return { ok: false, text: "", error: `Ollama HTTP ${response.status}`, promptTokens: 0, completionTokens: 0 };
  }
  const data = (await response.json()) as {
    message?: { content?: string };
    prompt_eval_count?: number;
    eval_count?: number;
  };
  return {
    ok: true,
    text: data.message?.content ?? "",
    promptTokens: data.prompt_eval_count ?? 0,
    completionTokens: data.eval_count ?? 0,
  };
}

async function callLiteLLM(model: string, messages: LlmRouterMessage[], signal?: AbortSignal): Promise<CallOutcome> {
  const base = process.env.AGENTOS_LITELLM_BASE_URL ?? "http://127.0.0.1:4000";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.AGENTOS_LITELLM_MASTER_KEY) headers.Authorization = `Bearer ${process.env.AGENTOS_LITELLM_MASTER_KEY}`;
  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages }),
    signal,
  });
  if (!response.ok) {
    return { ok: false, text: "", error: `LiteLLM HTTP ${response.status}`, promptTokens: 0, completionTokens: 0 };
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    ok: true,
    text: data.choices?.[0]?.message?.content ?? "",
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

export async function routeLlmCall(
  repoRoot: string,
  usageEvents: UsageEvent[],
  request: LlmRouterRequest
): Promise<LlmRouterResult> {
  const config = loadModelRoutes(repoRoot);
  const { models } = resolveModels(config, request);
  const messages = messagesFor(request);
  const fallbackEnabled = config.fallback?.enabled !== false;
  const litellmEnabled = process.env.FEATURE_LITELLM_PROXY === "true";
  const cloudKillSwitch = process.env.FEATURE_CLOUD_PROVIDERS === "false";

  // Pre-flight gates (evaluated once; only enforced against cloud lanes).
  let quotaBlocked = false;
  let quotaReason: string | undefined;
  try {
    const quota = evaluateQuotaSteward(usageEvents, repoRoot);
    quotaBlocked = quota.blocked;
    quotaReason = quota.reason;
  } catch {
    /* quota config missing → treat as not blocked, local-first stays safe */
  }

  const attempts: LlmRouterAttempt[] = [];
  let gateBlockedCloud = false;
  let gateReason: string | undefined;

  for (const model of models) {
    const local = isLocalModel(model);
    const lane = laneForModel(model);

    // Gate cloud lanes before spending anything.
    if (!local) {
      if (cloudKillSwitch) {
        gateBlockedCloud = true;
        gateReason = "Cloud providers are disabled (FEATURE_CLOUD_PROVIDERS=false).";
        attempts.push({ model, ok: false, error: gateReason, durationMs: 0 });
        continue;
      }
      if (quotaBlocked) {
        gateBlockedCloud = true;
        gateReason = quotaReason ?? "Quota steward blocked cloud usage.";
        attempts.push({ model, ok: false, error: gateReason, durationMs: 0 });
        continue;
      }
      if (request.budgets) {
        try {
          const budget = evaluateBudget(usageEvents, request.budgets, request.estimatedCostUsd ?? 0);
          if (!budget.allowed) {
            gateBlockedCloud = true;
            gateReason = budget.reason ?? "Budget exceeded.";
            attempts.push({ model, ok: false, error: gateReason, durationMs: 0 });
            continue;
          }
        } catch {
          /* budget calc failed → do not hard-block; let provider decide */
        }
      }
      if (!litellmEnabled) {
        attempts.push({ model, ok: false, error: "LiteLLM sidecar not enabled (FEATURE_LITELLM_PROXY=false).", durationMs: 0 });
        continue;
      }
    }

    const startedAt = Date.now();
    try {
      const signal = request.timeoutMs ? AbortSignal.timeout(request.timeoutMs) : undefined;
      const outcome = local ? await callOllama(model, messages, signal) : await callLiteLLM(model, messages, signal);
      const durationMs = Date.now() - startedAt;
      attempts.push({ model, ok: outcome.ok, error: outcome.error, durationMs });
      if (outcome.ok) {
        const totalTokens = outcome.promptTokens + outcome.completionTokens;
        const costUsd = estimateCost(model, totalTokens, request.estimatedCostUsd);
        const usageEvent: UsageEvent = {
          id: `usage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          provider: providerFromModel(model),
          model,
          promptTokens: outcome.promptTokens,
          completionTokens: outcome.completionTokens,
          totalTokens,
          estimatedCostUsd: costUsd,
          agentId: request.agentId,
          taskId: request.missionId ?? request.runId,
          runId: request.runId,
          createdAt: new Date().toISOString(),
        };
        return {
          ok: true,
          text: outcome.text,
          provider: providerFromModel(model),
          model,
          lane,
          attempts,
          usage: { promptTokens: outcome.promptTokens, completionTokens: outcome.completionTokens, costUsd },
          usageEvent,
        };
      }
      if (!fallbackEnabled) break;
    } catch (cause) {
      attempts.push({ model, ok: false, error: cause instanceof Error ? cause.message : "call failed", durationMs: Date.now() - startedAt });
      if (!fallbackEnabled) break;
    }
  }

  // Nothing succeeded. If a gate stopped every cloud attempt (and no local
  // model ran), report it as blocked so callers can defer rather than error.
  const lastModel = models[models.length - 1] ?? "";
  if (gateBlockedCloud && !models.some((m) => isLocalModel(m))) {
    return {
      ok: false,
      text: "",
      provider: providerFromModel(lastModel),
      model: lastModel,
      lane: laneForModel(lastModel),
      attempts,
      blocked: true,
      blockReason: gateReason,
    };
  }

  return {
    ok: false,
    text: "",
    provider: providerFromModel(lastModel),
    model: lastModel,
    lane: laneForModel(lastModel),
    attempts,
    blocked: gateBlockedCloud,
    blockReason: gateBlockedCloud ? gateReason : undefined,
  };
}

export function listRouteAliases(repoRoot: string): Array<{ alias: string; models: string[]; lanes: string[]; requiresApproval: boolean }> {
  const config = loadModelRoutes(repoRoot);
  return Object.entries(config.aliases).map(([alias, cfg]) => ({
    alias,
    models: cfg.models,
    lanes: cfg.lanes ?? [],
    requiresApproval: Boolean(cfg.requiresApproval),
  }));
}
