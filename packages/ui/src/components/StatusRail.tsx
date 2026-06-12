"use client";

import type { ForgeQuickAction } from "../adapters/types";
import { QuickActionButton } from "./QuickActionButton";
import { ReactiveCard } from "../motion/ReactiveCard";

type StatusRailProps = {
  title?: string;
  actions: ForgeQuickAction[];
  onAction?: (id: string) => void;
  busyId?: string;
};

export function StatusRail({ title = "Quick Actions", actions, onAction, busyId }: StatusRailProps) {
  return (
    <ReactiveCard className="forge-status-rail" data-forge-proximity="true">
      <h3 className="forge-zone-label" style={{ margin: 0 }}>
        {title}
      </h3>
      {actions.map((action) => (
        <QuickActionButton
          key={action.id}
          label={action.label}
          description={action.description}
          importance={action.importance}
          onClick={() => onAction?.(action.id)}
          disabled={busyId === action.id}
        />
      ))}
    </ReactiveCard>
  );
}
