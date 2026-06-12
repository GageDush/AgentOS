import { describe, expect, it } from "vitest";
import { loadInstalledAgentProfiles } from "@agentos/agents";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { TaskEnvelope } from "@agentos/shared";
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

  it("builds a task envelope aligned with the contract schema", () => {
    const installed = loadInstalledAgentProfiles();
    const route = determineMissionRoute(installed, {
      id: "mission-2",
      workspaceId: "workspace-local",
      title: "Fix auth bug",
      objective: "Repair the login regression.",
      prompt: "Investigate and fix the auth bug in the API.",
      command: "git diff apps/api/src/auth.ts"
    });
    const envelope = route.metadata?.taskEnvelope as TaskEnvelope | undefined;
    expect(envelope).toBeDefined();
    expect(envelope?.taskType).toBe("bug_fix");
    expect(envelope?.requiredGates).toContain("qa");
    const repoRoot = existsSync(join(process.cwd(), ".agentos"))
      ? process.cwd()
      : join(process.cwd(), "..", "..");
    const schema = JSON.parse(readFileSync(join(repoRoot, ".agentos/contracts/task-envelope.schema.json"), "utf8")) as {
      required: string[];
    };
    for (const key of schema.required) {
      expect(envelope).toHaveProperty(key);
    }
  });

  it("includes context-minimizer when repo context is required", () => {
    const installed = loadInstalledAgentProfiles();
    const route = determineMissionRoute(installed, {
      id: "mission-ctx",
      workspaceId: "workspace-local",
      title: "Fix auth bug",
      objective: "Repair the login regression.",
      prompt: "Investigate and fix the auth bug in the API.",
      command: "git diff apps/api/src/auth.ts"
    });
    expect(route.supportingAgentIds).toContain("context-minimizer");
  });

  it("asks for clarification when approval intent is ambiguous", () => {
    const intent = parseConversationalIntent("approve that", {
      pendingApprovalIds: ["a-1", "a-2"]
    });
    expect(intent.askHuman).toBe(true);
    expect(intent.type).toBe("clarify");
  });
});
