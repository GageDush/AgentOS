import { chooseAgentForMission } from "@agentos/orchestrator";
import { handleChatMessage, processRun } from "@agentos/runtime";
import { buildApiRuntimeOptions } from "../runtime-options";
import {
  createMission,
  createMissionRun,
  ensureSessionForMission,
  getMission,
  getMissionRun,
  store
} from "../store";
import { postSystemPulse } from "./notify";
import { runOperatorChat } from "./chat";
import { getDiscordRestClient } from "./client";
import { buildAgentEmbed } from "./embeds";
import { deliverRichAgentCard } from "./rich-card-delivery";
import { loadDiscordGuildState } from "./bootstrap";
import { formatOperatorLaneStatusLine } from "./operator-lane-status";

const HELP_TEXT = [
  "**Operator command lane** — private control surface.",
  "",
  "`help` — this message",
  "`status` — lane ready/busy, missions, runs, pending approvals",
  "`pulse` — post system pulse to #status",
  "`mission <title>` — create and start a mission",
  "`approve` / `deny` / `pause` / `resume` / `retry` — control active work",
  "`qa` / `security` / `release` — gate verbs on active run",
  "Anything else → Admin Agent LLM chat"
].join("\n");

function formatStatusSummary() {
  const pending = store.approvals.filter((a) => a.status === "pending").length;
  const runningMissions = store.missions.filter((m) => m.status === "running" || m.status === "awaiting_approval").length;
  const runningRuns = store.missionRuns.filter((r) => r.status === "running").length;
  const failed = store.missionRuns.filter((r) => r.status === "failed").length;
  return [
    formatOperatorLaneStatusLine(),
    `Pending approvals: **${pending}**`,
    `Active missions: **${runningMissions}**`,
    `Running runs: **${runningRuns}**`,
    `Failed runs: **${failed}**`,
    `Agents registered: **${store.agents.length}**`
  ].join("\n");
}

function normalizeCommand(content: string) {
  return content.trim().replace(/^[!/]+/, "").trim();
}

async function replyRichInChannel(
  channelId: string,
  recipient: string,
  message: string,
  status: { label: string; routing?: string },
  options?: { includeQuickActions?: boolean }
) {
  const webhook = loadDiscordGuildState()?.webhooks?.operatorCommand;
  if (webhook) {
    await deliverRichAgentCard(webhook, {
      agentId: "admin-agent",
      recipient,
      message: message.slice(0, 3900),
      status,
      cardChannel: "operator",
      operationalStatus: "ONLINE",
      operatorRole: "HUMAN OPERATOR",
      clearanceLevel: "LEVEL 4",
      includeQuickActions: options?.includeQuickActions ?? false
    });
    return { ok: true as const, mode: "webhook" as const };
  }
  const client = getDiscordRestClient();
  if (client) {
    await client.createMessage(channelId, {
      embeds: [buildAgentEmbed({ agentId: "admin-agent", title: status.label, description: message.slice(0, 3900), tone: "info" })]
    });
    return { ok: true as const, mode: "rest" as const };
  }
  return { ok: false as const, mode: "none" as const };
}

async function replyInChannel(
  channelId: string,
  recipient: string,
  message: string,
  statusLabel: string,
  options?: { includeQuickActions?: boolean; routing?: string }
) {
  return replyRichInChannel(
    channelId,
    recipient,
    message,
    { label: statusLabel, routing: options?.routing ?? "Operator command lane" },
    options
  );
}

export async function handleOperatorCommandMessage(
  channelId: string,
  content: string,
  operatorId: string,
  operatorLabel: string
) {
  const text = normalizeCommand(content);
  const lower = text.toLowerCase();

  if (!text) {
    return replyInChannel(channelId, operatorLabel, "Send `help` for available commands.", "Empty command");
  }

  if (lower === "help" || lower === "commands" || lower === "?") {
    return replyInChannel(channelId, operatorLabel, HELP_TEXT, "Operator commands");
  }

  if (lower === "status" || lower.startsWith("status ")) {
    return replyInChannel(channelId, operatorLabel, formatStatusSummary(), "Platform status");
  }

  if (lower === "pulse" || lower === "refresh") {
    const pulse = await postSystemPulse();
    return replyInChannel(
      channelId,
      operatorLabel,
      pulse.ok ? "System pulse posted to `#status`." : "Could not post pulse — check Discord config.",
      pulse.ok ? "Pulse sent" : "Pulse failed"
    );
  }

  if (lower.startsWith("mission ")) {
    const title = text.slice("mission ".length).trim();
    if (!title) {
      return replyInChannel(channelId, operatorLabel, "Usage: `mission <title>`", "Mission");
    }
    try {
      const mission = createMission({
        title,
        objective: `Created from Discord operator lane by ${operatorLabel}.`,
        prompt: title,
        requestedByOperatorId: operatorId,
        operatorId: chooseAgentForMission([], { title, objective: title, command: "" })?.id,
        status: "queued"
      });
      const session = ensureSessionForMission(mission);
      const run = createMissionRun({
        workspaceId: mission.workspaceId,
        missionId: mission.id,
        sessionId: session.id,
        requestedByOperatorId: operatorId,
        operatorId: mission.operatorId,
        provider: mission.provider,
        model: mission.model,
        status: "queued",
        commandPolicy: mission.commandPolicy,
        requestedCommand: mission.command
      });
      await processRun(run.id, buildApiRuntimeOptions({ sessionKey: run.id }));
      const latestMission = getMission(mission.id)!;
      const latestRun = getMissionRun(run.id)!;
      return replyInChannel(
        channelId,
        operatorLabel,
        `**${latestMission.title}**\nMission \`${latestMission.id}\`\nRun \`${latestRun.id}\` — status: ${latestRun.status}`,
        "Mission started"
      );
    } catch (error) {
      return replyInChannel(
        channelId,
        operatorLabel,
        error instanceof Error ? error.message : "Unknown error",
        "Mission failed"
      );
    }
  }

  const controlVerbs = [
    "approve",
    "deny",
    "pause",
    "resume",
    "retry",
    "qa",
    "security",
    "release",
    "summarize",
    "summary",
    "details"
  ];
  const isControl = controlVerbs.some((verb) => lower === verb || lower.startsWith(`${verb} `));

  if (isControl) {
    try {
      const threadId = `discord-operator-${channelId}`;
      const { intent, result } = await handleChatMessage(threadId, operatorId, text);
      return replyInChannel(
        channelId,
        operatorLabel,
        result.summary ?? intent.reason ?? "No summary returned.",
        `Control: ${intent.type}`
      );
    } catch (error) {
      return replyInChannel(
        channelId,
        operatorLabel,
        error instanceof Error ? error.message : "Unknown error",
        "Control failed"
      );
    }
  }

  try {
    const result = await runOperatorChat(text, operatorId, operatorLabel);
    return replyInChannel(
      channelId,
      operatorLabel,
      result.response.slice(0, 3500),
      "Response ready",
      { includeQuickActions: true, routing: `${result.provider} · ${result.model}` }
    );
  } catch (error) {
    return replyInChannel(
      channelId,
      operatorLabel,
      error instanceof Error ? error.message : "Unknown error",
      "Chat failed"
    );
  }
}
