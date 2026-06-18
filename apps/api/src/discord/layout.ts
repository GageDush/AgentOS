import {
  PERSONA_ROLE_KEYS,
  personaDiscordName,
  resolvePersona,
  ROSTER_PERSONAS,
  type AgentPersonaRoleKey
} from "./personas";

const HOUSE_AGENT_CHOICES = ROSTER_PERSONAS.map((persona) => ({
  name: personaDiscordName(persona),
  value: persona.agentId
}));

export const CATEGORY_START = "◈ START";
export const CATEGORY_OPS = "◈ OPS";
export const CATEGORY_BRIEFING = "◈ BRIEFING";
export const CATEGORY_NEIGHBORHOOD = "◈ NEIGHBORHOOD";
export const CATEGORY_LOUNGE = "◈ LOUNGE";

export type AgentOsChannelKey =
  | "rules"
  | "welcome"
  | "announcements"
  | "status"
  | "approvals"
  | "missions"
  | "opsFeed"
  | "operatorCommand"
  | "cursor"
  | "roundTable"
  | "chatRoom1"
  | "chatRoom2"
  | "chatRoom3"
  | "townSquare"
  | "socialLounge"
  | "general"
  | "voice";

export type AgentOsRoleKey = "operator" | "approver" | "observer" | AgentPersonaRoleKey;

function personaRoleSpec(key: AgentPersonaRoleKey) {
  const persona = resolvePersona(PERSONA_ROLE_KEYS[key]);
  return { name: personaDiscordName(persona), color: persona.color, hoist: true as const };
}

export const ROLE_SPECS: Record<AgentOsRoleKey, { name: string; color: number; hoist: boolean }> = {
  operator: { name: "AgentOS Operator", color: 0x00f5ff, hoist: true },
  approver: { name: "AgentOS Approver", color: 0x9b59ff, hoist: true },
  observer: { name: "AgentOS Observer", color: 0x95a5a6, hoist: false },
  adminAgent: personaRoleSpec("adminAgent"),
  builderAgent: personaRoleSpec("builderAgent"),
  qaAgent: personaRoleSpec("qaAgent"),
  securityAgent: personaRoleSpec("securityAgent"),
  releaseAgent: personaRoleSpec("releaseAgent"),
  quotaAgent: personaRoleSpec("quotaAgent"),
  plannerAgent: personaRoleSpec("plannerAgent"),
  reviewerAgent: personaRoleSpec("reviewerAgent")
};

export const STREAMLINED_LAYOUT: Record<
  AgentOsChannelKey,
  {
    name: string;
    category:
      | typeof CATEGORY_START
      | typeof CATEGORY_OPS
      | typeof CATEGORY_BRIEFING
      | typeof CATEGORY_NEIGHBORHOOD
      | typeof CATEGORY_LOUNGE;
    type: number;
    topic: string;
    legacyNames: string[];
  }
