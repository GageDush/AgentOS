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

function formatConfidence(value?: number) {
  if (typeof value !== "number") return null;
  return `${Math.round(value)}%`;
}

export function AgentPresenceCard({ agent }: AgentPresenceCardProps) {
  const confidenceLabel = formatConfidence(agent.confidence);

  return (
    <ReactiveCard className={`forge-agent-card ${stateClass[agent.state]}`.trim()}>
      <div className="forge-agent-card-head">
        <div>
          <strong>{agent.name}</strong>
          <p className="forge-mono forge-agent-card-role">{agent.role}</p>
        </div>
        <span className="forge-chip forge-chip-active">{agent.state}</span>
      </div>
      {agent.currentTask ? <p className="forge-agent-card-task">{agent.currentTask}</p> : null}
      {agent.activeTool ? (
        <p className="forge-mono" style={{ margin: "0.35rem 0 0", color: "var(--forge-accent)", fontSize: "0.68rem" }}>
          Tool: {agent.activeTool}
        </p>
      ) : null}
      {agent.lastAction ? (
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "var(--forge-muted)" }}>{agent.lastAction}</p>
      ) : null}
      {agent.permissionLevel ? (
        <p className="forge-mono" style={{ margin: "0.35rem 0 0", fontSize: "0.62rem" }}>
          Permission: {agent.permissionLevel}
        </p>
      ) : null}
      {typeof agent.progress === "number" || confidenceLabel ? (
        <div className="forge-agent-metrics">
          {typeof agent.progress === "number" ? (
            <div className="forge-agent-metric">
              <p className="forge-agent-metric-label">Workload</p>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                <div
                  style={{
                    width: `${Math.min(100, agent.progress)}%`,
                    height: "100%",
                    background: "var(--forge-accent)",
                    borderRadius: 2
                  }}
                />
              </div>
            </div>
          ) : null}
          {confidenceLabel ? (
            <div className="forge-agent-metric">
              <p className="forge-agent-metric-label">Confidence</p>
              <strong className="forge-mono" style={{ fontSize: "0.82rem", color: "var(--forge-accent)" }}>
                {confidenceLabel}
              </strong>
            </div>
          ) : null}
        </div>
      ) : null}
    </ReactiveCard>
  );
}
