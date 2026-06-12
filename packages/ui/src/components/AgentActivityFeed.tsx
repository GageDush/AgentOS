"use client";

import type { ForgeActivityEvent } from "../adapters/types";
import { TerminalWindow } from "./TerminalWindow";

type AgentActivityFeedProps = {
  events: ForgeActivityEvent[];
  maxItems?: number;
};

const kindColors: Record<ForgeActivityEvent["kind"], string> = {
  agent: "var(--forge-accent)",
  file: "var(--forge-muted)",
  command: "var(--forge-accent-bright)",
  tool: "var(--forge-accent)",
  test: "var(--forge-green)",
  error: "var(--forge-red)",
  approval: "var(--forge-accent-bright)",
  artifact: "var(--forge-green)"
};

export function AgentActivityFeed({ events, maxItems = 20 }: AgentActivityFeedProps) {
  const visible = events.slice(0, maxItems);

  return (
    <TerminalWindow title="Agent Activity" subtitle="Live execution events and operator trace">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: 320, overflow: "auto" }}>
        {visible.length === 0 ? (
          <p style={{ color: "var(--forge-muted)", margin: 0 }}>No activity yet.</p>
        ) : (
          visible.map((event) => (
            <div key={event.id} style={{ display: "grid", gridTemplateColumns: "72px 64px 1fr", gap: "0.5rem", alignItems: "start" }}>
              <span className="forge-mono" style={{ color: "var(--forge-soft)", fontSize: "0.62rem" }}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span className="forge-mono" style={{ color: kindColors[event.kind], fontSize: "0.62rem" }}>
                {event.kind}
              </span>
              <span style={{ color: event.level === "error" ? "var(--forge-red)" : undefined }}>
                {event.agentName ? <strong style={{ marginRight: 6 }}>{event.agentName}:</strong> : null}
                {event.message}
              </span>
            </div>
          ))
        )}
      </div>
    </TerminalWindow>
  );
}
