"use client";

import type { ReactNode } from "react";
import { ReactiveCard } from "../motion/ReactiveCard";

type TerminalWindowProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function TerminalWindow({ title, subtitle, children, actions }: TerminalWindowProps) {
  return (
    <ReactiveCard className="forge-scanlines" style={{ position: "relative", overflow: "hidden" }}>
      <div className="forge-panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="forge-panel-body" style={{ fontFamily: "var(--forge-mono)", fontSize: "0.8rem" }}>
        {children}
      </div>
    </ReactiveCard>
  );
}
