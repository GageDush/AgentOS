"use client";

import type { ReactNode } from "react";
import { ReactiveCard } from "../motion/ReactiveCard";

type TerminalWindowProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  featured?: boolean;
};

export function TerminalWindow({ title, subtitle, children, actions, featured = false }: TerminalWindowProps) {
  const surfaceClass = featured
    ? "forge-panel-hero forge-card-glow"
    : "forge-scanlines";

  return (
    <ReactiveCard className={surfaceClass} style={{ position: "relative", overflow: "hidden" }}>
      <div className="forge-panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="forge-panel-body" style={{ fontFamily: featured ? "inherit" : "var(--forge-mono)", fontSize: featured ? "0.88rem" : "0.8rem" }}>
        {children}
      </div>
    </ReactiveCard>
  );
}
