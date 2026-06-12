import { resolveAgentDisplayName } from "./agent-id-map";

type RosterStatus =
  | "idle"
  | "thinking"
  | "working"
  | "blocked"
  | "reviewing"
  | "deploying"
  | "done"
  | "error"
  | "offline";

/** Canonical forge roster — single source for UI + demo data */
export const FORGE_ROSTER_AGENT_IDS = [
  "admin-agent",
  "product-agent",
  "architect-agent",
  "code-implementer",
  "qa-agent",
  "security-auditor",
  "code-reviewer",
  "docs-agent"
] as const;

export type ForgeRosterAgent = {
  id: (typeof FORGE_ROSTER_AGENT_IDS)[number];
  name: string;
  role: string;
  status: RosterStatus;
  workload: number;
  currentTaskId?: string;
  skills: string[];
};

const ROSTER_META: Record<
  (typeof FORGE_ROSTER_AGENT_IDS)[number],
  { role: string; status: RosterStatus; workload: number; skills: string[]; currentTaskId?: string }
> = {
  "admin-agent": {
    role: "Routes tasks, coordinates the team, and manages approvals.",
    status: "thinking",
    workload: 48,
    currentTaskId: "task-command-center",
    skills: ["routing", "planning", "risk triage"]
  },
  "product-agent": {
    role: "Turns ideas into specs and acceptance criteria.",
    status: "idle",
    workload: 24,
    skills: ["prd", "requirements", "user stories"]
  },
  "architect-agent": {
    role: "Designs system architecture, APIs, and data flow.",
    status: "reviewing",
    workload: 36,
    skills: ["architecture", "schema", "interfaces"]
  },
  "code-implementer": {
    role: "Implements code in supervised local runs.",
    status: "working",
    workload: 72,
    currentTaskId: "task-command-center",
    skills: ["implementation", "refactor", "debugging"]
  },
  "qa-agent": {
    role: "Runs tests and verification sweeps.",
    status: "blocked",
    workload: 58,
    skills: ["test plans", "regression", "checks"]
  },
  "security-auditor": {
    role: "Reviews approvals, secrets, and risky tools.",
    status: "idle",
    workload: 33,
    skills: ["approval gates", "audit", "permissions"]
  },
  "code-reviewer": {
    role: "Reviews diffs and implementation quality.",
    status: "idle",
    workload: 18,
    skills: ["review", "risk notes", "maintainability"]
  },
  "docs-agent": {
    role: "Maintains docs, runbooks, and release notes.",
    status: "done",
    workload: 12,
    skills: ["readme", "runbooks", "changelog"]
  }
};

export function buildForgeAgentRoster(): ForgeRosterAgent[] {
  return FORGE_ROSTER_AGENT_IDS.map((id) => ({
    id,
    name: resolveAgentDisplayName(id),
    ...ROSTER_META[id]
  }));
}
