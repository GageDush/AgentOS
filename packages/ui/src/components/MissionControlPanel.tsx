"use client";

import type { ForgeMissionControlData } from "../adapters/types";
import { MagneticButton } from "../motion/MagneticButton";
import { TerminalWindow } from "./TerminalWindow";

type MissionControlPanelProps = {
  data: ForgeMissionControlData;
  onRunAgain?: () => void;
};

function formatElapsed(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function MissionControlPanel({ data, onRunAgain }: MissionControlPanelProps) {
  const progress = typeof data.progress === "number" ? Math.min(100, Math.max(0, data.progress)) : undefined;
  const blocked = data.runStatus === "awaiting_approval" || data.runStatus === "paused";

  return (
    <TerminalWindow
      featured
      title="Mission Console"
      subtitle={data.missionTitle ?? "No active mission"}
      actions={
        onRunAgain ? (
          <MagneticButton variant="primary" size="lg" onClick={onRunAgain}>
            Run Again
          </MagneticButton>
        ) : undefined
      }
    >
      <div style={{ display: "grid", gap: "var(--forge-space-4)" }}>
        {data.missionObjective ? (
          <p style={{ margin: 0, color: "var(--forge-muted)", lineHeight: 1.55 }}>{data.missionObjective}</p>
        ) : null}

        {data.command ? (
          <p className="forge-mono command-line" style={{ margin: 0, fontSize: "0.82rem", color: "var(--forge-text)" }}>
            {data.command}
          </p>
        ) : null}

        {typeof progress === "number" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
              <span className="forge-mono" style={{ color: "var(--forge-accent)", fontSize: "0.68rem" }}>
                Progress
              </span>
              <span className="forge-mono" style={{ color: "var(--forge-soft)", fontSize: "0.68rem" }}>
                {progress}%
              </span>
            </div>
            <div className="forge-progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {data.runStatus ? <span className="forge-chip forge-chip-active">Run: {data.runStatus}</span> : null}
          {data.phase ? <span className="forge-chip">Phase: {data.phase}</span> : null}
          {data.runId ? <span className="forge-chip">{data.runId.slice(0, 8)}</span> : null}
          {data.sandboxLevel ? <span className="forge-chip">Sandbox: {data.sandboxLevel}</span> : null}
        </div>

        {(data.primaryAgentName || data.supportingAgentNames?.length || data.provider) && (
          <div className="forge-page-grid-cards">
            {data.primaryAgentName ? (
              <div className="forge-panel" style={{ padding: "0.75rem" }}>
                <p className="forge-mono" style={{ margin: "0 0 0.25rem", fontSize: "0.58rem", color: "var(--forge-soft)" }}>
                  PRIMARY AGENT
                </p>
                <strong>{data.primaryAgentName}</strong>
              </div>
            ) : null}
            {data.supportingAgentNames?.length ? (
              <div className="forge-panel" style={{ padding: "0.75rem" }}>
                <p className="forge-mono" style={{ margin: "0 0 0.25rem", fontSize: "0.58rem", color: "var(--forge-soft)" }}>
                  SUPPORT
                </p>
                <strong>{data.supportingAgentNames.join(", ")}</strong>
              </div>
            ) : null}
            {data.provider ? (
              <div className="forge-panel" style={{ padding: "0.75rem" }}>
                <p className="forge-mono" style={{ margin: "0 0 0.25rem", fontSize: "0.58rem", color: "var(--forge-soft)" }}>
                  PROVIDER
                </p>
                <strong>
                  {data.provider}
                  {data.model ? ` · ${data.model}` : ""}
                </strong>
              </div>
            ) : null}
          </div>
        )}

        {data.startedAt || typeof data.elapsedMs === "number" ? (
          <p className="forge-mono" style={{ margin: 0, fontSize: "0.68rem", color: "var(--forge-muted)" }}>
            {data.startedAt ? `Started ${new Date(data.startedAt).toLocaleString()}` : null}
            {data.startedAt && typeof data.elapsedMs === "number" ? " · " : null}
            {typeof data.elapsedMs === "number" ? `Elapsed ${formatElapsed(data.elapsedMs)}` : null}
          </p>
        ) : null}

        {data.requiredGates?.length ? (
          <div>
            <p className="forge-mono" style={{ margin: "0 0 0.35rem", color: "var(--forge-accent)", fontSize: "0.68rem" }}>
              Required Gates
            </p>
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {data.requiredGates.map((gate) => (
                <span key={gate} className="forge-chip forge-chip-active">
                  {gate}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {blocked ? (
          <p className="forge-blocked-banner">
            Operator decision required — review pending approval before the run can continue.
          </p>
        ) : null}

        {data.activeTools?.length ? (
          <div>
            <p className="forge-mono" style={{ margin: "0 0 0.35rem", color: "var(--forge-accent)", fontSize: "0.68rem" }}>
              Active Tools
            </p>
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {data.activeTools.map((tool) => (
                <span key={tool} className="forge-chip">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {data.commandOutput ? <pre className="forge-console-output">{data.commandOutput}</pre> : null}

        {data.artifacts?.length ? (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {data.artifacts.map((artifact) => (
              <a key={artifact.label} href={artifact.href ?? "#"} className="forge-chip forge-chip-active">
                {artifact.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </TerminalWindow>
  );
}
