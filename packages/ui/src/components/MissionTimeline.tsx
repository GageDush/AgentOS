"use client";

import { useState } from "react";
import type { ForgeMissionStep } from "../adapters/types";
import { TerminalWindow } from "./TerminalWindow";

type MissionTimelineProps = {
  steps: ForgeMissionStep[];
};

export function MissionTimeline({ steps }: MissionTimelineProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <TerminalWindow title="Mission Timeline" subtitle="Run phases and operator checkpoints">
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {steps.map((step) => {
          const isActive = step.status === "active";
          const isError = step.status === "error";
          const isComplete = step.status === "complete";

          return (
            <li
              key={step.id}
              className={isActive ? "forge-timeline-step-active" : undefined}
              style={{
                borderLeft: `2px solid ${
                  isError ? "var(--forge-red)" : isComplete ? "var(--forge-green)" : isActive ? "var(--forge-accent)" : "var(--forge-border)"
                }`,
                paddingLeft: "0.75rem"
              }}
            >
              <button
                type="button"
                onClick={() => setExpanded(expanded === step.id ? null : step.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  padding: 0
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span className="forge-mono" style={{ color: isActive ? "var(--forge-accent)" : "var(--forge-muted)", fontSize: "0.68rem" }}>
                    {step.label}
                  </span>
                  <span className="forge-chip">{step.status}</span>
                </div>
                {step.timestamp ? (
                  <span className="forge-mono" style={{ fontSize: "0.6rem", color: "var(--forge-soft)" }}>
                    {new Date(step.timestamp).toLocaleString()}
                    {step.agentName ? ` · ${step.agentName}` : ""}
                  </span>
                ) : null}
              </button>
              {expanded === step.id && step.details ? (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "var(--forge-muted)" }}>{step.details}</p>
              ) : null}
              {expanded === step.id && step.artifactLinks?.length ? (
                <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {step.artifactLinks.map((link) => (
                    <a key={link.href} href={link.href} className="forge-chip forge-chip-active">
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </TerminalWindow>
  );
}
