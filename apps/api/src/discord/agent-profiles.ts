import {
  ASH_ADMIN_PROFILE,
  type AgentProfileCard,
  type AgentQuickAction,
  type AgentRichMessage,
  type AgentRichMessageScope,
  type AgentRichMessageStatus
} from "@agentos/shared";
import { resolveHttpAgentAvatarUrl } from "./agent-avatars";
import { resolvePersona, personaDiscordName, type AgentPersona } from "./personas";

const DEFAULT_CAPABILITIES: Record<string, string[]> = {
  "admin-agent": ASH_ADMIN_PROFILE.capabilities,
  "builder-agent": ["Implementation", "Refactoring", "Test Scaffolding", "Code Delivery"],
  "qa-agent": ["Verification", "Regression Checks", "Acceptance Criteria", "Quality Gates"],
  "security-auditor": ["Threat Review", "Policy Checks", "Risk Triage", "Sandbox Escalation"],
  "security-agent": ["Threat Review", "Policy Checks", "Risk Triage", "Sandbox Escalation"],
  "release-manager": ["Release Planning", "Change Control", "Deployment Coordination", "Rollback Readiness"],
  "quota-steward": ["Budget Routing", "Lane Selection", "Usage Guardrails", "Deferral Policy"]
};

const DEFAULT_PROFILE_TAGS: Record<string, string[]> = {
  "admin-agent": ASH_ADMIN_PROFILE.profileTags,
  "builder-agent": ["Builder Agent", "Delivery Lane", "Implementation"],
  "qa-agent": ["QA Agent", "Verification Lane", "Quality Gate"],
  "security-auditor": ["Security Agent", "Risk Lane", "Audit Gate"],
  "security-agent": ["Security Agent", "Risk Lane", "Audit Gate"],
  "release-manager": ["Release Agent", "Ship Lane", "Change Gate"],
  "quota-steward": ["Quota Agent", "Budget Lane", "Routing Gate"]
};

export function buildAgentProfileCard(persona: AgentPersona): AgentProfileCard {
  if (persona.agentId === ASH_ADMIN_PROFILE.agentId) {
    return ASH_ADMIN_PROFILE;
  }

  return {
    agentId: persona.agentId,
    displayName: persona.characterName,
    fullLabel: personaDiscordName(persona),
    jobTitle: persona.roleTitle,
    role: `AgentOS ${persona.roleTitle} Layer`,
    capabilities: DEFAULT_CAPABILITIES[persona.agentId] ?? [persona.roleTitle],
    profileTags: DEFAULT_PROFILE_TAGS[persona.agentId] ?? [`${persona.roleTitle} Agent`],
    color: persona.color
  };
}

export function buildAgentProfileCardFromId(agentId?: string): AgentProfileCard {
  return buildAgentProfileCard(resolvePersona(agentId));
}

export function buildAgentRichMessageInput(input: {
  agentId?: string;
  recipient: string;
  message: string;
  status?: AgentRichMessageStatus;
  scope?: AgentRichMessageScope;
  avatarUrl?: string;
  timestamp?: string | Date;
  responseId?: string;
  operationalStatus?: string;
  operatorRole?: string;
  clearanceLevel?: string;
  quickActions?: AgentQuickAction[];
}): AgentRichMessage {
  return {
    profile: buildAgentProfileCardFromId(input.agentId),
    recipient: input.recipient,
    message: input.message,
    status: input.status,
    scope: input.scope,
    avatarUrl: input.avatarUrl ?? resolveHttpAgentAvatarUrl(input.agentId),
    timestamp: input.timestamp,
    responseId: input.responseId,
    operationalStatus: input.operationalStatus,
    operatorRole: input.operatorRole,
    clearanceLevel: input.clearanceLevel,
    quickActions: input.quickActions
  };
}
