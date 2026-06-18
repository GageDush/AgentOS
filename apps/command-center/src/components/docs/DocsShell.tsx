import Link from "next/link";
import type { ReactNode } from "react";
import { slugToPath } from "../../content/docs/manifest";
import { DocsSidebar } from "./DocsSidebar";
import "./forge-docs.css";

type DocsShellProps = {
  children: ReactNode;
  currentSlug?: string;
};

export function DocsShell({ children, currentSlug }: DocsShellProps) {
  return (
    <div className="flous-docs-root">
      <header className="flous-docs-header">
        <div className="flous-docs-header-inner">
          <div className="flous-docs-brand">
            <Link href="/" className="flous-docs-brand-mark">
              flous<span className="flous-docs-brand-dot">.dev</span>
            </Link>
            <span className="flous-docs-brand-sep" aria-hidden>
              /
            </span>
            <Link href="/docs" className="flous-docs-brand-section">
              OSINT Tooling
            </Link>
          </div>
          <nav className="flous-docs-header-nav" aria-label="Docs header">
            <Link href={slugToPath("welcome")} className="flous-docs-header-link">
              Welcome
            </Link>
            <Link href={slugToPath("reference/source-bank")} className="flous-docs-header-link">
              Source bank
            </Link>
            <Link href="/" className="flous-docs-header-link flous-docs-header-link-cta">
              Command center
            </Link>
          </nav>
        </div>
      </header>

      <div className="flous-docs-body">
        <DocsSidebar currentSlug={currentSlug} />
        <main className="flous-docs-main">{children}</main>
      </div>
    </div>
  );
}
