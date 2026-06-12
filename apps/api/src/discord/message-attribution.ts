import { resolveCanonicalAgentId } from "@agentos/shared";

/**
 * Pick the Discord persona for outbound mission summaries.
 * Prefer synthesizer for multi-agent runs; otherwise primary specialist.
 */
export function resolveMissionMessageAgentId(input: {
  primaryAgentId?: string;
  executedAgentIds?: string[];
  preferSynthesizer?: boolean;
}): string {
  const executed = input.executedAgentIds ?? [];
  const preferSynth = input.preferSynthesizer ?? executed.length > 2;

  if (preferSynth && executed.includes("systems-synthesizer")) {
    return "systems-synthesizer";
  }

  const primary = input.primaryAgentId ? resolveCanonicalAgentId(input.primaryAgentId) : undefined;
  if (primary && primary !== "admin-agent") {
    return primary;
  }

  const specialist = [...executed].reverse().find((id) => id !== "admin-agent" && id !== "systems-synthesizer");
  return specialist ?? primary ?? "admin-agent";
}
