import type { MissionCommandPolicy, SandboxPermissionLevel } from "@agentos/shared";

export type SandboxMode = "mock" | "docker";

export const defaultSandboxMode: SandboxMode = "mock";

export const sandboxPermissionLevels: SandboxPermissionLevel[] = [
  "observe",
  "workspace_write",
  "safe_execute",
  "network_limited",
  "dependency_install",
  "external_action",
  "repo_mutation",
  "system_elevated"
];

export type CommandPolicyDecision = {
  policy: MissionCommandPolicy;
  permissionLevel: SandboxPermissionLevel;
  reason: string;
};

const autoAllowedCommands = new Set([
  "git status",
  "git status --short",
  "git diff",
  "git diff --stat",
  "git diff --name-only",
  "git log",
  "semgrep --config .semgrep.yml --error --quiet",
  "pnpm test",
  "pnpm typecheck",
  "pnpm lint",
  "pnpm build"
]);

export const AUTO_ALLOWED_COMMANDS = [...autoAllowedCommands] as const;

const approvalPatterns: Array<{ pattern: RegExp; permissionLevel: SandboxPermissionLevel; reason: string }> = [
  { pattern: /\bpnpm install\b/i, permissionLevel: "dependency_install", reason: "Dependency installation changes the workspace state." },
  { pattern: /\bnpm install\b/i, permissionLevel: "dependency_install", reason: "Dependency installation changes the workspace state." },
  { pattern: /\bgit commit\b/i, permissionLevel: "repo_mutation", reason: "Committing mutates repository history." },
  { pattern: /\bgit push\b/i, permissionLevel: "external_action", reason: "Pushing sends repository state to a remote." },
  { pattern: /\.env\b/i, permissionLevel: "external_action", reason: "Reading .env files may expose secrets." },
  { pattern: /\bcurl\b|\bInvoke-WebRequest\b|\bwget\b/i, permissionLevel: "network_limited", reason: "Network access requires review." },
  { pattern: /\bwrite\b|\bappend\b|\bmove\b|\bcopy\b/i, permissionLevel: "workspace_write", reason: "Workspace file mutations require approval." }
];

const deniedPatterns = [
  /\bsudo\b/i,
  /\brm\s+-rf\s+\/\b/i,
  /\bdel\s+\/s\s+\/q\b/i,
  /\bformat\b/i
];

export const assessCommandPolicy = (command: string): CommandPolicyDecision => {
  const normalized = command.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return {
      policy: "denied",
      permissionLevel: "system_elevated",
      reason: "Empty commands are not executable."
    };
  }

  if (deniedPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      policy: "denied",
      permissionLevel: "system_elevated",
      reason: "This command is blocked by the local safety policy."
    };
  }

  if (autoAllowedCommands.has(normalized)) {
    return {
      policy: "auto_allowed",
      permissionLevel: "safe_execute",
      reason: "This command is on the local auto-allow list."
    };
  }

  const approvalMatch = approvalPatterns.find(({ pattern }) => pattern.test(normalized));
  if (approvalMatch) {
    return {
      policy: "approval_required",
      permissionLevel: approvalMatch.permissionLevel,
      reason: approvalMatch.reason
    };
  }

  return {
    policy: "approval_required",
    permissionLevel: "safe_execute",
    reason: "Commands outside the small allow-list require operator approval."
  };
};
