"use client";

import type { ForgeStatCardData } from "../adapters/types";

type ForgeMetricStripProps = {
  stats: ForgeStatCardData[];
  onSelect?: (id: string) => void;
};

const routeById: Record<string, string> = {
  missions: "/missions",
  approvals: "/control-gate",
  archive: "/archive",
  sessions: "/operators"
};

export function ForgeMetricStrip({ stats, onSelect }: ForgeMetricStripProps) {
  return (
    <div className="forge-metric-strip" role="list">
      {stats.map((stat) => {
        const href = routeById[stat.id];
        const className = `forge-metric-chip ${stat.accent ? "forge-metric-chip-accent" : ""}`.trim();

        if (href && !onSelect) {
          return (
            <a key={stat.id} href={href} className={className} role="listitem" title={stat.caption}>
              <span className="forge-metric-chip-label">{stat.label}</span>
              <span className="forge-metric-chip-value">{stat.value}</span>
            </a>
          );
        }

        return (
          <button
            key={stat.id}
            type="button"
            className={className}
            role="listitem"
            title={stat.caption}
            onClick={() => onSelect?.(stat.id)}
          >
            <span className="forge-metric-chip-label">{stat.label}</span>
            <span className="forge-metric-chip-value">{stat.value}</span>
          </button>
        );
      })}
    </div>
  );
}
