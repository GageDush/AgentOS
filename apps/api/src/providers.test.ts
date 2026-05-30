import { describe, expect, it, vi } from "vitest";
import { mockProvider, ollamaProvider } from "./providers";

describe("providers", () => {
  it("returns a mock response", async () => {
    const result = await mockProvider.chat({ prompt: "Hello AgentOS" });
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("mock");
  });

  it("validates empty Ollama prompts", async () => {
    await expect(ollamaProvider.chat({ prompt: "   " })).rejects.toThrow("Prompt is required.");
  });

  it("handles unavailable Ollama", async () => {
    const originalFetch = global.fetch;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(ollamaProvider.chat({ prompt: "ping" })).rejects.toThrow("Ollama is unavailable");
    vi.stubGlobal("fetch", originalFetch);
  });
});
