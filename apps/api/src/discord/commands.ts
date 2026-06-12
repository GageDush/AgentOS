import { searchMemories } from "@agentos/memory";
import { resolveApprovalDecision } from "@agentos/runtime";
import { findRepoRoot } from "@agentos/persistence";
import { evaluateQuotaSteward } from "@agentos/token-manager";
import {
  createTask,
  getDatabaseSnapshot,
  listPendingApprovals,
  store,
  usageSummary
} from "../store";
import { handleDiscordChatCommand } from "./chat";
import { AGENTOS_ROOT_COMMAND } from "./layout";
import { embedInteractionResponse } from "./messenger";
import { optionValue, parseAgentOsCommand, type ParsedAgentOsCommand } from "./parse";
import { notifyTaskCreated } from "./notify";
import { personaDiscordName, ROSTER_PERSONAS } from "./personas";
import { reserveChatRoom, type ChatRoomNumber } from "./chat-rooms";
import { runRoundTableBriefing } from "./round-table";

export async function handleSlashCommand(
  data: { name: string; options?: Array<{ name: string; value?: string; type?: number; options?: Array<{ name: string; value?: string }> }> },
  operatorLabel: string,
  operatorId = `discord-${operatorLabel}`
) {
  const parsed = parseAgentOsCommand(data);
  if (!parsed) {
    return embedInteractionResponse({
      title: "Unknown command",
      description: "Use `/agentos` to reach the AgentOS command plane.",
      tone: "danger",
      ephemeral: true
    });
  }

  return handleAgentOsSubcommand(parsed, operatorLabel, operatorId);
}

