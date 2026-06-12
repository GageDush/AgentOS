import type { ActionButtonSpec } from "./components";
import { buildActionRows } from "./components";
import { buildAgentEmbed, type AgentEmbedInput } from "./embeds";
import { resolveHttpAgentAvatarUrl } from "./agent-avatars";
import { personaDiscordName, personaMessageLine, resolvePersona } from "./personas";
import type { AgentRichMessageScope, AgentRichMessageStatus } from "@agentos/shared";
import { deliverRichAgentCard, type RichCardDeliveryInput } from "./rich-card-delivery";

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

function parseWebhookIdentity(webhookUrl: string) {
  const match = webhookUrl.match(/webhooks\/(\d+)\/([^/?]+)/);
  if (!match) throw new Error("Invalid webhook URL");
  return { id: match[1], token: match[2] };
}

export async function editWebhookMessage(
  webhookUrl: string,
  messageId: string,
  payload: Record<string, unknown>
) {
  const { id, token } = parseWebhookIdentity(webhookUrl);
  const response = await fetch(`https://discord.com/api/v10/webhooks/${id}/${token}/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Webhook edit failed (${response.status}): ${detail}`);
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
  const avatarUrl = resolveHttpAgentAvatarUrl(persona.agentId);

  return postWebhookPayload(webhookUrl, {
    username: personaDiscordName(persona),
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    embeds: [embed],
    ...(components ? { components } : {})
  });
}

export async function postPersonaPlainMessage(webhookUrl: string, agentId: string | undefined, text: string) {
  const persona = resolvePersona(agentId);
  const avatarUrl = resolveHttpAgentAvatarUrl(persona.agentId);
  const content = personaMessageLine(persona, text.trim()).slice(0, 2000);

  return postWebhookPayload(webhookUrl, {
    username: personaDiscordName(persona),
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    content
  });
}

export async function postPersonaRichMessage(
  webhookUrl: string,
  input: RichCardDeliveryInput & {
    status?: AgentRichMessageStatus;
    scope?: AgentRichMessageScope;
  }
) {
  return deliverRichAgentCard(webhookUrl, input);
}
