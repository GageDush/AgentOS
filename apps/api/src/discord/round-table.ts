import { getProviderId, providers } from "../providers";
import { addAudit, addUsageEvent } from "../store";
import { loadDiscordGuildState } from "./bootstrap";
import { isDiscordBotEnabled } from "./client";
import {
  personaDiscordName,
  personaMessageLine,
  resolvePersona,
  ROUND_TABLE_AGENT_IDS
} from "./personas";
import { tryReserveFromRoundTableMessage } from "./chat-rooms";
import { postPersonaRichMessage } from "./webhook-post";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rosterSummary() {
  return ROUND_TABLE_AGENT_IDS.map((id) => personaDiscordName(resolvePersona(id))).join(", ");
}

function recipientLabel(operatorLabel: string) {
  return operatorLabel.replace(/^@/, "").trim() || "Operator";
}

function roundTableStatus(label: string) {
  return { label, routing: "AgentOS Local" as const };
}

export async function runRoundTableBriefing(
  prompt: string,
  operatorId: string,
  operatorLabel: string,
  options?: { agentIds?: string[]; maxAgents?: number }
) {
  if (!isDiscordBotEnabled()) {
    return { ok: false as const, reason: "disabled" };
  }

  const webhook = loadDiscordGuildState()?.webhooks?.roundTable;
  if (!webhook) {
    return { ok: false as const, reason: "no-round-table-webhook" };
  }

  const agentIds = (options?.agentIds ?? ROUND_TABLE_AGENT_IDS).slice(0, options?.maxAgents ?? 6);
  const provider = providers[getProviderId()];
  const transcript: string[] = [];
  const posts: Array<{ agentId: string; messageId: string }> = [];

  await postPersonaRichMessage(webhook, {
    agentId: "admin-agent",
    recipient: recipientLabel(operatorLabel),
    message: `Briefing opened. Topic: ${prompt.slice(0, 500)}`,
    status: roundTableStatus("Briefing opened"),
    includeQuickActions: false
  });

  await tryReserveFromRoundTableMessage(prompt, "admin-agent", prompt, operatorId, operatorLabel);

  for (const agentId of agentIds) {
    const persona = resolvePersona(agentId);
    const peers = rosterSummary();
    const llmPrompt = [
      `You are ${personaDiscordName(persona)} in the AgentOS round-table briefing room.`,
      `Other agents present: ${peers}.`,
      `An operator (${operatorLabel}) said: "${prompt}"`,
      transcript.length ? `Discussion so far:\n${transcript.join("\n")}` : "No agent replies yet.",
      "Reply in 1-3 conversational sentences in character. Socialize, ask a peer a question, or add a useful take.",
      "Do not prefix your reply with your name or brackets."
    ].join("\n\n");

    const result = await provider.chat({
      prompt: llmPrompt,
      agentId,
      saveMemory: false
    });

    const line = personaMessageLine(persona, result.response.trim());
    transcript.push(line);

    const message = await postPersonaRichMessage(webhook, {
      agentId,
      recipient: recipientLabel(operatorLabel),
      message: result.response.trim(),
      status: roundTableStatus("Round-table reply"),
    includeQuickActions: false
  });
    posts.push({ agentId, messageId: message.id });

    await tryReserveFromRoundTableMessage(result.response.trim(), agentId, prompt, operatorId, operatorLabel);

    addUsageEvent({
      provider: result.provider,
      model: result.model,
      promptTokens: Math.ceil(llmPrompt.length / 4),
      completionTokens: Math.ceil(result.response.length / 4),
      totalTokens: Math.ceil((llmPrompt.length + result.response.length) / 4),
      estimatedCostUsd: 0,
      agentId,
      runId: `discord-briefing-${Date.now()}`
    });

    await sleep(900);
  }

  addAudit("discord.briefing.completed", operatorId, `Round-table briefing by ${operatorLabel}.`);
  return { ok: true as const, posts: posts.length, transcript };
}
