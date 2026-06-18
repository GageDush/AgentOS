import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UsageEvent } from "@agentos/shared";

// Control the quota / budget gates in tests.
vi.mock("@agentos/token-manager", () => ({
  evaluateQuotaSteward: vi.fn(() => ({ allowed: true, warning: false, blocked: false, status: "ok" })),
  evaluateBudget: vi.fn(() => ({ allowed: true, warning: false })),
}));

import { evaluateBudget, evaluateQuotaSteward } from "@agentos/token-manager";
import { routeLlmCall } from "./index";

const NO_REPO = "/tmp/agentos-llm-router-test-no-config";
const EVENTS: UsageEvent[] = [];

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  vi.mocked(evaluateQuotaSteward).mockReturnValue({ allowed: true, warning: false, blocked: false, status: "ok" } as never);
  vi.mocked(evaluateBudget).mockReturnValue({ allowed: true, warning: false });
  delete process.env.FEATURE_LITELLM_PROXY;
  delete process.env.FEATURE_CLOUD_PROVIDERS;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("routeLlmCall", () => {
  it("runs the local Ollama lane and records a usage event (no LiteLLM call)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: { content: "hello" }, prompt_eval_count: 5, eval_count: 3 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await routeLlmCall(NO_REPO, EVENTS, { model: "ollama/qwen2.5-coder:7b", prompt: "hi" });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("ollama");
    expect(result.text).toBe("hello");
    expect(result.usageEvent?.totalTokens).toBe(8);
    expect(result.usageEvent?.estimatedCostUsd).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(":11434/api/chat");
  });

  it("falls back from a failed local model to the LiteLLM cloud lane", async () => {
    process.env.FEATURE_LITELLM_PROXY = "true";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 500)) // ollama fails
      .mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: "cloud answer" } }], usage: { prompt_tokens: 10, completion_tokens: 4 } })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await routeLlmCall(NO_REPO, EVENTS, { alias: "agentos-coder", prompt: "hi" });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("openai");
    expect(result.text).toBe("cloud answer");
    expect(result.attempts.length).toBe(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/v1/chat/completions");
  });

  it("blocks a cloud-only call when the quota steward is blocked (no HTTP)", async () => {
    process.env.FEATURE_LITELLM_PROXY = "true";
    vi.mocked(evaluateQuotaSteward).mockReturnValue({
      allowed: false,
      warning: true,
      blocked: true,
      reason: "Weekly cap depleted.",
      status: "blocked",
    } as never);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await routeLlmCall(NO_REPO, EVENTS, { model: "openai/gpt-4o-mini", prompt: "hi" });

    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.blockReason).toContain("Weekly cap");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a cloud call when the budget would be exceeded", async () => {
    process.env.FEATURE_LITELLM_PROXY = "true";
    vi.mocked(evaluateBudget).mockReturnValue({ allowed: false, warning: true, reason: "Daily hard stop would be exceeded." });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await routeLlmCall(NO_REPO, EVENTS, {
      model: "openai/gpt-4o-mini",
      prompt: "hi",
      budgets: [{} as never],
      estimatedCostUsd: 999,
    });

    expect(result.blocked).toBe(true);
    expect(result.blockReason).toContain("hard stop");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns ok:false with attempts when every model fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 503));
    vi.stubGlobal("fetch", fetchMock);

    const result = await routeLlmCall(NO_REPO, EVENTS, { model: "ollama/qwen2.5-coder:7b", prompt: "hi" });

    expect(result.ok).toBe(false);
    expect(result.attempts.length).toBeGreaterThanOrEqual(1);
    expect(result.usageEvent).toBeUndefined();
  });
});
