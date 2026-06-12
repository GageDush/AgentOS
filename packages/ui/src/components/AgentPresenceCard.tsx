"use client";

import type { ForgeAgentPresence } from "../adapters/types";
import { ReactiveCard } from "../motion/ReactiveCard";

type AgentPresenceCardProps = {
  agent: ForgeAgentPresence;
};

const stateClass: Record<ForgeAgentPresence["state"], string> = {
  idle: "forge-status-idle",
  working: "forge-status-working",
  waiting: "forge-status-waiting",
  reviewing: "forge-status-reviewing",
  blocked: "forge-status-blocked",
  error: "forge-status-error forge-shake",
  complete: "forge-status-complete"
};

export function AgentPresenceCard({ agent }: AgentPresenceCardProps) {
  return (
    <ReactiveCard className={stateClass[agent.state]} style={{ padding: "0.85rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <div>
          <strong>{agent.name}</strong>
          <p className="forge-mono" style={{ margin: "0.2rem 0 0", color: "var(--forge-muted)" }}>
            {agent.role}
          </p>
        </div>
        <span className="forge-chip forge-chip-active">{agent.state}</span>
      </div>
      {agent.currentTask ? <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem" }}>{agent.currentTask}</p> : null}
      {agent.activeTool ? (
        <p className="forge-mono" style={{ margin: "0.35rem 0 0", color: "var(--forge-accent)", fontSize: "0.68rem" }}>
          Tool: {agent.activeTool}
        </p>
      ) : null}
      {agent.lastAction ? (
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "var(--forge-muted)" }}>
          {agent.lastAction}
        </p>
      ) : null}
      {agent.permissionLevel ? (
        <p className="forge-mono" style={{ margin: "0.35rem 0 0", fontSize: "0.62rem" }}>
          Permission: {agent.permissionLevel}
        </p>
      ) : null}
      {typeof agent.progress === "number" ? (
        <div style={{ marginTop: "0.5rem", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
          <div
            style={{
              width: `${Math.min(100, agent.progress)}%`,
              height: "100%",
              background: "var(--forge-accent)",
              borderRadius: 2
            }}
          />
        </div>
      ) : null}
    </ReactiveCard>
  );
}
