const AGENT_AVATAR_MAP: Record<string, string> = {
  "agentos-operator": "/agents/agentos-operator.png",
  "admin-agent": "/agents/agentos-operator.png",
  "product-agent": "/agents/product-agent.png",
  "architect-agent": "/agents/architect-agent.png",
  "builder-agent": "/agents/builder-agent.png",
  "code-implementer": "/agents/builder-agent.png",
  "qa-agent": "/agents/qa-agent.png",
  "security-agent": "/agents/security-agent.png",
  "security-auditor": "/agents/security-agent.png",
  "reviewer-agent": "/agents/reviewer-agent.png",
  "code-reviewer": "/agents/reviewer-agent.png",
  "release-manager": "/agents/architect-agent.png",
  "docs-agent": "/agents/docs-agent.png"
};

const AGENT_ACCENT_MAP: Record<string, string> = {
  "agentos-operator": "#9b7bff",
  "product-agent": "#5ce0c8",
  "architect-agent": "#6b9fff",
  "builder-agent": "#5fe4a1",
  "qa-agent": "#e8c76a",
  "security-agent": "#ff7d86",
  "reviewer-agent": "#ff9f6b",
  "docs-agent": "#7dd3fc"
};

export function agentAvatarUrl(agentId: string): string | undefined {
  return AGENT_AVATAR_MAP[agentId];
}

export function agentAccentColor(agentId: string): string | undefined {
  return AGENT_ACCENT_MAP[agentId];
}
