import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "@agentos/persistence";
import type { ContextPacket, TaskEnvelope, TaskEnvelopeModelLane } from "@agentos/shared";

export type LlmProviderResult = {
  text: string;
  provider: "mock" | "ollama";
  model: string;
};

function readProfileMarkdown(profileId: string) {
  try {
    const path = join(findRepoRoot(), ".agentos", "agents", `${profileId}.md`);
    if (!existsSync(path)) return "";
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function profileSection(body: string, title: string) {
  const normalized = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const header = normalized.match(new RegExp(`^# ${title}$`, "m"));
  if (!header || header.index === undefined) return "";

  const bodyStart = normalized.indexOf("\n", header.index);
  if (bodyStart < 0) return "";

  const rest = normalized.slice(bodyStart + 1);
  const nextHeader = rest.search(/^# /m);
  return (nextHeader < 0 ? rest : rest.slice(0, nextHeader)).trim();
}

function profilePromptExcerpt(profileId: string, maxChars = 1200) {
  const body = readProfileMarkdown(profileId);
  const runtimeExcerpt = profileSection(body, "Runtime Excerpt");
  if (runtimeExcerpt) return runtimeExcerpt.slice(0, maxChars);

  const mission = profileSection(body, "Mission");
  const workflow = profileSection(body, "Workflow");
  return [mission, workflow].filter(Boolean).join("\n\n").slice(0, maxChars);
}

export function resolveExecutorLlmPolicy(envelope?: TaskEnvelope): {
  enabled: boolean;
  lane: TaskEnvelopeModelLane;
  model: string;
} {
  const lane = envelope?.selectedLane ?? envelope?.preferredLane ?? "mock_local";
  const model = process.env.AGENTOS_DEFAULT_MODEL ?? "qwen2.5-coder:7b";

  if (lane === "deterministic" || lane === "defer_until_reset") {
    return { enabled: false, lane, model: "deterministic" };
  }
  if (lane === "mock_local") {
    return { enabled: process.env.FEATURE_AGENT_LLM === "true", lane, model: "mock-agentos-local" };
  }
  if (lane === "local_ollama") {
    return { enabled: process.env.FEATURE_OLLAMA === "true", lane, model };
  }
  return {
    enabled: process.env.FEATURE_AGENT_LLM === "true" || process.env.FEATURE_OLLAMA === "true",
    lane,
    model
  };
}

export async function callAgentLlm(
  profileId: string,
  prompt: string,
  options?: { model?: string; timeoutMs?: number; envelope?: TaskEnvelope }
): Promise<LlmProviderResult> {
  const policy = resolveExecutorLlmPolicy(options?.envelope);
  const model = options?.model ?? policy.model;

  if (!policy.enabled || process.env.FEATURE_OLLAMA !== "true") {
    return { text: prompt.slice(0, 600), provider: "mock", model: policy.enabled ? policy.lane : "mock-agentos-local" };
  }

  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 8000)
    });
    if (response.ok) {
      const payload = (await response.json()) as { response?: string };
      if (payload.response?.trim()) {
        return { text: payload.response.trim(), provider: "ollama", model };
      }
    }
    return { text: prompt.slice(0, 600), provider: "mock", model: "mock-fallback" };
  } catch {
    return { text: prompt.slice(0, 600), provider: "mock", model: "mock-fallback" };
  }
}

export async function buildProfileAwareSummary(
  profileId: string,
  envelope: TaskEnvelope,
  contextPacket: ContextPacket | undefined,
  baseSummary: string
) {
  const policy = resolveExecutorLlmPolicy(envelope);
  if (!policy.enabled && process.env.FEATURE_AGENT_LLM !== "true") {
    return maybeEnhanceSummary(profileId, baseSummary, envelope.userGoal);
  }

  const excerpt = profilePromptExcerpt(profileId);
  if (!excerpt) return baseSummary;

  const scoped = (contextPacket?.repoPaths ?? envelope.filesInScope).slice(0, 8).join(", ") || "none";
  const prompt = [
    `You are ${profileId} for AgentOS.`,
    excerpt,
    `Goal: ${envelope.userGoal}`,
    `Task type: ${envelope.taskType} (${envelope.complexity}, risk ${envelope.riskLevel})`,
    `Files in scope: ${scoped}`,
    `Respond in 2-3 sentences as an operator-facing specialist summary.`
  ].join("\n\n");

  const result = await callAgentLlm(profileId, prompt, { envelope });
  return result.text.trim() || baseSummary;
}

export async function maybeEnhanceSummary(profileId: string, baseSummary: string, goal: string) {
  if (process.env.FEATURE_OLLAMA !== "true") return baseSummary;
  const result = await callAgentLlm(
    profileId,
    `Agent ${profileId} summary for goal: ${goal}\nRespond in one sentence.`,
    { timeoutMs: 4000 }
  );
  return result.text || baseSummary;
}
