import type { Metadata } from "next";
import { DocsHub } from "../../components/docs/DocsHub";
import { DocsShell } from "../../components/docs/DocsShell";

export const metadata: Metadata = {
  title: "OSINT Tooling",
  description:
    "Component docs for OSINT tools — pipeline architecture, adapters, patterns, and labs."
};

export default function DocsPage() {
  return (
    <DocsShell>
      <DocsHub />
    </DocsShell>
  );
}
