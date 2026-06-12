"use client";

import type { ForgeQuickAction } from "../adapters/types";
import { QuickActionButton } from "./QuickActionButton";

type StatusRailProps = {
  title?: string;
  actions: ForgeQuickAction[];
  onAction?: (id: string) => void;
  busyId?: string;
};

export function StatusRail({ title = "Quick Actions", actions, onAction, busyId }: StatusRailProps) {
  return (
    <aside className="forge-panel" data-forge-proximity="true" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1rem" }}>
      <h3 className="forge-mono" style={{ margin: 0, color: "var(--forge-accent)" }}>
        {title}
      </h3>
      {actions.map((action) => (
        <QuickActionButton
          key={action.id}
          label={action.label}
          description={action.description}
          onClick={() => onAction?.(action.id)}
          disabled={busyId === action.id}
        />
      ))}
    </aside>
  );
}
