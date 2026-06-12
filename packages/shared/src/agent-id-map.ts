/**
 * Canonical AgentOS pipeline agent IDs and UI/Discord aliases.
 * Routing and executors MUST use resolveCanonicalAgentId().
 */
export const CANONICAL_AGENT_IDS = [
  "admin-agent",
  "task-classifier",
  "context-minimizer",
  "quota-steward",
  "planner-partitioner",
  "product-agent",
  "architect-agent",
  "repo-cartographer",
  "code-implementer",
  "systems-synthesizer",
  "qa-agent",
  "code-reviewer",
  "security-auditor",
  "release-manager",
  "frontend-ui-agent",
  "backend-service-agent",
  "database-migration-agent",
  "integration-broker",
  "docs-agent",
  "issue-intake-researcher",
  "memory-curator"
] as const;

export type CanonicalAgentId = (typeof CANONICAL_AGENT_IDS)[number];

/** UI / Discord / legacy IDs → canonical pipeline profile id */
export const AGENT_ID_ALIASES: Record<string, CanonicalAgentId | string> = {
  "builder-agent": "code-implementer",
  "security-agent": "security-auditor",
  "reviewer-agent": "code-reviewer",
  "agentos-operator": "admin-agent"
};

const DISPLAY_NAMES: Record<string, string> = {
  "admin-agent": "Admin Agent",
  "code-implementer": "Code Implementer",
  "builder-agent": "Builder Agent",
  "task-classifier": "Task Classifier",
  "context-minimizer": "Context Minimizer",
  "quota-steward": "Quota Steward",
  "planner-partitioner": "Planner",
  "product-agent": "Product Agent",
  "architect-agent": "Architect Agent",
  "repo-cartographer": "Repo Cartographer",
  "systems-synthesizer": "Systems Synthesizer",
  "qa-agent": "QA Agent",
  "code-reviewer": "Code Reviewer",
  "security-auditor": "Security Auditor",
  "security-agent": "Security Agent",
  "release-manager": "Release Manager",
  "frontend-ui-agent": "Frontend UI Agent",
  "backend-service-agent": "Backend Service Agent",
  "database-migration-agent": "Database Migration Agent",
  "integration-broker": "Integration Broker",
  "docs-agent": "Docs Agent",
  "issue-intake-researcher": "Issue Intake Researcher",
  "agentos-operator": "AgentOS Operator",
  "memory-curator": "Memory Curator"
};

export function resolveCanonicalAgentId(agentId?: string): string {
  if (!agentId) return "admin-agent";
  const normalized = agentId.replace(/_/g, "-");
  return AGENT_ID_ALIASES[normalized] ?? normalized;
}

export function resolveAgentDisplayName(agentId?: string): string {
  if (!agentId) return "Admin Agent";
  const canonical = resolveCanonicalAgentId(agentId);
  return DISPLAY_NAMES[agentId] ?? DISPLAY_NAMES[canonical] ?? canonical;
}

export function listExecutedAgentIdsFromMetadata(metadata?: Record<string, unknown>): string[] {
  const raw = metadata?.executedAgentIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
}

export function listExecutedAgentIdsFromAudits(
  audits: Array<{ event: string; actor: string; runId?: string; metadata?: Record<string, unknown> }>,
  runId?: string
): string[] {
  const bundled = audits.find(
    (audit) => audit.event === "route.agents_executed" && (!runId || audit.runId === runId)
  );
  const bundledIds = bundled?.metadata?.executedAgentIds;
  if (Array.isArray(bundledIds) && bundledIds.length > 0) {
    return bundledIds.filter((id): id is string => typeof id === "string");
  }

  const ids: string[] = [];
  for (const audit of audits) {
    if (runId && audit.runId !== runId) continue;
    if (audit.event === "agent.step_executed") {
      const canonical = resolveCanonicalAgentId(audit.actor);
      if (!ids.includes(canonical)) ids.push(canonical);
    }
  }
  return ids;
}
