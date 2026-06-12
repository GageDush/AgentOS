"use client";

import { useState, type ReactNode } from "react";
import { MagneticButton } from "@agentos/ui";
import type { MissionRecord, MissionRun } from "@agentos/shared";

type ForgeInspectorSidebarProps = {
  collapsedDefault?: boolean;
  mission?: MissionRecord;
  run?: MissionRun;
  children: ReactNode;
};

export function ForgeInspectorSidebar({ collapsedDefault = false, mission, run, children }: ForgeInspectorSidebarProps) {
  const [collapsed, setCollapsed] = useState(collapsedDefault);

  if (collapsed) {
    return (
      <aside className="forge-sidebar-panel forge-sidebar-collapsed">
        <div className="forge-sidebar-collapsed-card">
          <p className="forge-sidebar-collapsed-kicker">Active run</p>
          <strong>{mission?.title ?? "No run selected"}</strong>
          {run ? <span className={`status-chip status-chip-${run.status}`}>{run.status}</span> : null}
          {run?.requestedCommand ? <p className="command-line forge-sidebar-collapsed-command">{run.requestedCommand}</p> : null}
          <MagneticButton variant="primary" size="sm" onClick={() => setCollapsed(false)}>
            Expand inspector
          </MagneticButton>
        </div>
      </aside>
    );
  }

  return (
    <aside className="forge-sidebar-panel">
      <div className="forge-sidebar-expand-bar">
        <span className="forge-mono" style={{ fontSize: "0.68rem", color: "var(--forge-muted)" }}>
          Run inspector
        </span>
        <MagneticButton size="sm" onClick={() => setCollapsed(true)}>
          Collapse
        </MagneticButton>
      </div>
      {children}
    </aside>
  );
}
