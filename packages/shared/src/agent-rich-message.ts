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
};

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

function resolveTimestamp(input?: string | Date) {
  if (!input) return new Date().toISOString();
  return typeof input === "string" ? input : input.toISOString();
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
  const destination = buildAgentDestination(profile.displayName, input.recipient);
  const capabilityLine = profile.capabilities.join(" • ");

  const description = [
    `**${profile.jobTitle}**`,
    `${profile.role} • ${capabilityLine}`,
    "",
    `**Destination:** \`${destination}\``,
    `> "${input.message.trim()}"`
  ].join("\n");

  return {
    color: profile.color,
    author: {
      name: profile.fullLabel,
      ...(input.avatarUrl?.startsWith("http") ? { icon_url: input.avatarUrl } : {})
    },
    title: profile.displayName,
    description,
    fields: [
      {
        name: "Profile",
        value: formatAgentRichProfileTags(profile),
        inline: false
      },
      {
        name: "Status",
        value: `\`${status.label}\``,
        inline: true
      },
      {
        name: "Routing",
        value: `\`${status.routing ?? "AgentOS Local"}\``,
        inline: true
      },
      {
        name: "Available Responses",
        value: formatAgentRichQuickActions(quickActions),
        inline: false
      }
    ],
    footer: {
      text: `AgentOS • ${profile.jobTitle} Control Message`
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
  const destination = buildAgentDestination(profile.displayName, input.recipient);

  return [
    `**${profile.fullLabel}**`,
    `*${profile.jobTitle} • ${profile.role}*`,
    formatAgentRichCapabilities(profile),
    "",
    `**Destination:** \`${destination}\``,
    `> "${input.message.trim()}"`,
    "",
    "**Respond:**",
    formatAgentRichQuickActions(quickActions)
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
