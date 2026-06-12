import type { ApprovalRecord } from "@agentos/shared";

type ApprovalCreatedListener = (approval: ApprovalRecord) => void;

const listeners = new Set<ApprovalCreatedListener>();

export function onApprovalCreated(listener: ApprovalCreatedListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitApprovalCreated(approval: ApprovalRecord): void {
  for (const listener of listeners) {
    try {
      listener(approval);
    } catch {
      // Listener failures must not block persistence writes.
    }
  }
}

export function resetApprovalCreatedListenersForTests(): void {
  listeners.clear();
}