async function handleAgentOsSubcommand(
  parsed: ParsedAgentOsCommand,
  operatorLabel: string,
  operatorId: string
) {
  switch (parsed.subcommand) {
    case "chat": {
      const message = optionValue(parsed.options, "message");
      if (!message) {
        return embedInteractionResponse({
          title: "Missing message",
          description: "Provide a `message` to chat with AgentOS.",
          tone: "warning",
          ephemeral: true
        });
      }
      return handleDiscordChatCommand(message, operatorLabel, operatorId);
    }
    case "reserve-room": {
      const roomRaw = optionValue(parsed.options, "room");
      const topic = optionValue(parsed.options, "topic");
      const agentId = optionValue(parsed.options, "agent") ?? "admin-agent";
      const room = Number(roomRaw) as ChatRoomNumber;
      if (!roomRaw || !topic || room < 1 || room > 3) {
        return embedInteractionResponse({
          title: "Invalid reservation",
          description: "Provide `room` (1–3) and `topic` to reserve a chat room.",
          tone: "warning",
          ephemeral: true
        });
      }
      try {
        const result = await reserveChatRoom({
          room,
          reservedBy: agentId,
          topic,
          operatorId,
          operatorLabel
        });
        if (!result.ok) {
          return embedInteractionResponse({
            title: "Reservation failed",
            description: `Could not reserve chat room ${room} (${result.reason}).`,
            tone: "warning",
            ephemeral: true
          });
        }
        return embedInteractionResponse({
          agentId,
          title: "Chat room reserved",
          description: `Room ${room} is active in \`#chat-room-${room}\`. Post there to start the focused conversation.`,
          tone: "success",
          ephemeral: true
        });
      } catch (error) {
        return embedInteractionResponse({
          title: "Reservation failed",
          description: error instanceof Error ? error.message : "Unknown error.",
          tone: "danger",
          ephemeral: true
        });
      }
    }
    case "briefing": {
      const topic = optionValue(parsed.options, "topic");
      if (!topic) {
        return embedInteractionResponse({
          title: "Missing topic",
          description: "Provide a `topic` to start the round-table briefing in `#round-table`.",
          tone: "warning",
          ephemeral: true
        });
      }
      try {
        const result = await runRoundTableBriefing(topic, operatorId, operatorLabel);
        if (!result.ok) {
          return embedInteractionResponse({
            title: "Briefing unavailable",
            description: `Could not start briefing (${result.reason}). Run \`pnpm discord:restructure\` and keep the API running.`,
            tone: "warning",
            ephemeral: true
          });
        }
        return embedInteractionResponse({
          agentId: "admin-agent",
          title: "Briefing started",
          description: `Posted ${result.posts} agent replies in \`#round-table\`.`,
          tone: "success",
          ephemeral: true
        });
      } catch (error) {
        return embedInteractionResponse({
          title: "Briefing failed",
          description: error instanceof Error ? error.message : "Unknown error.",
          tone: "danger",
          ephemeral: true
        });
      }
    }
    case "commands": {
      const fields = AGENTOS_ROOT_COMMAND.options.map((command) => ({
        name: `/agentos ${command.name}`,
        value: command.description,
        inline: false
      }));
      return embedInteractionResponse({
        agentId: "admin-agent",
        title: "AgentOS commands",
        description: "Only `/agentos` commands are registered by the AgentOS bot. Type `/agentos` to browse subcommands.",
        fields,
        tone: "info",
        ephemeral: true
      });
    }
    case "status": {
      const database = getDatabaseSnapshot();
      const pending = database.approvals.filter((item) => item.status === "pending").length;
      const running = database.missionRuns.filter((item) => item.status === "running").length;
      const quota = evaluateQuotaSteward(store.usageEvents, findRepoRoot(process.cwd()), {
        cursorBillingDay: Number(process.env.AGENTOS_CURSOR_BILLING_DAY ?? 1)
      });
      return embedInteractionResponse({
        agentId: "admin-agent",
        title: "System status",
        description: "Live telemetry from the AgentOS control plane.",
        tone: "info",
        fields: [
          { name: "API", value: "online", inline: true },
          { name: "Discord", value: process.env.DISCORD_BOT_TOKEN ? "real" : "mock", inline: true },
          { name: "Provider", value: process.env.AGENTOS_MODEL_PROVIDER ?? "mock", inline: true },
          { name: "Pending approvals", value: `${pending}`, inline: true },
          { name: "Running missions", value: `${running}`, inline: true },
          { name: "Quota status", value: `${quota.status}`, inline: true },
          { name: "Queued tasks", value: `${database.tasks.filter((task) => task.status === "queued").length}`, inline: true }
        ],
        actions: [
          { action: "refresh_status", label: "Refresh pulse", style: "primary", emoji: "🛰️" },
          { action: "ack", label: "Mark seen", style: "secondary", emoji: "👁️" }
        ],
        ephemeral: false
      });
    }
    case "agents": {
      const fields = ROSTER_PERSONAS.map((persona) => ({
        name: personaDiscordName(persona),
        value: `\`${persona.agentId}\``,
        inline: true
      }));
      return embedInteractionResponse({
        agentId: "admin-agent",
        title: "Agent profiles",
        description: "Agents speak through these Discord personas.",
        fields,
        tone: "info",
        ephemeral: true
      });
    }
    case "tasks": {
      const fields = store.tasks.slice(0, 10).map((task) => ({
        name: task.title,
        value: `\`${task.id}\`\n${task.status}`,
        inline: true
      }));
      return embedInteractionResponse({
        agentId: "admin-agent",
        title: "Recent tasks",
        description: fields.length ? "Latest work envelopes in the queue." : "No tasks yet.",
        fields,
        tone: "info",
        ephemeral: true
      });
    }
    case "task-create": {
      const title = optionValue(parsed.options, "title");
      if (!title) {
        return embedInteractionResponse({
          title: "Missing title",
          description: "Provide a `title` option to create a task.",
          tone: "danger",
          ephemeral: true
        });
      }
      const description = optionValue(parsed.options, "description");
      const task = createTask({
        title,
        description: description ?? `Created from Discord by ${operatorLabel}.`,
        prompt: description ?? title
      });
      await notifyTaskCreated(task, operatorLabel);
      return embedInteractionResponse({
        agentId: "builder-agent",
        title: "Task created",
        description: "A new envelope was added to the AgentOS queue.",
        fields: [
          { name: "Title", value: task.title, inline: false },
          { name: "ID", value: `\`${task.id}\``, inline: true },
          { name: "Status", value: task.status, inline: true }
        ],
        tone: "success",
        actions: [
          { action: "task_details", targetId: task.id, label: "Open task", style: "primary", emoji: "📡" },
          { action: "ack", targetId: task.id, label: "Seen", style: "secondary", emoji: "👁️" }
        ],
        ephemeral: false
      });
    }
    case "approve": {
      const id = optionValue(parsed.options, "id");
      if (!id) {
        return embedInteractionResponse({
          title: "Missing approval id",
          description: "Provide an approval `id` option.",
          tone: "danger",
          ephemeral: true
        });
      }
      const result = await resolveApprovalDecision(id, "approved", "once", operatorId);
      return embedInteractionResponse({
        agentId: "release-manager",
        title: "Approval resolved",
        description: result.summary,
        fields: [{ name: "Approval", value: `\`${id}\``, inline: false }],
        tone: result.ok ? "success" : "warning",
        ephemeral: true
      });
    }
    case "deny": {
      const id = optionValue(parsed.options, "id");
      if (!id) {
        return embedInteractionResponse({
          title: "Missing approval id",
          description: "Provide an approval `id` option.",
          tone: "danger",
          ephemeral: true
        });
      }
      const result = await resolveApprovalDecision(id, "denied", undefined, operatorId);
      return embedInteractionResponse({
        agentId: "security-auditor",
        title: "Approval denied",
        description: result.summary,
        fields: [{ name: "Approval", value: `\`${id}\``, inline: false }],
        tone: "danger",
        ephemeral: true
      });
    }
    case "logs": {
      const fields = store.auditEvents.slice(0, 8).map((event) => ({
        name: event.createdAt,
        value: event.summary.slice(0, 120),
        inline: false
      }));
      return embedInteractionResponse({
        agentId: "admin-agent",
        title: "Audit stream",
        description: fields.length ? "Recent control-plane events." : "No audit events yet.",
        fields,
        tone: "info",
        ephemeral: true
      });
    }
    case "tokens": {
      const summary = usageSummary();
      const pending = listPendingApprovals().length;
      return embedInteractionResponse({
        agentId: "quota-steward",
        title: "Token budget",
        description: "Usage telemetry and budget posture.",
        fields: [
          { name: "Daily spend", value: `$${summary.dailySpend.toFixed(4)}`, inline: true },
          { name: "Monthly spend", value: `$${summary.monthlySpend.toFixed(4)}`, inline: true },
          { name: "Total tokens", value: `${summary.totalTokens}`, inline: true },
          { name: "Pending approvals", value: `${pending}`, inline: true }
        ],
        tone: "info",
        ephemeral: true
      });
    }
    case "memory-search": {
      const query = optionValue(parsed.options, "query");
      if (!query) {
        return embedInteractionResponse({
          title: "Missing query",
          description: "Provide a memory search `query` option.",
          tone: "danger",
          ephemeral: true
        });
      }
      const hits = searchMemories(store.memories, query).slice(0, 5);
      return embedInteractionResponse({
        agentId: "admin-agent",
        title: "Memory search",
        description: hits.length ? `Results for \`${query}\`.` : `No memory hits for \`${query}\`.`,
        fields: hits.map((hit) => ({
          name: hit.title,
          value: hit.content.slice(0, 200),
          inline: false
        })),
        tone: hits.length ? "info" : "warning",
        ephemeral: true
      });
    }
    default:
      return embedInteractionResponse({
        title: "Unknown subcommand",
        description: `Subcommand \`${parsed.subcommand}\` is not registered. Try \`/agentos commands\`.`,
        tone: "danger",
        ephemeral: true
      });
  }
}
