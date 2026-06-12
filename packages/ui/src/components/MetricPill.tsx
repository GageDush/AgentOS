"use client";

type MetricPillProps = {
  label: string;
  value: string;
  status?: "ok" | "warn" | "error" | "idle";
};

export function MetricPill({ label, value, status = "idle" }: MetricPillProps) {
  const statusClass =
    status === "ok"
      ? "forge-chip-active"
      : status === "warn"
        ? "forge-chip forge-status-waiting"
        : status === "error"
          ? "forge-chip forge-status-error"
          : "forge-chip";

  return (
    <div className={statusClass} data-forge-proximity="true">
      <span className="forge-mono">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
