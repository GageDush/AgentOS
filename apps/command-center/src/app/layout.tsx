import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@agentos/ui/styles/agentos-forge.css";
import "./globals.css";

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
