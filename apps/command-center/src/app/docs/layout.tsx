import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "OSINT Tooling · flous.dev",
    template: "%s · OSINT Tooling · flous.dev"
  },
  description:
    "OSINT component library docs — adapters, entities, evidence vaults, graphs, and tool patterns."
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children;
}
