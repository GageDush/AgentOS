"use client";

type MetricPillProps = {
  label: string;
  value: string;
  status?: "ok" | "warn" | "error" | "idle";
  compact?: boolean;
};

export function MetricPill({ label, value, status = "idle", compact = false }: MetricPillProps) {
  const statusClass =
    status === "ok"
      ? "forge-chip-active"
      : status === "warn"
        ? "forge-chip forge-status-waiting"
        : status === "error"
          ? "forge-chip forge-status-error"
          : "forge-chip";

  return (
    <div
      className={`${statusClass} ${compact ? "forge-metric-pill-compact" : ""}`.trim()}
      data-forge-proximity="true"
    >
      <span className="forge-metric-pill-label">{label}</span>
      <strong className="forge-metric-pill-value">{value}</strong>
    </div>
  );
}
