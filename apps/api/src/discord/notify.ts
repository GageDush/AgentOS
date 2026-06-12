import type { ApprovalRecord, AuditEvent, AgentTask } from "@agentos/shared";
import { listPendingApprovals, store } from "../store";
import { loadDiscordGuildState } from "./bootstrap";
import { isDiscordBotEnabled } from "./client";
import { hasNotifiedApproval, markApprovalNotified } from "./registry";
import { sendAgentMessage } from "./messenger";
import { postPersonaRichMessage } from "./webhook-post";

function approvalsWebhook() {
  return loadDiscordGuildState()?.webhooks?.approvals;
}

function approvalRichScope(approval: ApprovalRecord) {
  return {
    approvalRequestId: approval.id,
    ...(approval.missionId ? { missionId: approval.missionId } : {}),
    ...(approval.runId ? { runId: approval.runId } : {}),
    ...(approval.correlationId ? { correlationId: approval.correlationId } : {})
  };
}

function buildApprovalGateMessage(approval: ApprovalRecord) {
  const lines = [
    "An agent is requesting elevated execution authority.",
    "",
    `**Tool:** \`${approval.tool}\``,
    `**Permission:** \`${approval.permissionLevel}\``,
    ...(approval.command ? [`**Command:** \`${approval.command}\``] : []),
    "",
    approval.inputSummary.slice(0, 900)
  ];
  return lines.join("\n");
}

export async function notifyApprovalGate(approval: ApprovalRecord) {
  if (!isDiscordBotEnabled() || hasNotifiedApproval(approval.id)) {
    return { ok: false as const, reason: "skipped" };
  }

  const webhook = approvalsWebhook();
  if (!webhook) {
    return { ok: false as const, reason: "no-webhook" };
  }

  const scope = approvalRichScope(approval);
  const richInput = {
    agentId: "admin-agent" as const,
    recipient: "Operator",
    message: buildApprovalGateMessage(approval),
    status: { label: "Control gate request", routing: "AgentOS Local" as const },
    scope
  };
  const message = await postPersonaRichMessage(webhook, {
    ...richInput,
    cardChannel: "approvals",
    registryKind: "approval",
    entityId: approval.id,
    operationalStatus: "GATE OPEN",
    operatorRole: "HUMAN OPERATOR",
    clearanceLevel: "LEVEL 4"
  });

  markApprovalNotified(approval.id);
  return {
    ok: true as const,
    mode: "webhook" as const,
    messageId: message.id,
    channelId: message.channel_id
  };
}

export function queueDiscordApproval(approval: ApprovalRecord) {
  void notifyApprovalGate(approval).catch(() => undefined);
}

export async function syncPendingApprovalsToDiscord() {
  const pending = listPendingApprovals();
  const results = [];
  for (const approval of pending.slice(0, 10)) {
    results.push(await notifyApprovalGate(approval));
  }
  return { synced: results.filter((result) => result.ok).length, attempted: results.length };
}

export async function notifyTaskCreated(task: AgentTask, operatorLabel: string) {
  return sendAgentMessage({
    channel: "missions",
    kind: "task",
    entityId: task.id,
    agentId: "admin-agent",
    title: "Task envelope created",
    description: `New work item registered from ${operatorLabel}.`,
    tone: "info",
    lane: "Missions",
    fields: [
      { name: "Task", value: task.title, inline: false },
      { name: "Status", value: task.status, inline: true },
      { name: "ID", value: `\`${task.id}\``, inline: true }
    ],
    actions: [
      { action: "task_details", targetId: task.id, label: "Open task", style: "primary", emoji: "📡" },
      { action: "ack", targetId: task.id, label: "Seen", style: "secondary", emoji: "👁️" }
    ]
  });
}

export async function notifyAuditEvent(event: AuditEvent) {
  const gateFailed = event.event.includes("gate") && event.event.includes("fail");
  return sendAgentMessage({
    channel: "opsFeed",
    kind: "audit",
    entityId: event.id,
    agentId: event.actor,
    title: gateFailed ? "Gate failed" : "Audit signal",
    description: event.summary,
    tone: gateFailed ? "danger" : "info",
    lane: "Ops Feed",
    fields: [
      { name: "Event", value: event.event, inline: true },
      { name: "Actor", value: event.actor, inline: true },
      ...(event.missionId ? [{ name: "Mission", value: event.missionId, inline: false as const }] : [])
    ],
    footerHint: "Ops Feed"
  });
}

export async function postSystemPulse() {
  const pending = store.approvals.filter((item) => item.status === "pending").length;
  const running = store.missionRuns.filter((item) => item.status === "running").length;
  return sendAgentMessage({
    channel: "status",
    kind: "status",
    agentId: "admin-agent",
    title: "System pulse",
    description: "AgentOS telemetry stream is online.",
    tone: "info",
    lane: "Status",
    fields: [
      { name: "Pending approvals", value: `${pending}`, inline: true },
      { name: "Running missions", value: `${running}`, inline: true },
      { name: "Agents online", value: `${store.agents.length}`, inline: true }
    ],
    actions: [
      { action: "refresh_status", label: "Refresh pulse", style: "primary", emoji: "🛰️" },
      { action: "ack", label: "Mark seen", style: "secondary", emoji: "👁️" }
    ]
  });
}
