"use client";

import type { ForgeMissionControlData } from "../adapters/types";
import { MagneticButton } from "../motion/MagneticButton";
import { TerminalWindow } from "./TerminalWindow";

type MissionControlPanelProps = {
  data: ForgeMissionControlData;
  onRunAgain?: () => void;
};

export function MissionControlPanel({ data, onRunAgain }: MissionControlPanelProps) {
  return (
    <TerminalWindow
      title="Mission Console"
      subtitle={data.missionTitle ?? "No active mission"}
      actions={
        onRunAgain ? (
          <MagneticButton variant="primary" onClick={onRunAgain}>
            Run Again
          </MagneticButton>
        ) : undefined
      }
    >
      <div style={{ display: "grid", gap: "0.65rem" }}>
        {data.missionObjective ? <p style={{ margin: 0 }}>{data.missionObjective}</p> : null}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {data.runStatus ? <span className="forge-chip forge-chip-active">Run: {data.runStatus}</span> : null}
          {data.phase ? <span className="forge-chip">Phase: {data.phase}</span> : null}
          {typeof data.progress === "number" ? <span className="forge-chip">{data.progress}%</span> : null}
        </div>
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
        {data.commandOutput ? (
          <pre
            style={{
              margin: 0,
              padding: "0.65rem",
              background: "rgba(0,0,0,0.35)",
              borderRadius: 6,
              overflow: "auto",
              maxHeight: 140,
              fontSize: "0.75rem"
            }}
          >
            {data.commandOutput}
          </pre>
        ) : null}
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
