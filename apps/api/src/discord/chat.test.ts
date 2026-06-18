import { beforeEach, describe, expect, it, vi } from "vitest";

const mockChat = vi.fn();
const mockAddAudit = vi.fn();
const mockAddUsage = vi.fn();

vi.mock("../providers", () => ({
  getProviderId: () => "mock",
  providers: {
    mock: {
      chat: (...args: unknown[]) => mockChat(...args)
    }
  }
}));

vi.mock("../store", () => ({
  addAudit: (...args: unknown[]) => mockAddAudit(...args),
  addUsageEvent: (...args: unknown[]) => mockAddUsage(...args)
}));

describe("discord chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({
      response: "Mock operator reply.",
      provider: "mock",
      model: "mock-agentos-local"
    });
  });

  it(
    "runs operator chat through the configured provider",
    async () => {
      const { runOperatorChat } = await import("./chat");
      const result = await runOperatorChat("status check", "op-1", "Tester");
      expect(result.response).toContain("Mock operator reply");
      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "status check",
          agentId: "admin-agent"
        })
      );
      expect(mockAddAudit).toHaveBeenCalledWith("llm.chat.completed", "op-1", expect.stringContaining("Tester"));
      expect(mockAddUsage).toHaveBeenCalled();
    },
    15_000
  );
});
