import type { AuditEvent, UsageEvent } from "@agentos/shared";
import { loadDiscordGuildState } from "./bootstrap";
import { isDiscordBotEnabled } from "./client";
import { hasNotifiedOutbox, markNotifiedOutbox } from "./registry";
import { resolveMissionMessageAgentId } from "./message-attribution";
import { postPersonaWebhookMessage } from "./webhook-post";

function opsFeedWebhook() {
  return loadDiscordGuildState()?.webhooks?.opsFeed;
}

function actorToAgentId(actor: string, eventName: string) {
  const haystack = `${actor} ${eventName}`.toLowerCase();
  if (haystack.includes("security")) return "security-auditor";
  if (haystack.includes("token") || haystack.includes("quota") || haystack.includes("budget")) return "quota-steward";
  if (haystack.includes("builder") || haystack.includes("task")) return "builder-agent";
  if (haystack.includes("qa") || haystack.includes("test")) return "qa-agent";
  if (haystack.includes("release") || haystack.includes("approve")) return "release-manager";
  if (haystack.includes("llm") || haystack.includes("chat")) return "admin-agent";
  return "admin-agent";
}

function isGateFailureEvent(eventName: string) {
  return /^gate\.[a-z_]+_failed$/.test(eventName);
}

export async function dispatchAuditToDiscord(event: AuditEvent) {
  if (!isDiscordBotEnabled()) return { ok: false, reason: "disabled" };
  if (hasNotifiedOutbox("audit", event.id)) return { ok: false, reason: "duplicate" };

  const webhook = opsFeedWebhook();
  if (!webhook) return { ok: false, reason: "no-webhook" };

  const gateFailed = isGateFailureEvent(event.event);
  const metadata = event.metadata as { executedAgentIds?: string[]; report?: { agent?: string } } | undefined;
  const agentId =
    event.event === "route.agents_executed"
      ? resolveMissionMessageAgentId({
          executedAgentIds: metadata?.executedAgentIds,
          preferSynthesizer: true
        })
      : event.event === "agent.step_executed" && metadata?.report?.agent
        ? metadata.report.agent
        : actorToAgentId(event.actor, event.event);
  await postPersonaWebhookMessage(webhook, {
    agentId,
    title: gateFailed ? "Gate failed" : "Audit signal",
    description: event.summary,
    tone: gateFailed ? "danger" : "info",
    fields: [
      { name: "Event", value: event.event, inline: true },
      { name: "Actor", value: event.actor, inline: true },
      ...(event.missionId ? [{ name: "Mission", value: `\`${event.missionId}\``, inline: true }] : [])
    ],
    footerHint: "Audit plane"
  });

  markNotifiedOutbox("audit", event.id);
  return { ok: true };
}

export async function dispatchUsageToDiscord(event: UsageEvent) {
  if (!isDiscordBotEnabled()) return { ok: false, reason: "disabled" };
  if (hasNotifiedOutbox("usage", event.id)) return { ok: false, reason: "duplicate" };

  const webhook = opsFeedWebhook();
  if (!webhook) return { ok: false, reason: "no-webhook" };

  await postPersonaWebhookMessage(webhook, {
    agentId: event.agentId ?? "quota-steward",
    title: "Token usage event",
    description: "Budget telemetry recorded from the AgentOS control plane.",
    tone: event.estimatedCostUsd > 0 ? "warning" : "info",
    fields: [
      { name: "Provider", value: event.provider, inline: true },
      { name: "Model", value: event.model, inline: true },
      { name: "Tokens", value: `${event.totalTokens}`, inline: true },
      { name: "Cost", value: `$${event.estimatedCostUsd.toFixed(4)}`, inline: true }
    ],
    footerHint: "Token plane"
  });

  markNotifiedOutbox("usage", event.id);
  return { ok: true };
}

export function queueDiscordAudit(event: AuditEvent) {
  void dispatchAuditToDiscord(event).catch(() => undefined);
}

export function queueDiscordUsage(event: UsageEvent) {
  void dispatchUsageToDiscord(event).catch(() => undefined);
}
