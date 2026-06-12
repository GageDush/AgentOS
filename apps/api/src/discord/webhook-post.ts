import type { ActionButtonSpec } from "./components";
import { buildActionRows } from "./components";
import { buildAgentEmbed, type AgentEmbedInput } from "./embeds";
import { personaAvatarUrl, personaDiscordName, personaMessageLine, resolvePersona } from "./personas";
import { buildAgentDiscordEmbed, type AgentRichMessageScope, type AgentRichMessageStatus } from "@agentos/shared";
import { buildAgentRichMessageInput } from "./agent-profiles";
import { buildRichQuickActionRows } from "./rich-action-buttons";
import { listPendingApprovals } from "../store";

export async function postWebhookPayload(
  webhookUrl: string,
  payload: Record<string, unknown>
) {
  const url = webhookUrl.includes("?") ? webhookUrl : `${webhookUrl}?wait=true`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Webhook post failed (${response.status}): ${detail}`);
  }
  return (await response.json()) as { id: string; channel_id: string };
}

export async function postPersonaWebhookMessage(
  webhookUrl: string,
  input: AgentEmbedInput & { actions?: ActionButtonSpec[] }
) {
  const persona = resolvePersona(input.agentId);
  const embed = buildAgentEmbed({ ...input, agentName: personaDiscordName(persona) });
  const components = input.actions?.length ? buildActionRows(input.actions) : undefined;
  const avatarUrl = personaAvatarUrl(persona);

  return postWebhookPayload(webhookUrl, {
    username: personaDiscordName(persona),
    ...(avatarUrl.startsWith("http") ? { avatar_url: avatarUrl } : {}),
    embeds: [embed],
    ...(components ? { components } : {})
  });
}

export async function postPersonaPlainMessage(webhookUrl: string, agentId: string | undefined, text: string) {
  const persona = resolvePersona(agentId);
  const avatarUrl = personaAvatarUrl(persona);
  const content = personaMessageLine(persona, text.trim()).slice(0, 2000);

  return postWebhookPayload(webhookUrl, {
    username: personaDiscordName(persona),
    ...(avatarUrl.startsWith("http") ? { avatar_url: avatarUrl } : {}),
    content
  });
}

export async function postPersonaRichMessage(
  webhookUrl: string,
  input: {
    agentId?: string;
    recipient: string;
    message: string;
    status?: AgentRichMessageStatus;
    scope?: AgentRichMessageScope;
    avatarUrl?: string;
    timestamp?: string | Date;
    includeQuickActions?: boolean;
  }
) {
  const persona = resolvePersona(input.agentId);
  const avatarUrl = input.avatarUrl ?? personaAvatarUrl(persona);
  const richMessage = buildAgentRichMessageInput(input);
  const payload = buildAgentDiscordEmbed(richMessage);
  const components =
    input.includeQuickActions === false
      ? undefined
      : buildRichQuickActionRows(input.scope, listPendingApprovals());

  return postWebhookPayload(webhookUrl, {
    username: personaDiscordName(persona),
    ...(avatarUrl.startsWith("http") ? { avatar_url: avatarUrl } : {}),
    ...payload,
    ...(components?.length ? { components } : {})
  });
}
