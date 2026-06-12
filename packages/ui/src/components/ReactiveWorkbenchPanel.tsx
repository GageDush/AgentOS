"use client";

import type { ReactNode } from "react";
import { ReactiveCard } from "../motion/ReactiveCard";
import { MagneticButton } from "../motion/MagneticButton";

type ReactiveWorkbenchPanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose?: () => void;
  href?: string;
};

export function ReactiveWorkbenchPanel({ title, subtitle, children, onClose, href }: ReactiveWorkbenchPanelProps) {
  return (
    <ReactiveCard style={{ padding: "1rem", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {subtitle ? <p style={{ margin: "0.25rem 0 0", color: "var(--forge-muted)", fontSize: "0.82rem" }}>{subtitle}</p> : null}
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {href ? (
            <a href={href} className="forge-btn forge-magnetic" data-forge-proximity="true">
              Open Panel
            </a>
          ) : null}
          {onClose ? <MagneticButton onClick={onClose}>Close</MagneticButton> : null}
        </div>
      </div>
      {children}
    </ReactiveCard>
  );
}
