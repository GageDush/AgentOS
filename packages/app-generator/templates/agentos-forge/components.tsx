"use client";

import { AgentPresenceCard, MissionTimeline, ReactiveWorkbenchPanel } from "@agentos/ui";
import { sampleAgents, sampleTimeline } from "./sample-data";

export function ForgeDashboardSections() {
  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <ReactiveWorkbenchPanel title="Mission Control" subtitle="Active run and phase visibility">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
          {sampleAgents.map((agent) => (
            <AgentPresenceCard key={agent.id} agent={agent} />
          ))}
        </div>
      </ReactiveWorkbenchPanel>
      <MissionTimeline steps={sampleTimeline} />
    </section>
  );
}
