import { describe, expect, it } from "vitest";
import { loadInstalledAgentProfiles } from "@agentos/agents";
import { determineMissionRoute, parseConversationalIntent } from "./index";

describe("deterministic routing", () => {
  it("routes QA-style missions to the QA agent with a QA gate", () => {
    const installed = loadInstalledAgentProfiles();
    const route = determineMissionRoute(installed, {
      id: "mission-1",
      workspaceId: "workspace-local",
      title: "Run QA on the repo",
      objective: "Run tests and verify the command center.",
      prompt: "Please run QA on the current build.",
      command: "pnpm test"
    });
    expect(route.selectedPrimaryAgentId).toBe("qa-agent");
    expect(route.requiredGates).toContain("qa");
  });

  it("asks for clarification when approval intent is ambiguous", () => {
    const intent = parseConversationalIntent("approve that", {
      pendingApprovalIds: ["a-1", "a-2"]
    });
    expect(intent.askHuman).toBe(true);
    expect(intent.type).toBe("clarify");
  });
});
