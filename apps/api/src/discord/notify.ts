import type { ApprovalRecord, AuditEvent, AgentTask } from "@agentos/shared";
import { listPendingApprovals, store } from "../store";
import { approvalActionButtons } from "./button-handlers";
import { isDiscordBotEnabled } from "./client";
import { hasNotifiedApproval, markApprovalNotified } from "./registry";
import { sendAgentMessage } from "./messenger";

export async function notifyApprovalGate(approval: ApprovalRecord) {
  if (!isDiscordBotEnabled() || hasNotifiedApproval(approval.id)) {
    return { ok: false, reason: "skipped" };
  }

  const result = await sendAgentMessage({
    channel: "approvals",
    kind: "approval",
    entityId: approval.id,
    agentId: approval.agentId,
    title: "Control gate request",
    description: "An agent is requesting elevated execution authority. Select a control action below.",
    tone: "warning",
    fields: [
      { name: "Tool", value: approval.tool, inline: true },
      { name: "Permission", value: approval.permissionLevel, inline: true },
      { name: "Summary", value: approval.inputSummary.slice(0, 900), inline: false },
      ...(approval.command ? [{ name: "Command", value: `\`${approval.command}\``, inline: false }] : [])
    ],
    footerHint: "Operator action required",
    actions: approvalActionButtons(approval)
  });

  if (result.ok) {
    markApprovalNotified(approval.id);
  }
  return result;
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
  return sendAgentMessage({
    channel: "opsFeed",
    kind: "audit",
    entityId: event.id,
    agentId: "admin-agent",
    title: "Audit signal",
    description: event.summary,
    tone: "info",
    fields: [
      { name: "Event", value: event.event, inline: true },
      { name: "Actor", value: event.actor, inline: true }
    ],
    footerHint: "Logged to AgentOS audit plane"
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
