const AGENT_AVATAR_MAP: Record<string, string> = {
  "agentos-operator": "/agents/agentos-operator.png",
  "admin-agent": "/agents/admin-agent.png",
  "product-agent": "/agents/product-agent.png",
  "architect-agent": "/agents/architect-agent.png",
  "builder-agent": "/agents/builder-agent.png",
  "code-implementer": "/agents/builder-agent.png",
  "qa-agent": "/agents/qa-agent.png",
  "security-agent": "/agents/security-agent.png",
  "security-auditor": "/agents/security-agent.png",
  "reviewer-agent": "/agents/reviewer-agent.png",
  "code-reviewer": "/agents/reviewer-agent.png",
  "release-manager": "/agents/release-manager.png",
  "quota-steward": "/agents/quota-steward.png",
  "systems-synthesizer": "/agents/systems-synthesizer.png",
  "task-classifier": "/agents/task-classifier.png",
  "planner-partitioner": "/agents/planner-partitioner.png",
  "issue-intake-researcher": "/agents/issue-intake-researcher.png",
  "context-minimizer": "/agents/context-minimizer.png",
  "docs-agent": "/agents/docs-agent.png"
};

const AGENT_ACCENT_MAP: Record<string, string> = {
  "agentos-operator": "#00f5ff",
  "admin-agent": "#f1c40f",
  "product-agent": "#27ae60",
  "architect-agent": "#34495e",
  "builder-agent": "#3498db",
  "code-implementer": "#3498db",
  "qa-agent": "#2ecc71",
  "security-agent": "#e74c3c",
  "security-auditor": "#e74c3c",
  "reviewer-agent": "#9b59b6",
  "code-reviewer": "#9b59b6",
  "release-manager": "#8e44ad",
  "quota-steward": "#ffb020",
  "systems-synthesizer": "#e67e22",
  "task-classifier": "#f39c12",
  "planner-partitioner": "#795548",
  "issue-intake-researcher": "#ff6b9d",
  "context-minimizer": "#1abc9c",
  "docs-agent": "#74b9ff",
  "repo-cartographer": "#607d8b",
  "memory-curator": "#a29bfe",
  "frontend-ui-agent": "#ff6a35",
  "backend-service-agent": "#2980b9",
  "database-migration-agent": "#16a085",
  "integration-broker": "#e17055"
};

export function agentAvatarUrl(agentId: string): string | undefined {
  const canonical = AGENT_AVATAR_MAP[agentId];
  if (canonical) return canonical;
  return AGENT_AVATAR_MAP[agentId.replace(/_/g, "-")];
}

export function agentAccentColor(agentId: string): string | undefined {
  return (
    AGENT_ACCENT_MAP[agentId] ??
    AGENT_ACCENT_MAP[agentId.replace(/_/g, "-")]
  );
}