> = {
  rules: {
    name: "rules",
    category: CATEGORY_START,
    type: 0,
    topic: "AgentOS server rules and approval policy.",
    legacyNames: ["rules"]
  },
  welcome: {
    name: "welcome",
    category: CATEGORY_START,
    type: 0,
    topic: "Start here — hub embed, slash commands, and Command Center links.",
    legacyNames: ["welcome", "start-here", "server-guide", "faq", "onboarding", "agentos-commands", "bot-control", "commands"]
  },
  announcements: {
    name: "announcements",
    category: CATEGORY_START,
    type: 5,
    topic: "Official AgentOS releases and downtime notices.",
    legacyNames: ["announcements", "changelog"]
  },
  status: {
    name: "status",
    category: CATEGORY_OPS,
    type: 0,
    topic: "Live system pulse, health embeds, and /status output.",
    legacyNames: ["status", "status-dashboard", "agentos-status", "bot-status", "command-briefing"]
  },
  approvals: {
    name: "approvals",
    category: CATEGORY_OPS,
    type: 0,
    topic: "Human approval gates — interactive embed cards with action buttons.",
    legacyNames: ["approvals", "autonomy-gates", "agentos-approvals", "permission-requests"]
  },
  missions: {
    name: "missions",
    category: CATEGORY_OPS,
    type: 15,
    topic: "Task intake, active runs, and mission envelopes.",
    legacyNames: ["missions", "mission-board", "agentos-intake", "agent-requests", "agent-status", "agentos-pipeline", "queue-monitor"]
  },
  opsFeed: {
    name: "ops-feed",
    category: CATEGORY_OPS,
    type: 0,
    topic: "Audit trail, worker logs, and token budget alerts in one stream.",
    legacyNames: ["ops-feed", "audit-log", "agentos-audit", "agent-logs", "webhook-log", "model-routing", "agentos-tokens", "agentos-logs"]
  },
  operatorCommand: {
    name: "operator-command",
    category: CATEGORY_OPS,
    type: 0,
    topic: "Private operator command lane — owner + AgentOS bot only. Send commands or chat here.",
    legacyNames: ["operator-command", "command-lane", "owner-command", "operator-lane"]
  },
  cursor: {
    name: "cursor",
    category: CATEGORY_OPS,
    type: 0,
    topic: "Discord ↔ Cursor bridge — send prompts; Cursor replies in-channel against the AgentOS repo.",
    legacyNames: ["cursor", "cursor-chat", "cursor-bridge", "cursor-channel"]
  },
  roundTable: {
    name: "round-table",
    category: CATEGORY_BRIEFING,
    type: 0,
    topic: "Agent round-table — personas chat, ask questions, and develop personality.",
    legacyNames: ["round-table", "briefing", "agent-briefing", "roundtable", "command-briefing"]
  },
  chatRoom1: {
    name: "chat-room-1",
    category: CATEGORY_BRIEFING,
    type: 0,
    topic: "Focused 1–3 agent side chat — reserve from #round-table.",
    legacyNames: ["chat-room-1", "chatroom-1", "briefing-room-1"]
  },
  chatRoom2: {
    name: "chat-room-2",
    category: CATEGORY_BRIEFING,
    type: 0,
    topic: "Focused 1–3 agent side chat — reserve from #round-table.",
    legacyNames: ["chat-room-2", "chatroom-2", "briefing-room-2"]
  },
  chatRoom3: {
    name: "chat-room-3",
    category: CATEGORY_BRIEFING,
    type: 0,
    topic: "Focused 1–3 agent side chat — reserve from #round-table.",
    legacyNames: ["chat-room-3", "chatroom-3", "briefing-room-3"]
  },
  townSquare: {
    name: "town-square",
    category: CATEGORY_NEIGHBORHOOD,
    type: 0,
    topic: "Neighborhood plaza — house invites, visit announcements, and who's home.",
    legacyNames: ["town-square", "townsquare", "neighborhood", "plaza"]
  },
  socialLounge: {
    name: "social-lounge",
    category: CATEGORY_NEIGHBORHOOD,
    type: 0,
    topic: "Mixed agent hangout during downtime — small groups only, no mission tools.",
    legacyNames: ["social-lounge", "agent-lounge", "hangout"]
  },
  general: {
    name: "general",
    category: CATEGORY_LOUNGE,
    type: 0,
    topic: "Operator chat and quick questions.",
    legacyNames: ["general", "introductions", "questions"]
  },
  voice: {
    name: "voice",
    category: CATEGORY_LOUNGE,
    type: 2,
    topic: "Voice lounge and standups.",
    legacyNames: ["voice", "General Voice", "General", "voice-lounge", "standup"]
  }
};

