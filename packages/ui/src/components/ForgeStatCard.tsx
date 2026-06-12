"use client";

import { ReactiveCard } from "../motion/ReactiveCard";

type ForgeStatCardProps = {
  label: string;
  value: string;
  caption: string;
  accent?: boolean;
  featured?: boolean;
};

export function ForgeStatCard({ label, value, caption, accent = false, featured = false }: ForgeStatCardProps) {
  return (
    <ReactiveCard
      className={`forge-card-glow ${featured ? "forge-card-featured" : ""}`.trim()}
      style={{ padding: 0 }}
    >
      <div className="forge-stat-card" style={{ border: "none", background: "transparent", boxShadow: "none" }}>
        <p className="forge-stat-card-label">{label}</p>
        <p className={`forge-stat-card-value ${accent ? "forge-stat-card-value-accent" : ""}`.trim()}>{value}</p>
        <div className="forge-stat-card-divider" aria-hidden="true" />
        <p className="forge-stat-card-caption">{caption}</p>
      </div>
    </ReactiveCard>
  );
}
