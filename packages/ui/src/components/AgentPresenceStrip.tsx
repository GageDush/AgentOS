"use client";

import type { ForgeAgentPresence } from "../adapters/types";
import { AgentPresenceOrb } from "./AgentPresenceOrb";

type AgentPresenceStripProps = {
  agents: ForgeAgentPresence[];
  onSelectAgent?: (id: string) => void;
};

export function AgentPresenceStrip({ agents, onSelectAgent }: AgentPresenceStripProps) {
  return (
    <section className="forge-presence-strip">
      <h3 className="forge-zone-label forge-zone-label-case">Agent presence</h3>
      <div className="forge-presence-orbs" role="list">
        {agents.map((agent) => (
          <AgentPresenceOrb key={agent.id} agent={agent} onSelect={onSelectAgent} />
        ))}
      </div>
    </section>
  );
}
