import type { LlmChatRequest, LlmChatResponse, LlmProviderId } from "@agentos/shared";
import { routeLlmCall } from "@agentos/llm-router";

export type ChatProvider = {
  id: LlmProviderId;
  chat: (request: LlmChatRequest) => Promise<LlmChatResponse>;
};

const defaultOllamaModel = process.env.AGENTOS_DEFAULT_MODEL || "qwen2.5-coder:7b";

const featureFlags = {
  ollama: (process.env.FEATURE_OLLAMA ?? "true") === "true",
  cloud: (process.env.FEATURE_CLOUD_PROVIDERS ?? "false") === "true"
};

export const getProviderId = (): LlmProviderId => {
  const configured = (process.env.AGENTOS_MODEL_PROVIDER ?? "mock").toLowerCase();
  if (configured === "ollama" && featureFlags.ollama) return "ollama";
  if (configured === "cloud-stub" && featureFlags.cloud) return "cloud-stub";
  return "mock";
};

export const mockProvider: ChatProvider = {
  id: "mock",
  async chat(request) {
    const startedAt = Date.now();
    return {
      ok: true,
      provider: "mock",
      model: request.model || "mock-agentos-local",
      response: `Mock AgentOS response for: ${request.prompt.slice(0, 160)}`,
      durationMs: Date.now() - startedAt
    };
  }
};

export const ollamaProvider: ChatProvider = {
  id: "ollama",
  async chat(request) {
    const prompt = request.prompt.trim();
    if (!prompt) {
      throw new Error("Prompt is required.");
    }

    const model = request.model?.trim() || defaultOllamaModel;
    const startedAt = Date.now();

    // Route the local lane through the LLM router (no direct Ollama bypass).
    // process.cwd() + [] is sufficient here: a model override skips alias config,
    // and the quota/budget gates are no-ops for the free local lane (the cloud
    // gates run in the /llm/chat API route with the real usage events).
    const result = await routeLlmCall(process.cwd(), [], {
      model: `ollama/${model}`,
      prompt,
      agentId: request.agentId,
      timeoutMs: 8000
    });

    if (!result.ok || !result.text) {
      throw new Error("Ollama is unavailable at http://127.0.0.1:11434.");
    }

    return {
      ok: true,
      provider: "ollama",
      model,
      response: result.text,
      durationMs: Date.now() - startedAt
    };
  }
};

export const cloudStubProvider: ChatProvider = {
  id: "cloud-stub",
  async chat(request) {
    const startedAt = Date.now();
    return {
      ok: true,
      provider: "cloud-stub",
      model: request.model || "cloud-stub-model",
      response: `Cloud provider calls are intentionally disabled in this local-safe build. Prompt preview: ${request.prompt.slice(0, 120)}`,
      durationMs: Date.now() - startedAt
    };
  }
};

export const providers: Record<LlmProviderId, ChatProvider> = {
  mock: mockProvider,
  ollama: ollamaProvider,
  "cloud-stub": cloudStubProvider
};
