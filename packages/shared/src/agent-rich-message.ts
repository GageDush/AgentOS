export type AgentRichQuickActionType =
  | "approve"
  | "deny"
  | "request_more_information"
  | "agent_received_response"
  | "agent_responding"
  | "agent_completed_task";

export type AgentQuickAction = {
  type: AgentRichQuickActionType;
  emoji: string;
  label: string;
  description?: string;
};

export type AgentProfileCard = {
  agentId: string;
  displayName: string;
  fullLabel: string;
  jobTitle: string;
  role: string;
  capabilities: string[];
  profileTags: string[];
  color: number;
};

export type AgentRichMessageStatus = {
  label: string;
  routing?: string;
};

export type AgentRichMessageScope = {
  missionId?: string;
  runId?: string;
  approvalRequestId?: string;
  correlationId?: string;
};

export type AgentRichMessage = {
  profile: AgentProfileCard;
  recipient: string;
  message: string;
  status?: AgentRichMessageStatus;
  quickActions?: AgentQuickAction[];
  scope?: AgentRichMessageScope;
  avatarUrl?: string;
  timestamp?: string | Date;
  responseId?: string;
  operationalStatus?: string;
  operatorRole?: string;
  clearanceLevel?: string;
};

export type DiscordCardReactionSpec = {
  emoji: string;
  command: string;
  label: string;
};

export const CURSOR_CARD_REACTIONS: DiscordCardReactionSpec[] = [
  { emoji: "✅", command: "ack", label: "Acknowledge" },
  { emoji: "📊", command: "status", label: "Status" },
  { emoji: "🔄", command: "reset", label: "Reset session" },
  { emoji: "❓", command: "help", label: "Help" },
  { emoji: "💬", command: "prompt", label: "Free-text reply" }
];

export const FREE_TEXT_REPLY_EMOJI = "💬";

export type DiscordEmbedAuthor = {
  name: string;
  icon_url?: string;
};

export type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type DiscordEmbed = {
  color: number;
  author?: DiscordEmbedAuthor;
  title?: string;
  description?: string;
  fields?: DiscordEmbedField[];
  thumbnail?: { url: string };
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
};

export type DiscordEmbedPayload = {
  embeds: DiscordEmbed[];
};

export const AGENT_RICH_QUICK_ACTIONS: AgentQuickAction[] = [
  { type: "approve", emoji: "✅", label: "Yes", description: "Yes / approve" },
  { type: "deny", emoji: "❌", label: "No", description: "No / deny" },
  {
    type: "request_more_information",
    emoji: "ℹ️",
    label: "More Info",
    description: "More information"
  },
  {
    type: "agent_received_response",
    emoji: "📥",
    label: "Response Received",
    description: "Agent received response"
  },
  {
    type: "agent_responding",
    emoji: "✍️",
    label: "Responding",
    description: "Agent responding to response"
  },
  {
    type: "agent_completed_task",
    emoji: "🏁",
    label: "Task Complete",
    description: "Agent completed task"
  }
];

export const AGENT_RICH_QUICK_ACTION_BY_TYPE: Record<AgentRichQuickActionType, AgentQuickAction> =
  AGENT_RICH_QUICK_ACTIONS.reduce(
    (acc, action) => {
      acc[action.type] = action;
      return acc;
    },
    {} as Record<AgentRichQuickActionType, AgentQuickAction>
  );

export const ASH_ADMIN_PROFILE: AgentProfileCard = {
  agentId: "admin-agent",
  displayName: "Ash",
  fullLabel: "[Admin] Ash",
  jobTitle: "Admin",
  role: "AgentOS Control Layer",
  capabilities: ["Mission Intake", "Routing", "Approval Coordination", "Human-in-the-loop Control"],
  profileTags: ["Admin Agent", "Control Plane", "Human Approval Gatekeeper"],
  color: 0xf1c40f
};

const DEFAULT_STATUS: AgentRichMessageStatus = {
  label: "Awaiting response",
  routing: "AgentOS Local"
};

const RESPONSE_ID_PREFIX: Record<string, string> = {
  "admin-agent": "ASH",
  "agentos-operator": "OPS",
  "builder-agent": "BRK",
  "qa-agent": "QA",
  "security-auditor": "SEC",
  "security-agent": "SEC",
  "release-manager": "REL"
};

function resolveTimestamp(input?: string | Date) {
  if (!input) return new Date().toISOString();
  return typeof input === "string" ? input : input.toISOString();
}

export function formatAgentResponseId(agentId: string, seed = Date.now()) {
  const prefix = RESPONSE_ID_PREFIX[agentId] ?? agentId.slice(0, 3).toUpperCase();
  const suffix = String(seed % 1000).padStart(3, "0");
  return `${prefix}-${suffix}`;
}

