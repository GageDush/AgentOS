"use client";

import { useCallback, useEffect, useState } from "react";
import type { ForgeNavItem, ForgeStatusChip } from "../adapters/types";
import { MetricPill } from "./MetricPill";

type TopNavProps = {
  wordmark?: string;
  items: ForgeNavItem[];
  statusChips?: ForgeStatusChip[];
  extraLinks?: ForgeNavItem[];
  pendingApprovals?: number;
  onOpenCommandPalette?: () => void;
};

export function TopNav({
  wordmark = "AgentOS",
  items,
  statusChips = [],
  extraLinks = [],
  pendingApprovals = 0,
  onOpenCommandPalette
}: TopNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openPalette = useCallback(() => {
    onOpenCommandPalette?.();
    setDrawerOpen(false);
  }, [onOpenCommandPalette]);

  const allNavItems = [...items, ...extraLinks];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.65rem 1rem",
        pointerEvents: "none"
      }}
      className="forge-topnav-shell"
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          width: "min(100%, 1120px)",
          padding: "0.55rem 0.85rem",
          borderRadius: "999px",
          border: `1px solid ${scrolled ? "var(--forge-border-strong)" : "var(--forge-border)"}`,
          background: scrolled ? "rgba(8, 10, 14, 0.82)" : "rgba(12, 14, 18, 0.62)",
          backdropFilter: "blur(14px)",
          boxShadow: scrolled ? "var(--forge-shadow)" : "none",
          transition: "background 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
          <strong className="forge-mono" style={{ color: "var(--forge-accent)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
            {wordmark}
          </strong>
          {pendingApprovals > 0 ? (
            <span
              className="forge-chip forge-chip-active"
              title="Pending approvals"
              style={{ fontSize: "0.62rem" }}
            >
              {pendingApprovals} pending
            </span>
          ) : null}
          <nav aria-label="Primary" className="forge-topnav-desktop">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={`forge-btn forge-magnetic ${item.active ? "forge-btn-primary" : ""}`}
                data-forge-proximity="true"
                style={{ padding: "0.32rem 0.62rem", fontSize: "0.76rem" }}
              >
                {item.label}
              </a>
            ))}
            {extraLinks.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="forge-btn forge-magnetic"
                data-forge-proximity="true"
                style={{ padding: "0.32rem 0.62rem", fontSize: "0.72rem", opacity: 0.75 }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="forge-btn forge-magnetic"
            data-forge-proximity="true"
            onClick={openPalette}
            style={{ padding: "0.32rem 0.65rem", fontSize: "0.72rem", display: "inline-flex", gap: "0.45rem" }}
            aria-label="Open command palette"
          >
            <span>Command</span>
            <kbd
              className="forge-mono"
              style={{
                padding: "0.1rem 0.35rem",
                borderRadius: "4px",
                border: "1px solid var(--forge-border)",
                background: "rgba(0,0,0,0.35)",
                fontSize: "0.62rem",
                color: "var(--forge-muted)"
              }}
            >
              ⌘K
            </kbd>
          </button>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {statusChips.map((chip) => (
              <MetricPill key={chip.id} label={chip.label} value={chip.value} status={chip.status} />
            ))}
          </div>
          <button
            type="button"
            className="forge-btn forge-magnetic forge-topnav-menu"
            data-forge-proximity="true"
            aria-expanded={drawerOpen}
            aria-controls="forge-topnav-drawer"
            onClick={() => setDrawerOpen((open) => !open)}
            style={{ padding: "0.32rem 0.55rem", fontSize: "0.78rem" }}
          >
            Menu
          </button>
        </div>
      </div>

      {drawerOpen ? (
        <div
          id="forge-topnav-drawer"
          className="forge-topnav-drawer"
          style={{
            pointerEvents: "auto",
            position: "absolute",
            top: "calc(100% + 0.35rem)",
            left: "1rem",
            right: "1rem",
            maxWidth: "1120px",
            margin: "0 auto",
            padding: "0.75rem",
            borderRadius: "12px",
            border: "1px solid var(--forge-border-strong)",
            background: "var(--forge-panel-strong)",
            backdropFilter: "blur(16px)",
            display: "grid",
            gap: "0.35rem",
            zIndex: 50
          }}
        >
          {allNavItems.map((item) => (
            <a
              key={`drawer-${item.id}`}
              href={item.href}
              className={`forge-btn ${item.active ? "forge-btn-primary" : ""}`}
              onClick={() => setDrawerOpen(false)}
              style={{ justifyContent: "flex-start", width: "100%" }}
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </header>
  );
}
