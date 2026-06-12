"use client";

import type { ForgeHealthMetric } from "../adapters/types";
import { MetricPill } from "./MetricPill";

type AmbientSystemHealthBarProps = {
  metrics: ForgeHealthMetric[];
};

export function AmbientSystemHealthBar({ metrics }: AmbientSystemHealthBarProps) {
  return (
    <div
      role="status"
      aria-label="System health"
      style={{
        display: "flex",
        gap: "0.5rem",
        flexWrap: "wrap",
        padding: "0.65rem 1rem",
        borderBottom: "1px solid var(--forge-border)",
        background: "var(--forge-panel-strong)"
      }}
    >
      {metrics.map((metric) => (
        <MetricPill key={metric.id} label={metric.label} value={metric.value} status={metric.status} />
      ))}
    </div>
  );
}
