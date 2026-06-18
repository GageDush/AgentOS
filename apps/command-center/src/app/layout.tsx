import type { Metadata } from "next";
import type { ReactNode } from "react";
// Forge design-system tokens + fonts (Inter / Inter Display / JetBrains Mono / Switzer)
// must load first so --color-*, --forge-bg-*, --forge-orange-* and --font-* are
// defined before the legacy --forge-* aliases and component styles below read them.
import "../styles/forge-ds/index.css";
import "@agentos/ui/styles/agentos-forge.css";
import "./globals.css";
// Shared route-aware nav (pill on /, rail on operational routes) — global so it
// renders identically everywhere.
import "../styles/forge-nav.css";

export const metadata: Metadata = {
  title: "AgentOS Local",
  description: "Local-first AI developer operations hub"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