export function buildAgentDestination(sourceDisplayName: string, recipient: string) {
  return `[${sourceDisplayName} -> ${recipient}]`;
}

export function formatAgentRichQuickActions(actions: AgentQuickAction[] = AGENT_RICH_QUICK_ACTIONS) {
  const rowOne = actions
    .slice(0, 3)
    .map((action) => `${action.emoji} ${action.label}`)
    .join("  •  ");
  const rowTwo = actions
    .slice(3)
    .map((action) => `${action.emoji} ${action.label}`)
    .join("  •  ");
  return [rowOne, rowTwo].filter(Boolean).join("\n");
}

export function formatAgentRichCapabilities(profile: AgentProfileCard) {
  return profile.capabilities.map((capability) => `\`${capability}\``).join(" • ");
}

export function formatAgentRichProfileTags(profile: AgentProfileCard) {
  return profile.profileTags.map((tag) => `\`${tag}\``).join(" • ");
}

export function buildAgentRichEmbed(input: AgentRichMessage): DiscordEmbed {
  const profile = input.profile;
  const status = input.status ?? DEFAULT_STATUS;
  const quickActions = input.quickActions ?? AGENT_RICH_QUICK_ACTIONS;
  const responseId = input.responseId ?? formatAgentResponseId(profile.agentId);
  const avatarUrl = input.avatarUrl?.startsWith("http") ? input.avatarUrl : undefined;
  const operational = input.operationalStatus ?? "OPERATIONAL";
  const operatorRole = input.operatorRole ?? "HUMAN OPERATOR";
  const clearance = input.clearanceLevel ?? "LEVEL 4";
  const modules = profile.capabilities
    .slice(0, 6)
    .map((capability) => `\`▸ ${capability.toUpperCase()}\``)
    .join("  ");

  const description = [
    `Hey **${input.recipient}**,`,
    "",
    input.message.trim(),
    "",
    "_Reply with free text in this channel, use the buttons, or react below._"
  ].join("\n");

  return {
    color: profile.color,
    author: {
      name: `AgentOS HQ • ${profile.fullLabel}`,
      ...(avatarUrl ? { icon_url: avatarUrl } : {})
    },
    title: "🛡️ AGENT INTERACTION RESPONSE",
    thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
    description,
    fields: [
      {
        name: "🟢 ONLINE",
        value: operational,
        inline: true
      },
      {
        name: "👤 ROLE",
        value: operatorRole,
        inline: true
      },
      {
        name: "🛡️ CLEARANCE",
        value: clearance,
        inline: true
      },
      {
        name: "STATUS",
        value: `\`${status.label}\` • \`${status.routing ?? "AgentOS Local"}\``,
        inline: false
      },
      {
        name: "ACTIVE MODULES",
        value: modules || "`▸ MISSION CONTROL`",
        inline: false
      },
      {
        name: "QUICK COMMANDS",
        value: `${formatAgentRichQuickActions(quickActions)}\n${FREE_TEXT_REPLY_EMOJI} Type a message in-channel for free text`,
        inline: false
      }
    ],
    footer: {
      text: `SECURE. COORDINATE. DEPLOY. • RESPONSE ID: ${responseId} • AgentOS`
    },
    timestamp: resolveTimestamp(input.timestamp)
  };
}

export function buildAgentDiscordEmbed(input: AgentRichMessage): DiscordEmbedPayload {
  return { embeds: [buildAgentRichEmbed(input)] };
}

export function buildAgentPlainTextMessage(input: AgentRichMessage): string {
  const profile = input.profile;
  const quickActions = input.quickActions ?? AGENT_RICH_QUICK_ACTIONS;
  const responseId = input.responseId ?? formatAgentResponseId(profile.agentId);

  return [
    `**🛡️ AGENT INTERACTION RESPONSE**`,
    `**${profile.fullLabel}** • ${profile.jobTitle}`,
    "",
    `Hey **${input.recipient}**,`,
    input.message.trim(),
    "",
    `**Quick commands:** ${formatAgentRichQuickActions(quickActions)}`,
    `${FREE_TEXT_REPLY_EMOJI} Reply in-channel for free text`,
    "",
    `RESPONSE ID: ${responseId}`
  ].join("\n");
}

export function buildAshAdminRichMessage(recipient = "Gage", message = "Message Context/Request"): AgentRichMessage {
  return {
    profile: ASH_ADMIN_PROFILE,
    recipient,
    message,
    status: DEFAULT_STATUS
  };
}
