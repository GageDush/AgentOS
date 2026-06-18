import { pngDataUri } from "./artwork";
import { resolvePersona, type AgentPersona } from "./personas";

/** PNG filenames under apps/api/public/agents (served at /media/agents/). */
const AGENT_AVATAR_FILES: Record<string, string> = {
  "admin-agent": "admin-agent.png",
  "agentos-operator": "agentos-operator.png",
  "builder-agent": "builder-agent.png",
  "code-implementer": "builder-agent.png",
  "qa-agent": "qa-agent.png",
  "security-auditor": "security-agent.png",
  "security-agent": "security-agent.png",
  "release-manager": "release-manager.png",
  "quota-steward": "quota-steward.png",
  "product-agent": "product-agent.png",
  "architect-agent": "architect-agent.png",
  "reviewer-agent": "reviewer-agent.png",
  "code-reviewer": "reviewer-agent.png",
  "docs-agent": "docs-agent.png",
  "systems-synthesizer": "systems-synthesizer.png",
  "task-classifier": "task-classifier.png",
  "planner-partitioner": "planner-partitioner.png",
  "issue-intake-researcher": "issue-intake-researcher.png",
  "context-minimizer": "context-minimizer.png"
};

function normalizeBaseUrl(raw?: string) {
  return raw?.trim().replace(/\/$/, "");
}

/**
 * Public HTTPS base for Discord avatar/icon URLs.
 * Discord cannot fetch localhost or data URIs — only stable HTTPS endpoints.
 */
export function discordAgentAvatarBaseUrl(): string | undefined {
  const candidates = [
    normalizeBaseUrl(process.env.AGENTOS_DISCORD_AVATAR_BASE_URL),
    normalizeBaseUrl(process.env.AGENTOS_API_BASE_URL)
      ? `${normalizeBaseUrl(process.env.AGENTOS_API_BASE_URL)}/media/agents`
      : undefined,
    normalizeBaseUrl(process.env.AGENTOS_PUBLIC_APP_URL)
      ? `${normalizeBaseUrl(process.env.AGENTOS_PUBLIC_APP_URL)}/agents`
      : undefined,
    normalizeBaseUrl(process.env.DEPLOYMENT_URL)
      ? `${normalizeBaseUrl(process.env.DEPLOYMENT_URL)}/agents`
      : undefined
  ];

  for (const candidate of candidates) {
    if (candidate?.startsWith("https://")) {
      return candidate;
    }
  }
  return undefined;
}

/** Base for local API media routes (dev / health checks). */
export function publicAgentMediaBaseUrl(): string | undefined {
  const api = normalizeBaseUrl(process.env.AGENTOS_API_BASE_URL);
  if (api) return api;
  if (process.env.NODE_ENV !== "production") {
    const port = process.env.AGENTOS_API_PORT ?? "8787";
    return `http://127.0.0.1:${port}`;
  }
  return undefined;
}

export function agentAvatarFileName(agentId?: string): string | undefined {
  const persona = resolvePersona(agentId);
  return AGENT_AVATAR_FILES[persona.agentId];
}

export function resolveDiscordAgentAvatarUrl(agentId?: string): string | undefined {
  const file = agentAvatarFileName(agentId);
  const base = discordAgentAvatarBaseUrl();
  if (!file || !base) return undefined;
  return `${base}/${file}`;
}

export function resolveAgentAvatarUrl(agentId?: string): string {
  return resolveDiscordAgentAvatarUrl(agentId) ?? personaAvatarDataUri(resolvePersona(agentId));
}

export function resolveHttpAgentAvatarUrl(agentId?: string): string | undefined {
  return resolveDiscordAgentAvatarUrl(agentId);
}

export function personaAvatarDataUri(persona: AgentPersona) {
  return pngDataUri(128, persona.glyph, persona.accent);
}
