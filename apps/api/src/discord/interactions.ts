import { handleButtonPress } from "./button-handlers";
import { handleSlashCommand } from "./commands";
import {
  claimInteraction,
  finishDeferredInteraction,
  isDeferredInteractionWork,
  postInteractionCallback
} from "./interaction-respond";
import { embedInteractionResponse } from "./messenger";
import { verifyDiscordInteractionSignature } from "./verify";

type DiscordUser = { id: string; username: string; global_name?: string | null };

export type DiscordInteraction = {
  id: string;
  application_id: string;
  token: string;
  type: number;
  data?: {
    name?: string;
    custom_id?: string;
    component_type?: number;
    options?: { name: string; value?: string }[];
  };
  member?: { user?: DiscordUser };
  user?: DiscordUser;
  message?: {
    id: string;
    channel_id: string;
    embeds?: Array<Record<string, unknown>>;
    components?: Array<{ type: 1; components: Array<Record<string, unknown>> }>;
  };
};

function operatorContext(payload: DiscordInteraction) {
  const user = payload.member?.user ?? payload.user;
  const label = user?.global_name || user?.username || user?.id || "discord-user";
  const operatorId = user?.id ? `discord-${user.id}` : "discord-user";
  return { label, operatorId };
}

export function verifyInteractionRequest(headers: Record<string, string | string[] | undefined>, rawBody: string) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim();
  if (!publicKey) return false;
  const signature = String(headers["x-signature-ed25519"] ?? "");
  const timestamp = String(headers["x-signature-timestamp"] ?? "");
  if (!signature || !timestamp) return false;
  return verifyDiscordInteractionSignature(publicKey, signature, timestamp, rawBody);
}

export function interactionPublicKeyConfigured() {
  return Boolean(process.env.DISCORD_PUBLIC_KEY?.trim());
}

function interactionFailureResponse(message: string) {
  return embedInteractionResponse({
    title: "Interaction failed",
    description: message,
    tone: "danger",
    ephemeral: true
  });
}

export async function resolveDiscordInteraction(payload: DiscordInteraction) {
  if (payload.type === 1) {
    return { type: 1 };
  }

  const { label, operatorId } = operatorContext(payload);

  if (payload.type === 2 && payload.data?.name) {
    return handleSlashCommand(
      { name: payload.data.name, options: payload.data.options },
      label,
      operatorId
    );
  }

  if (payload.type === 3 && payload.data?.custom_id) {
    return handleButtonPress(
      { custom_id: payload.data.custom_id, component_type: payload.data.component_type },
      label,
      operatorId,
      payload.message,
      payload.application_id,
      payload.token
    );
  }

  return interactionFailureResponse("This interface signal is not wired to AgentOS yet.");
}

export async function handleDiscordInteraction(payload: DiscordInteraction) {
  return resolveDiscordInteraction(payload);
}

export async function dispatchDiscordInteraction(payload: DiscordInteraction, via: "http" | "gateway") {
  if (!claimInteraction(payload.id)) {
    return via === "http" ? { type: 1 } : undefined;
  }

  try {
    const response = await resolveDiscordInteraction(payload);

    if (isDeferredInteractionWork(response)) {
      if (via === "gateway") {
        await postInteractionCallback(payload.id, payload.token, { type: 6 });
        await finishDeferredInteraction(response);
        return undefined;
      }

      void finishDeferredInteraction(response).catch(() => {
        // Best-effort follow-up edit after defer.
      });
      return { type: 6 };
    }

    if (via === "gateway") {
      await postInteractionCallback(payload.id, payload.token, response);
      return undefined;
    }

    return response;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown interaction error.";
    const failure = interactionFailureResponse(detail);

    if (via === "gateway") {
      await postInteractionCallback(payload.id, payload.token, failure);
      return undefined;
    }

    return failure;
  }
}
