"use client";

import { useEffect, useState } from "react";
import "./forge-entry.css";

const BOOT_STEPS = [
  "Initializing forge shell",
  "Linking agent presence",
  "Mounting sandbox gates",
  "Priming mission console",
  "Syncing operator surface"
] as const;

type ForgeBootLoaderProps = {
  compact?: boolean;
  inline?: boolean;
};

export function ForgeBootLoader({ compact = false, inline = false }: ForgeBootLoaderProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % BOOT_STEPS.length);
    }, 520);
    return () => window.clearInterval(interval);
  }, []);

  const layerClass = inline ? "forge-inline-loader" : "forge-entry-layer";

  return (
    <div className={layerClass} role="status" aria-live="polite" aria-label="Loading AgentOS">
      {!inline ? <div className="forge-entry-orbit forge-entry-orbit-a" aria-hidden="true" /> : null}
      {!inline ? <div className="forge-entry-orbit forge-entry-orbit-b" aria-hidden="true" /> : null}
      <div className="forge-boot-loader">
        <p className="forge-boot-logo">AgentOS Forge</p>
        <div className="forge-boot-rings" aria-hidden="true">
          <div className="forge-boot-ring forge-boot-ring-outer" />
          <div className="forge-boot-ring forge-boot-ring-inner" />
          <div className="forge-boot-core" />
        </div>
        <p className="forge-boot-status">{BOOT_STEPS[stepIndex]}</p>
        {!compact ? (
          <>
            <div className="forge-boot-progress" aria-hidden="true">
              <span />
            </div>
            <div className="forge-boot-ticker">
              {BOOT_STEPS.map((step, index) => (
                <span
                  key={step}
                  className={`forge-chip forge-boot-chip ${index === stepIndex ? "forge-boot-chip-active" : ""}`.trim()}
                >
                  {step.split(" ")[0]}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
