import type { LlmChatRequest, LlmChatResponse, LlmProviderId } from "@agentos/shared";

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
    let response: Response;

    try {
      response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        })
      });
    } catch {
      throw new Error("Ollama is unavailable at http://127.0.0.1:11434.");
    }

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}.`);
    }

    const data = (await response.json()) as { response?: string };
    if (!data.response) {
      throw new Error("Ollama returned an empty response.");
    }

    return {
      ok: true,
      provider: "ollama",
      model,
      response: data.response,
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
