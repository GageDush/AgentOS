"use client";

import type { ForgeAgentPresence, ForgeAgentPresenceState } from "../adapters/types";

type AgentPresenceOrbProps = {
  agent: ForgeAgentPresence;
  onSelect?: (id: string) => void;
};

const stateRingClass: Record<ForgeAgentPresenceState, string> = {
  idle: "forge-orb-ring-idle",
  working: "forge-orb-ring-working",
  waiting: "forge-orb-ring-waiting",
  reviewing: "forge-orb-ring-reviewing",
  blocked: "forge-orb-ring-blocked",
  error: "forge-orb-ring-error",
  complete: "forge-orb-ring-complete"
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AgentPresenceOrb({ agent, onSelect }: AgentPresenceOrbProps) {
  const ringClass = stateRingClass[agent.state];

  return (
    <button
      type="button"
      className="forge-agent-orb"
      onClick={() => onSelect?.(agent.id)}
      title={`${agent.name} — ${agent.state}${agent.currentTask ? ` · ${agent.currentTask}` : ""}`}
    >
      <span className={`forge-agent-orb-ring ${ringClass}`.trim()} aria-hidden="true">
        <span className="forge-agent-orb-avatar">
          {agent.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agent.avatarUrl} alt="" width={56} height={56} />
          ) : (
            <span className="forge-agent-orb-fallback">{initials(agent.name)}</span>
          )}
        </span>
      </span>
      <span className="forge-agent-orb-name">{agent.name}</span>
      <span className="forge-agent-orb-state">{agent.state}</span>
    </button>
  );
}
