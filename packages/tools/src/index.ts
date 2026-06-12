import type { LoadoutItem } from "@agentos/shared";

export const approvalRequiredTools = [
  "file.write",
  "file.delete",
  "command.execute",
  "git.push",
  "deploy.production",
  "database.migration",
  "auth.change",
  "billing.change",
  "secrets.read",
  "external.network.call"
] as const;

export const defaultLoadoutTools: LoadoutItem[] = [
  {
    id: "tool-git-observe",
    name: "Git Observe",
    kind: "tooling",
    status: "ready",
    summary: "Auto-allowed repository inspection commands."
  },
  {
    id: "tool-control-gate",
    name: "Control Gate",
    kind: "command_policy",
    status: "ready",
    summary: "Routes risky command execution through approvals."
  },
  {
    id: "tool-ollama",
    name: "Ollama",
    kind: "integration",
    status: "mock",
    summary: "Local model integration, active when configured."
  }
];
