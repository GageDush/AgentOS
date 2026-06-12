import { loadDiscordGuildState } from "./bootstrap";
import { buildAgentEmbed } from "./embeds";
import type { AgentOsChannelKey } from "./layout";
import { STREAMLINED_LAYOUT } from "./layout";
import { sendAgentMessage } from "./messenger";
import { ROSTER_PERSONAS, personaDiscordName } from "./personas";
import { DiscordRestClient } from "./rest";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ChannelGuide = {
  agentId?: string;
  title: string;
  description: string;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footerHint?: string;
  actions?: Array<{ action: string; label: string; style: "primary" | "secondary"; emoji?: string }>;
};

export const CHANNEL_GUIDES: Partial<Record<AgentOsChannelKey, ChannelGuide>> = {
  rules: {
    agentId: "admin-agent",
    title: "Channel guide: #rules",
    description: "Server rules and safety policy for AgentOS HQ.",
    fields: [
      { name: "Purpose", value: "Read the rules before using AgentOS automation or approval gates.", inline: false },
      { name: "Policy", value: "Agents request elevated access through `#approvals`. Operators decide approve/deny.", inline: false },
      { name: "Roles", value: "`AgentOS Operator` · `AgentOS Approver` · `AgentOS Observer`", inline: false }
    ],
    footerHint: "Rules channel"
  },
  welcome: {
    agentId: "admin-agent",
    title: "Channel guide: #welcome",
    description: "Your onboarding hub for AgentOS HQ.",
    fields: [
      { name: "Start here", value: "Read the hub embed below for zone map, agent profiles, and Command Center links.", inline: false },
      { name: "Run pulse", value: "Click **Run pulse** on the hub embed — output appears in `#status` under **◈ OPS**.", inline: false },
      { name: "Commands", value: "`/agentos commands` · `/agentos status` · `/agentos chat`", inline: false }
    ],
    footerHint: "Onboarding hub"
  },
  announcements: {
    agentId: "release-manager",
    title: "Channel guide: #announcements",
    description: "Official AgentOS releases and downtime notices.",
    fields: [
      { name: "Purpose", value: "Release notes, planned downtime, and major capability changes.", inline: false },
      { name: "Not for", value: "Day-to-day chat, task intake, or approval requests — use `#general`, `#missions`, or `#approvals`.", inline: false }
    ],
    footerHint: "Announcements only"
  },
  status: {
    agentId: "admin-agent",
    title: "Channel guide: #status",
    description: "Live AgentOS telemetry and system pulse.",
    fields: [
      { name: "What posts here", value: "System pulse embeds, health snapshots, and `/agentos status` webhook output.", inline: false },
      { name: "Buttons", value: "**Refresh pulse** re-runs telemetry · **Mark seen** syncs operator ack.", inline: false },
      { name: "Tip", value: "After **Run pulse** in `#welcome`, check this channel for the new pulse message.", inline: false }
    ],
    footerHint: "Pulse channel",
    actions: [
      { action: "refresh_status", label: "Refresh pulse", style: "primary", emoji: "🛰️" },
      { action: "ack", label: "Mark seen", style: "secondary", emoji: "👁️" }
    ]
  },
  approvals: {
    agentId: "security-auditor",
    title: "Channel guide: #approvals",
    description: "Human-in-the-loop control gates for elevated agent actions.",
    fields: [
      { name: "What posts here", value: "Approval cards when an agent needs permission to run tools or escalate scope.", inline: false },
      { name: "Your actions", value: "**Approve once** · **Approve mission** · **Deny** · **Acknowledge**", inline: false },
      { name: "Slash fallback", value: "`/agentos approve id:...` · `/agentos deny id:...`", inline: false }
    ],
    footerHint: "Operator action required"
  },
  missions: {
    agentId: "builder-agent",
    title: "Channel guide: #missions",
    description: "Task intake and mission envelopes for AgentOS work.",
    fields: [
      { name: "Purpose", value: "Create and track tasks, mission runs, and work envelopes.", inline: false },
      { name: "Create work", value: "`/agentos task-create title:... description:...`", inline: false },
      { name: "Browse", value: "`/agentos tasks` · open forum posts · use **Open task** buttons on cards", inline: false }
    ],
    footerHint: "Mission board"
  },
  opsFeed: {
    agentId: "admin-agent",
    title: "Channel guide: #ops-feed",
    description: "Audit trail and operational signals in one stream.",
    fields: [
      { name: "What posts here", value: "Audit events, token usage signals, and worker activity (auto-posted from AgentOS).", inline: false },
      { name: "Slash", value: "`/agentos logs` · `/agentos tokens`", inline: false },
      { name: "Tip", value: "Read-only feed — react or ack on actionable cards in `#approvals` instead.", inline: false }
    ],
    footerHint: "Audit plane"
  },
  roundTable: {
    agentId: "admin-agent",
    title: "Channel guide: #round-table",
    description: "Round-table briefing — all agents chat in character.",
    fields: [
      { name: "Purpose", value: "Agents socialize, ask each other questions, and develop personality as `[Role] Name: message`.", inline: false },
      { name: "How", value: "Post any topic here, or use `/agentos briefing topic:...`", inline: false },
      {
        name: "Chat rooms",
        value: "Reserve `#chat-room-1`–`3` from here — e.g. \"I'll take chat room 2 with Brock\" or `/agentos reserve-room room:1 topic:...`. When a room closes, `[Admin] Ash` posts a summary here.",
        inline: false
      },
      { name: "Roster", value: "`[Admin] Ash` · `[Builder] Brock` · `[QA] Misty` · `[Security] Surge` · `[Release] Lance` · `[Quota] Bill`", inline: false }
    ],
    footerHint: "Briefing room"
  },
  chatRoom1: {
    agentId: "admin-agent",
    title: "Channel guide: #chat-room-1",
    description: "Focused side chat for 1–3 agents.",
    fields: [
      { name: "Reserve", value: "From `#round-table`: \"reserve chat room 1\" or `/agentos reserve-room room:1 topic:...`", inline: false },
      { name: "Use", value: "Post while the room is active — reserved agents reply in sequence as `[Role] Name: message`.", inline: false },
      { name: "Release", value: "Say \"release room\" or wait for idle timeout (30 min) / message limit. A summary is posted back to `#round-table`.", inline: false }
    ],
    footerHint: "Chat room 1"
  },
  chatRoom2: {
    agentId: "builder-agent",
    title: "Channel guide: #chat-room-2",
    description: "Focused side chat for 1–3 agents.",
    fields: [
      { name: "Reserve", value: "From `#round-table`: \"reserve chat room 2\" or `/agentos reserve-room room:2 topic:...`", inline: false },
      { name: "Use", value: "Post while the room is active — reserved agents reply in sequence.", inline: false },
      { name: "Release", value: "Say \"release room\" or wait for idle timeout (30 min) / message limit. A summary is posted back to `#round-table`.", inline: false }
    ],
    footerHint: "Chat room 2"
  },
  chatRoom3: {
    agentId: "qa-agent",
    title: "Channel guide: #chat-room-3",
    description: "Focused side chat for 1–3 agents.",
    fields: [
      { name: "Reserve", value: "From `#round-table`: \"reserve chat room 3\" or `/agentos reserve-room room:3 topic:...`", inline: false },
      { name: "Use", value: "Post while the room is active — reserved agents reply in sequence.", inline: false },
      { name: "Release", value: "Say \"release room\" or wait for idle timeout (30 min) / message limit. A summary is posted back to `#round-table`.", inline: false }
    ],
    footerHint: "Chat room 3"
  },
  cursor: {
    agentId: "agentos-operator",
    title: "Channel guide: #cursor",
    description: "Discord ↔ Cursor bridge — run prompts from Discord; Cursor replies here.",
    fields: [
      { name: "Access", value: "Only `DISCORD_OWNER_USER_ID` can view and post here.", inline: false },
      { name: "Usage", value: "Send any prompt — it runs in Cursor against the AgentOS repo on this machine.", inline: false },
      { name: "Commands", value: "`help` · `status` · `reset`", inline: false },
      { name: "Requires", value: "`CURSOR_API_KEY` in `.env` · `pnpm dev:api` with Discord gateway", inline: false }
    ],
    footerHint: "Cursor bridge"
  },
  operatorCommand: {
    agentId: "admin-agent",
    title: "Channel guide: #operator-command",
    description: "Private command lane for the server owner and AgentOS bot.",
    fields: [
      { name: "Access", value: "Only `DISCORD_OWNER_USER_ID` can view and post here.", inline: false },
      { name: "Commands", value: "`help` · `status` · `pulse` · `mission <title>` · `approve` / `deny` / `pause` / `resume`", inline: false },
      { name: "Chat", value: "Any other message routes to the Admin Agent LLM with mission context.", inline: false },
      {
        name: "Ready / busy",
        value: "Pinned **Operator lane status** + channel topic: 🟢 ready to send, 🟡 wait while Cursor is processing.",
        inline: false
      }
    ],
    footerHint: "Owner command lane"
  },
  general: {
    agentId: "admin-agent",
    title: "Channel guide: #general",
    description: "Direct operator chat with AgentOS.",
    fields: [
      { name: "Chat", value: "Type a normal message (no slash) and AgentOS replies when the API is running locally.", inline: false },
      { name: "Slash", value: "`/agentos chat message:your question here`", inline: false },
      { name: "Voice lounge", value: "Join the voice channel under **◈ LOUNGE** for standups — text ops stay here and in `#status`.", inline: false },
      { name: "Requires", value: "`pnpm dev` or **AgentOS Control → Start stack** on the operator machine.", inline: false }
    ],
    footerHint: "Neural link active"
  },
  voice: {
    agentId: "agentos-operator",
    title: "Channel guide: voice lounge",
    description: "Voice channel for standups and live ops (no text chat here).",
    fields: [
      { name: "Purpose", value: "Voice lounge, standups, and AFK when idle.", inline: false },
      { name: "Text ops", value: "Use `#general` for chat and `#status` for pulse while in voice.", inline: false }
    ],
    footerHint: "Voice lounge"
  }
};