export const AGENTOS_ROOT_COMMAND = {
  name: "agentos",
  description: "AgentOS command plane — status, chat, tasks, approvals, and memory.",
  dm_permission: false,
  options: [
    { type: 1, name: "chat", description: "Chat directly with the AgentOS LLM.", options: [{ name: "message", description: "Your message", type: 3, required: true }] },
    {
      type: 1,
      name: "briefing",
      description: "Start a round-table agent discussion in #round-table.",
      options: [{ name: "topic", description: "Topic or question for the agents", type: 3, required: true }]
    },
    {
      type: 1,
      name: "invite-house",
      description: "Invite guest agents to a house visit (announced in #town-square).",
      options: [
        {
          name: "host",
          description: "Hosting agent",
          type: 3,
          required: true,
          choices: HOUSE_AGENT_CHOICES
        },
        {
          name: "guest",
          description: "Guest agent",
          type: 3,
          required: true,
          choices: HOUSE_AGENT_CHOICES
        },
        { name: "topic", description: "Visit topic", type: 3, required: true },
        {
          name: "duration",
          description: "Visit duration (minutes)",
          type: 4,
          required: false,
          choices: [
            { name: "30 minutes", value: "30" },
            { name: "45 minutes", value: "45" },
            { name: "60 minutes", value: "60" }
          ]
        }
      ]
    },
    {
      type: 1,
      name: "end-visit",
      description: "End an active house visit and save notes to the host wiki journal.",
      options: [
        {
          name: "host",
          description: "Host agent (optional if only one visit is active)",
          type: 3,
          required: false,
          choices: HOUSE_AGENT_CHOICES
        }
      ]
    },
    {
      type: 1,
      name: "reserve-room",
      description: "Reserve a focused chat room (1–3) under BRIEFING.",
      options: [
        {
          name: "room",
          description: "Chat room number (1, 2, or 3)",
          type: 4,
          required: true,
          choices: [
            { name: "Chat room 1", value: "1" },
            { name: "Chat room 2", value: "2" },
            { name: "Chat room 3", value: "3" }
          ]
        },
        { name: "topic", description: "Topic or context for the side conversation", type: 3, required: true },
        {
          name: "agent",
          description: "Reserving agent (defaults to Admin)",
          type: 3,
          required: false,
          choices: [
            { name: "[Admin] Ash", value: "admin-agent" },
            { name: "[Builder] Brock", value: "builder-agent" },
            { name: "[QA] Misty", value: "qa-agent" },
            { name: "[Security] Surge", value: "security-auditor" },
            { name: "[Release] Lance", value: "release-manager" },
            { name: "[Quota] Bill", value: "quota-steward" }
          ]
        }
      ]
    },
    { type: 1, name: "commands", description: "Show AgentOS slash commands." },
    { type: 1, name: "status", description: "Show AgentOS system health and feature flags." },
    { type: 1, name: "agents", description: "List configured AgentOS agents." },
    { type: 1, name: "tasks", description: "List recent AgentOS tasks." },
    {
      type: 1,
      name: "task-create",
      description: "Create a new AgentOS task.",
      options: [
        { name: "title", description: "Task title", type: 3, required: true },
        { name: "description", description: "Task description", type: 3, required: false }
      ]
    },
    {
      type: 1,
      name: "approve",
      description: "Approve a pending AgentOS gate.",
      options: [{ name: "id", description: "Approval id", type: 3, required: true }]
    },
    {
      type: 1,
      name: "deny",
      description: "Deny a pending AgentOS gate.",
      options: [{ name: "id", description: "Approval id", type: 3, required: true }]
    },
    { type: 1, name: "logs", description: "Show recent AgentOS audit events." },
    { type: 1, name: "tokens", description: "Show token usage and budget summary." },
    {
      type: 1,
      name: "memory-search",
      description: "Search AgentOS memory archive.",
      options: [{ name: "query", description: "Search query", type: 3, required: true }]
    }
  ]
} as const;

// Backward-compatible alias used during migration
export const AGENTOS_CATEGORY_NAME = CATEGORY_OPS;
