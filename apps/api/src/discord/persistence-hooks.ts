import { getPersistenceAdapter } from "@agentos/persistence";
import type { UsageEvent } from "@agentos/shared";
import { queueDiscordUsage } from "./outbox";

export function installDiscordPersistenceHooks() {
  const adapter = getPersistenceAdapter();
  const originalAppend = adapter.appendUsageEvent.bind(adapter);
  adapter.appendUsageEvent = (input) => {
    const event = originalAppend(input);
    queueDiscordUsage(event);
    return event;
  };
}

export type { UsageEvent };