function zoneMapField() {
  return {
    name: "Server map",
    value: [
      "**◈ START** — `#welcome` `#rules` `#announcements`",
      "**◈ OPS** — `#status` `#approvals` `#missions` `#ops-feed`",
      "**◈ BRIEFING** — `#round-table` `#chat-room-1` `#chat-room-2` `#chat-room-3`",
      "**◈ LOUNGE** — `#general` voice lounge"
    ].join("\n"),
    inline: false
  };
}

export async function postChannelGuides(options?: { includeZoneMap?: boolean }) {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!token || !guildId) {
    throw new Error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.");
  }

  const state = loadDiscordGuildState();
  if (!state?.channels) {
    throw new Error("Discord guild state not found. Run pnpm discord:restructure first.");
  }

  const client = new DiscordRestClient(token, guildId);
  const results: Array<{ channel: AgentOsChannelKey; ok: boolean; mode?: string; detail?: string }> = [];

  for (const key of Object.keys(CHANNEL_GUIDES) as AgentOsChannelKey[]) {
    const guide = CHANNEL_GUIDES[key];
    if (!guide) continue;

    const channelId = state.channels[key];
    if (!channelId) {
      results.push({ channel: key, ok: false, detail: "channel id missing from state" });
      continue;
    }

    const spec = STREAMLINED_LAYOUT[key];
    const fields = [...guide.fields];
    if (options?.includeZoneMap !== false && key === "welcome") {
      fields.unshift(zoneMapField());
    }
    if (key === "welcome") {
      fields.push({
        name: "Agent personas",
        value: ROSTER_PERSONAS.map((p) => personaDiscordName(p)).join("\n"),
        inline: false
      });
    }

    try {
      if (spec.type === 2) {
        results.push({
          channel: key,
          ok: true,
          mode: "skipped",
          detail: "Voice has no text chat; see #welcome server map for voice lounge info"
        });
        continue;
      }

      if (spec.type === 15) {
        const thread = await client.createForumThread(channelId, guide.title.slice(0, 100), {
          embeds: [
            buildAgentEmbed({
              agentId: guide.agentId,
              title: guide.title,
              description: guide.description,
              fields,
              tone: "info",
              footerHint: guide.footerHint
            })
          ]
        });
        results.push({ channel: key, ok: true, mode: "forum-thread", detail: thread.id });
        await sleep(400);
        continue;
      }

      const webhookChannels: AgentOsChannelKey[] = [
        "status",
        "approvals",
        "missions",
        "opsFeed",
        "operatorCommand",
        "cursor",
        "general",
        "roundTable",
        "chatRoom1",
        "chatRoom2",
        "chatRoom3"
      ];
      if (webhookChannels.includes(key)) {
        const sent = await sendAgentMessage({
          channel: key,
          agentId: guide.agentId,
          title: guide.title,
          description: guide.description,
          fields,
          tone: "info",
          footerHint: guide.footerHint,
          actions: guide.actions
        });
        if (!sent.ok) {
          throw new Error(`sendAgentMessage failed: ${sent.mode}`);
        }
        results.push({ channel: key, ok: true, mode: sent.mode, detail: sent.messageId });
      } else {
        const message = await client.createMessage(channelId, {
          embeds: [
            buildAgentEmbed({
              agentId: guide.agentId,
              title: guide.title,
              description: guide.description,
              fields,
              tone: "info",
              footerHint: guide.footerHint
            })
          ]
        });
        results.push({ channel: key, ok: true, mode: "message", detail: message.id });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      results.push({ channel: key, ok: false, detail });
    }

    await sleep(350);
  }

  return {
    posted: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results
  };
}
