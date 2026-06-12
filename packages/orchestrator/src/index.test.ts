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

  it("routes answer-only prompts to admin-agent without QA gates", () => {
    const installed = loadInstalledAgentProfiles();
    const route = determineMissionRoute(installed, {
      id: "mission-answer",
      workspaceId: "workspace-local",
      title: "Explain routing",
      objective: "Explain how agent routing works.",
      prompt: "What is the AgentOS conditional pipeline?",
      command: "echo explain"
    });
    expect(route.selectedPrimaryAgentId).toBe("admin-agent");
    expect(route.taskType).toBe("answer_only");
    const envelope = route.metadata?.taskEnvelope as TaskEnvelope | undefined;
    expect(envelope?.requiresQa).toBe(false);
    expect(envelope?.requiresCodeReview).toBe(false);
  });

  it("routes typo-fix missions to code-implementer even when verification command mentions typecheck", () => {
    const installed = loadInstalledAgentProfiles();
    const route = determineMissionRoute(installed, {
      id: "mission-typo",
      workspaceId: "workspace-local",
      title: "README typo",
      objective: "Fix a typo in README only",
      prompt: "Fix a typo in README only",
      command: "pnpm typecheck"
    });
    expect(route.selectedPrimaryAgentId).toBe("code-implementer");
    expect(route.taskType).toBe("bug_fix");
    expect(route.requiredGates).toContain("qa");
  });

  it("routes backend API work to backend-service-agent without security keywords", () => {
    const installed = loadInstalledAgentProfiles();
    const route = determineMissionRoute(installed, {
      id: "mission-backend",
      workspaceId: "workspace-local",
      title: "API route",
      objective: "Add a new API route for user profile pagination",
      prompt: "Add a new API route for user profile pagination",
      command: "git diff apps/api"
    });
    expect(route.selectedPrimaryAgentId).toBe("backend-service-agent");
    expect(route.taskType).toBe("code_change");
    expect(route.requiredGates).toContain("qa");
  });

  it("prefers security-auditor when auth and secrets appear with backend keywords", () => {
    const installed = loadInstalledAgentProfiles();
    const route = determineMissionRoute(installed, {
      id: "mission-security-mix",
      workspaceId: "workspace-local",
      title: "Auth plus routes",
      objective: "Update API auth middleware, secrets, and route handlers",
      prompt: "Update API auth middleware, secrets, and route handlers",
      command: "git diff apps/api"
    });
    expect(route.selectedPrimaryAgentId).toBe("security-auditor");
    expect(route.taskType).toBe("security");
    expect(route.requiredGates).toContain("security");
  });

  it("routes documentation-only missions to docs-agent", () => {
    const installed = loadInstalledAgentProfiles();
    const route = determineMissionRoute(installed, {
      id: "mission-docs",
      workspaceId: "workspace-local",
      title: "Docs update",
      objective: "Update operator guide documentation only",
      prompt: "Update operator guide documentation only",
      command: "docs"
    });
    expect(route.selectedPrimaryAgentId).toBe("docs-agent");
    expect(route.taskType).toBe("code_change");
  });

  it("routes research missions to issue-intake-researcher", () => {
    const installed = loadInstalledAgentProfiles();
    const route = determineMissionRoute(installed, {
      id: "mission-research",
      workspaceId: "workspace-local",
      title: "Research auth options",
      objective: "Compare auth approaches.",
      prompt: "Research how we should handle auth for the API.",
      command: "echo research"
    });
    expect(route.selectedPrimaryAgentId).toBe("issue-intake-researcher");
    expect(route.supportingAgentIds).toContain("repo-cartographer");
  });

  it("asks for clarification when approval intent is ambiguous", () => {
    const intent = parseConversationalIntent("approve that", {
      pendingApprovalIds: ["a-1", "a-2"]
    });
    expect(intent.askHuman).toBe(true);
    expect(intent.type).toBe("clarify");
  });
});
