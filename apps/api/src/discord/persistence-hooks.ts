import { getPersistenceAdapter, onApprovalCreated } from "@agentos/persistence";
import type { UsageEvent } from "@agentos/shared";
import { queueDiscordApproval } from "./notify";
import { queueDiscordUsage } from "./outbox";

export function installDiscordPersistenceHooks() {
  const adapter = getPersistenceAdapter();
  const originalAppend = adapter.appendUsageEvent.bind(adapter);
  adapter.appendUsageEvent = (input) => {
    const event = originalAppend(input);
    queueDiscordUsage(event);
    return event;
  };
  onApprovalCreated((approval) => {
    queueDiscordApproval(approval);
  });
}

export type { UsageEvent };
