const DISCORD_API = "https://discord.com/api/v10";

const handledInteractionIds = new Set<string>();

export function claimInteraction(id: string) {
  if (handledInteractionIds.has(id)) return false;
  handledInteractionIds.add(id);
  setTimeout(() => handledInteractionIds.delete(id), 60_000);
  return true;
}

export async function postInteractionCallback(id: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(`${DISCORD_API}/interactions/${id}/${token}/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Interaction callback failed (${response.status}): ${detail}`);
  }
}

export async function editOriginalInteractionMessage(
  applicationId: string,
  token: string,
  body: Record<string, unknown>
) {
  const response = await fetch(`${DISCORD_API}/webhooks/${applicationId}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Interaction message edit failed (${response.status}): ${detail}`);
  }
}

export type DeferredInteractionWork = {
  deferred: true;
  applicationId: string;
  token: string;
  run: () => Promise<Record<string, unknown>>;
};

export function isDeferredInteractionWork(value: unknown): value is DeferredInteractionWork {
  return Boolean(value && typeof value === "object" && (value as DeferredInteractionWork).deferred);
}

export async function finishDeferredInteraction(work: DeferredInteractionWork) {
  const data = await work.run();
  await editOriginalInteractionMessage(work.applicationId, work.token, data);
}
