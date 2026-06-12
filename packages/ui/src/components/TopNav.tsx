"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { ForgeHealthMetric, ForgeNavItem } from "../adapters/types";
import { useForgeScrollNav } from "../motion/useForgeScrollNav";
import { MetricPill } from "./MetricPill";

export type ForgeNavLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  "aria-current"?: "page" | undefined;
  "data-forge-proximity"?: string;
};

type TopNavProps = {
  wordmark?: string;
  items: ForgeNavItem[];
  overflowItems?: ForgeNavItem[];
  healthMetrics?: ForgeHealthMetric[];
  pendingApprovals?: number;
  approvalsHref?: string;
  onOpenCommandPalette?: () => void;
  linkComponent?: ComponentType<ForgeNavLinkProps>;
};

function DefaultNavLink({ href, className, children, onClick, ...rest }: ForgeNavLinkProps) {
  return (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}

export function TopNav({
  wordmark = "AgentOS",
  items,
  overflowItems = [],
  healthMetrics = [],
  pendingApprovals = 0,
  approvalsHref = "/control-gate",
  onOpenCommandPalette,
  linkComponent: LinkComponent = DefaultNavLink
}: TopNavProps) {
  const { scrolled, hidden } = useForgeScrollNav();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [overflowOpen]);

  const openPalette = useCallback(() => {
    onOpenCommandPalette?.();
    setOverflowOpen(false);
  }, [onOpenCommandPalette]);

  const shellClass = [
    "forge-topnav-shell",
    scrolled ? "forge-topnav-shell-scrolled" : "",
    hidden ? "forge-topnav-shell-hidden" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const pillClass = ["forge-topnav-pill", scrolled ? "forge-topnav-pill-scrolled" : ""].filter(Boolean).join(" ");

  const compactHealth = healthMetrics.filter((m) => ["server", "api", "approvals"].includes(m.id));

  return (
    <header className={shellClass}>
      <div className={pillClass}>
        <div className="forge-topnav-start">
          <LinkComponent href="/" className="forge-brand forge-topnav-wordmark">
            {wordmark}
          </LinkComponent>
          {pendingApprovals > 0 ? (
            <LinkComponent
              href={approvalsHref}
              className="forge-chip forge-chip-active forge-topnav-pending"
              title="Pending approvals"
            >
              {pendingApprovals} pending
            </LinkComponent>
          ) : null}
          <nav aria-label="Primary" className="forge-topnav-desktop">
            {items.map((item) => (
              <LinkComponent
                key={item.id}
                href={item.href}
                className={`forge-btn forge-magnetic forge-btn-sm ${item.active ? "forge-btn-primary" : ""}`.trim()}
                aria-current={item.active ? "page" : undefined}
                data-forge-proximity="true"
              >
                {item.label}
              </LinkComponent>
            ))}
          </nav>
          {overflowItems.length > 0 ? (
            <div className="forge-topnav-overflow" ref={overflowRef}>
              <button
                type="button"
                className="forge-btn forge-magnetic forge-btn-sm"
                data-forge-proximity="true"
                aria-expanded={overflowOpen}
                aria-haspopup="menu"
                onClick={() => setOverflowOpen((open) => !open)}
              >
                More
              </button>
              {overflowOpen ? (
                <div className="forge-topnav-overflow-menu" role="menu">
                  {overflowItems.map((item) => (
                    <LinkComponent
                      key={item.id}
                      href={item.href}
                      className={`forge-btn ${item.active ? "forge-btn-primary" : ""}`.trim()}
                      onClick={() => setOverflowOpen(false)}
                    >
                      {item.label}
                    </LinkComponent>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="forge-topnav-end">
          {scrolled && compactHealth.length > 0 ? (
            <div className="forge-topnav-health" aria-label="System health">
              {compactHealth.map((metric) => (
                <MetricPill key={metric.id} label={metric.label} value={metric.value} status={metric.status} compact />
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="forge-btn forge-magnetic forge-btn-sm"
            data-forge-proximity="true"
            onClick={openPalette}
            aria-label="Open command palette"
          >
            <span>Command</span>
            <kbd className="forge-mono forge-topnav-kbd">⌘K</kbd>
          </button>
          <button
            type="button"
            className="forge-btn forge-magnetic forge-btn-sm forge-topnav-menu"
            data-forge-proximity="true"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen((open) => !open)}
          >
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}
