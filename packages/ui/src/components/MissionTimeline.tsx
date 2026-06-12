"use client";

import { useMemo, useState } from "react";
import type { ForgeMissionStep } from "../adapters/types";
import { TerminalWindow } from "./TerminalWindow";

type MissionTimelineProps = {
  steps: ForgeMissionStep[];
};

function stepNodeClass(status: ForgeMissionStep["status"]) {
  if (status === "active") return "forge-stepper-node forge-stepper-node-active";
  if (status === "complete") return "forge-stepper-node forge-stepper-node-complete";
  if (status === "error") return "forge-stepper-node forge-stepper-node-error";
  return "forge-stepper-node";
}

export function MissionTimeline({ steps }: MissionTimelineProps) {
  const activeStep = useMemo(() => steps.find((step) => step.status === "active"), [steps]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const displayStep = steps.find((step) => step.id === focusedId) ?? activeStep;

  const completedCount = steps.filter((step) => step.status === "complete").length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <TerminalWindow title="Mission timeline" subtitle="Production phases — select the active step for live context">
      <div className="forge-stepper">
        <div className="forge-stepper-track" aria-hidden="true">
          <span className="forge-stepper-track-fill" style={{ width: `${progress}%` }} />
        </div>
        <ol className="forge-stepper-nodes">
          {steps.map((step, index) => {
            const isActive = step.status === "active";
            const isFocused = displayStep?.id === step.id;

            return (
              <li key={step.id} className="forge-stepper-item">
                <button
                  type="button"
                  className={`${stepNodeClass(step.status)} ${isFocused ? "forge-stepper-node-focused" : ""}`.trim()}
                  onClick={() => setFocusedId(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  title={step.label}
                >
                  <span className="forge-stepper-index">{index + 1}</span>
                </button>
                <span className={`forge-stepper-label ${isActive ? "forge-stepper-label-active" : ""}`.trim()}>{step.label}</span>
                {step.gateChips?.length ? (
                  <span className="forge-stepper-gates">
                    {step.gateChips.map((chip) => (
                      <span key={`${step.id}-${chip.gateId}`} className={`forge-chip forge-chip-gate forge-chip-gate-${chip.status}`}>
                        {chip.label ?? chip.gateId}: {chip.status}
                      </span>
                    ))}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {displayStep ? (
        <div className="forge-stepper-detail">
          <div className="forge-stepper-detail-head">
            <strong>{displayStep.label}</strong>
            <span className="forge-chip">{displayStep.status}</span>
          </div>
          {displayStep.timestamp ? (
            <p className="forge-mono forge-stepper-meta">
              {new Date(displayStep.timestamp).toLocaleString()}
              {displayStep.agentName ? ` · ${displayStep.agentName}` : ""}
            </p>
          ) : null}
          {displayStep.details ? <p className="forge-stepper-detail-copy">{displayStep.details}</p> : null}
          {!displayStep.details && displayStep.status === "active" ? (
            <p className="forge-stepper-detail-copy">This phase is in progress. Logs and approvals will surface here as the run advances.</p>
          ) : null}
          {displayStep.artifactLinks?.length ? (
            <div className="forge-stepper-artifacts">
              {displayStep.artifactLinks.map((link) => (
                <a key={link.href} href={link.href} className="forge-chip forge-chip-active">
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </TerminalWindow>
  );
}
