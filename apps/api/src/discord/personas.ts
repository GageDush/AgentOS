import { pngDataUri, type Rgba } from "./artwork";

export type AgentPersona = {
  agentId: string;
  /** Short role tag shown in brackets, e.g. Admin */
  roleTitle: string;
  /** Character display name, e.g. Ash */
  characterName: string;
  color: number;
  glyph: "plus" | "dot" | "eye";
  accent: Rgba;
};

export const AGENT_PERSONAS: AgentPersona[] = [
  {
    agentId: "admin-agent",
    roleTitle: "Admin",
    characterName: "Ash",
    color: 0xf1c40f,
    glyph: "plus",
    accent: [241, 196, 15, 255]
  },
  {
    agentId: "builder-agent",
    roleTitle: "Builder",
    characterName: "Brock",
    color: 0x3498db,
    glyph: "plus",
    accent: [52, 152, 219, 255]
  },
  {
    agentId: "qa-agent",
    roleTitle: "QA",
    characterName: "Misty",
    color: 0x2ecc71,
    glyph: "dot",
    accent: [46, 204, 113, 255]
  },
  {
    agentId: "security-auditor",
    roleTitle: "Security",
    characterName: "Surge",
    color: 0xe74c3c,
    glyph: "eye",
    accent: [231, 76, 60, 255]
  },
  {
    agentId: "security-agent",
    roleTitle: "Security",
    characterName: "Surge",
    color: 0xe74c3c,
    glyph: "eye",
    accent: [231, 76, 60, 255]
  },
  {
    agentId: "release-manager",
    roleTitle: "Release",
    characterName: "Lance",
    color: 0x8e44ad,
    glyph: "dot",
    accent: [142, 68, 173, 255]
  },
  {
    agentId: "quota-steward",
    roleTitle: "Quota",
    characterName: "Bill",
    color: 0xffb020,
    glyph: "dot",
    accent: [255, 176, 32, 255]
  },
  {
    agentId: "agentos-operator",
    roleTitle: "Operator",
    characterName: "Red",
    color: 0x00f5ff,
    glyph: "plus",
    accent: [0, 245, 255, 255]
  }
];

/** Agents that participate in the round-table briefing channel. */
export const ROUND_TABLE_AGENT_IDS = [
  "admin-agent",
  "builder-agent",
  "qa-agent",
  "security-auditor",
  "release-manager",
  "quota-steward"
] as const;

const personaByAgentId = new Map(AGENT_PERSONAS.map((persona) => [persona.agentId, persona]));

export const DEFAULT_PERSONA = AGENT_PERSONAS[0];

export function resolvePersona(agentId?: string) {
  if (!agentId) return DEFAULT_PERSONA;
  return personaByAgentId.get(agentId) ?? personaByAgentId.get(agentId.replace(/_/g, "-")) ?? DEFAULT_PERSONA;
}

export function personaDiscordName(persona: AgentPersona) {
  return `[${persona.roleTitle}] ${persona.characterName}`;
}

export function personaMessageLine(persona: AgentPersona, text: string) {
  return `${personaDiscordName(persona)}: ${text}`;
}

export function personaAvatarUrl(persona: AgentPersona) {
  return pngDataUri(128, persona.glyph, persona.accent);
}

export function personaEmbedAuthor(persona: AgentPersona) {
  return personaDiscordName(persona);
}

/** Member roles kept during legacy cleanup (exact names). */
export const KEEP_MEMBER_ROLE_NAMES = new Set([
  "AgentOS Operator",
  "AgentOS Approver",
  "AgentOS Observer",
  "Admin",
  "Gage"
]);

/** Legacy agent role names to remove or rename. */
export const LEGACY_AGENT_ROLE_NAMES = new Set([
  "Admin Agent",
  "Builder Agent",
  "QA Agent",
  "Security Agent",
  "Release Manager",
  "Admin AgentOS",
  "Builder AgentOS",
  "QA AgentOS",
  "Security AgentOS",
  "Release AgentOS",
  "Quota AgentOS",
  "Operator AgentOS",
  "[Admin AgentOS] (Jordan Reeves)",
  "[Builder AgentOS] (Marcus Chen)",
  "[QA AgentOS] (Priya Nair)",
  "[Security AgentOS] (Elena Vasquez)",
  "[Release AgentOS] (Samuel Ortiz)",
  "Systems Architect",
  "Operations Lead",
  "Moderator",
  "ClawBot",
  "Based",
  "Contributor",
  "Tester",
  "Researcher",
  "Designer",
  "Trusted",
  "Early Supporter",
  "Guest",
  "Read Only",
  "Verified",
  "Pending Verification",
  "Internal",
  "External",
  "Beta Access",
  "Dev Access",
  "Incident Access",
  "Announcements Only",
  "NurseJoy",
  "OfficerJenny",
  "Gary",
  "ProfessorOak",
  "Blue",
  "Erika",
  "Sabrina",
  "Blaine",
  "Giovanni",
  "Lorelei",
  "Daisy",
  "May",
  "Dawn",
  "Clemont",
  "Cynthia",
  "Builder"
]);

export type AgentPersonaRoleKey = "adminAgent" | "builderAgent" | "qaAgent" | "securityAgent" | "releaseAgent";

export const PERSONA_ROLE_KEYS: Record<AgentPersonaRoleKey, string> = {
  adminAgent: "admin-agent",
  builderAgent: "builder-agent",
  qaAgent: "qa-agent",
  securityAgent: "security-auditor",
  releaseAgent: "release-manager"
};

/** Legacy role names that map to a persona role when renaming. */
export const PERSONA_ROLE_LEGACY: Record<AgentPersonaRoleKey, string[]> = {
  adminAgent: ["Admin Agent", "[Admin AgentOS] (Jordan Reeves)"],
  builderAgent: ["Builder Agent", "Builder", "[Builder AgentOS] (Marcus Chen)"],
  qaAgent: ["QA Agent", "[QA AgentOS] (Priya Nair)"],
  securityAgent: ["Security Agent", "[Security AgentOS] (Elena Vasquez)"],
  releaseAgent: ["Release Manager", "[Release AgentOS] (Samuel Ortiz)"]
};

export const ROSTER_PERSONAS = [
  ...new Map(
    AGENT_PERSONAS.map((persona) => [`${persona.roleTitle}:${persona.characterName}`, persona])
  ).values()
];
