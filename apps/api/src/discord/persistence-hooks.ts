import { getPersistenceAdapter, onApprovalCreated } from "@agentos/persistence";
import type { UsageEvent } from "@agentos/shared";
import { installMissionBriefingHook } from "./mission-briefing";
import { queueDiscordApproval } from "./notify";
import { queueDiscordAudit, queueDiscordUsage } from "./outbox";

export function installDiscordPersistenceHooks() {
  installMissionBriefingHook();
  const adapter = getPersistenceAdapter();
  const originalAppendUsage = adapter.appendUsageEvent.bind(adapter);
  adapter.appendUsageEvent = (input) => {
    const event = originalAppendUsage(input);
    queueDiscordUsage(event);
    return event;
  };
  const originalAppendAudit = adapter.appendAuditEvent.bind(adapter);
  adapter.appendAuditEvent = (input) => {
    const event = originalAppendAudit(input);
    queueDiscordAudit(event);
    return event;
  };
  onApprovalCreated((approval) => {
    queueDiscordApproval(approval);
  });
}

export type { UsageEvent };
