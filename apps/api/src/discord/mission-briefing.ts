import { getPersistenceAdapter } from "@agentos/persistence";
import type { MissionBriefingReadyEvent } from "@agentos/runtime";
import { onMissionBriefingReady } from "@agentos/runtime";
import { isDiscordBotEnabled } from "./client";
import { resolveMissionMessageAgentId } from "./message-attribution";
import { sendAgentMessage } from "./messenger";
import { runRoundTableBriefing } from "./round-table";

export function lastExecutedAgentIdsFromAudit(runId?: string) {
  const audits = getPersistenceAdapter()
    .listAuditEvents()
    .filter((event) => event.event === "route.agents_executed" && (!runId || event.runId === runId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const latest = audits[0];
  const metadata = latest?.metadata as { executedAgentIds?: string[] } | undefined;
  return metadata?.executedAgentIds ?? [];
}

export function installMissionBriefingHook() {
  onMissionBriefingReady(async (event: MissionBriefingReadyEvent) => {
    if (!isDiscordBotEnabled()) return;
    if (process.env.AGENTOS_DISCORD_BRIEFING_ON_COMPLETE !== "true") return;
    if (!event.executedAgentIds.length) return;

    const topic =
      event.resultSummary?.slice(0, 400) ??
      event.synthesizerSummary?.slice(0, 400) ??
      `Mission ${event.missionId} debrief`;

    const attributedAgentId = resolveMissionMessageAgentId({
      executedAgentIds: event.executedAgentIds,
      preferSynthesizer: true
    });

    await sendAgentMessage({
      channel: "missions",
      kind: "task",
      entityId: event.runId,
      agentId: attributedAgentId,
      title: "Mission complete",
      description: event.synthesizerSummary?.slice(0, 900) ?? topic,
      tone: "success",
      fields: [
        { name: "Mission", value: `\`${event.missionId}\``, inline: true },
        { name: "Run", value: `\`${event.runId}\``, inline: true },
        { name: "Agents", value: event.executedAgentIds.slice(0, 6).join(", "), inline: false }
      ]
    });

    await runRoundTableBriefing(topic, event.operatorId ?? "system", "Operator", {
      agentIds: event.executedAgentIds,
      executedOnly: true,
      maxAgents: 8
    });
  });
}
