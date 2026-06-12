"use client";

import type { ForgeIntegrationItem } from "../adapters/types";
import { ReactiveCard } from "../motion/ReactiveCard";

type IntegrationCardProps = {
  integration: ForgeIntegrationItem;
  onConfigure?: (id: string) => void;
};

const statusLabel: Record<ForgeIntegrationItem["status"], string> = {
  connected: "Connected",
  mock: "Mock",
  offline: "Offline"
};

export function IntegrationCard({ integration, onConfigure }: IntegrationCardProps) {
  return (
    <ReactiveCard
      style={{ padding: "0.85rem 1rem", cursor: onConfigure ? "pointer" : undefined }}
      onClick={() => onConfigure?.(integration.id)}
      role={onConfigure ? "button" : undefined}
      tabIndex={onConfigure ? 0 : undefined}
      onKeyDown={(e) => {
        if (onConfigure && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onConfigure(integration.id);
        }
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <strong>{integration.name}</strong>
        <span className="forge-chip">{statusLabel[integration.status]}</span>
      </div>
      <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--forge-muted)" }}>{integration.description}</p>
    </ReactiveCard>
  );
}
