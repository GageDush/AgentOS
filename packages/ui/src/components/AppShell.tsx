"use client";

import type { ReactNode } from "react";
import { ProximityProvider } from "../motion/ProximityProvider";

type AppShellProps = {
  children: ReactNode;
  top?: ReactNode;
  healthBar?: ReactNode;
  commandPalette?: ReactNode;
};

export function AppShell({ children, top, healthBar, commandPalette }: AppShellProps) {
  return (
    <ProximityProvider>
      <div className="forge-root" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div className="forge-ambient-grid" aria-hidden="true" />
        <div className="forge-noise-overlay" aria-hidden="true" />
        {top}
        {healthBar}
        <main style={{ position: "relative", zIndex: 1, flex: 1 }}>{children}</main>
        {commandPalette}
      </div>
    </ProximityProvider>
  );
}
