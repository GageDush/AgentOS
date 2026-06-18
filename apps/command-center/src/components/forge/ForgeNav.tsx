/* eslint-disable */
"use client";

/* ────────────────────────────────────────────────────────────────────────
   ForgeNav — the single shared navigation shell for AgentOS.

   One component, two route-aware densities (the "hybrid" shell decision):
   - variant="pill"  → floating centered pill bar (home / marketing surface)
   - variant="rail"  → full-width sticky bar, denser (operational routes)

   Same nav items, same active logic, same counts, same ⌘K + avatar in both,
   so `/` → `/missions` → `/control-gate` feels like one product. Styles in
   styles/forge-nav.css (imported globally in app/layout.tsx).
   ──────────────────────────────────────────────────────────────────────── */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FORGE_NAV_MORE, FORGE_NAV_PRIMARY } from "./forge-nav-items";

function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" rx="10" stroke="var(--forge-accent)" strokeWidth="2.6" />
      <rect x="9.5" y="11.5" width="3.5" height="3.5" rx=".5" fill="var(--forge-accent)" />
      <rect x="13" y="15" width="3.5" height="3.5" rx=".5" fill="var(--forge-accent)" />
      <rect x="16.5" y="18.5" width="3.5" height="3.5" rx=".5" fill="var(--forge-accent)" />
      <rect x="13" y="22" width="3.5" height="3.5" rx=".5" fill="var(--forge-accent)" />
      <rect x="9.5" y="25.5" width="3.5" height="3.5" rx=".5" fill="var(--forge-accent)" />
      <rect x="9.5" y="32" width="12" height="3" rx=".5" fill="var(--forge-accent)" />
    </svg>
  );
}

export type ForgeNavProps = {
  variant?: "pill" | "rail";
  missionCount?: number;
  gateCount?: number;
  onOpenCommandPalette?: () => void;
  user?: string;
  version?: string;
};

export function ForgeNav({
  variant = "rail",
  missionCount = 0,
  gateCount = 0,
  onOpenCommandPalette,
  user = "Gage",
  version = "0.1.7",
}: ForgeNavProps) {
  const pathname = usePathname() || "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [moreOpen]);

  const counts: Record<string, number> = { missions: missionCount, gate: gateCount };
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const moreActive = FORGE_NAV_MORE.some((m) => isActive(m.href));
  const initial = (user || "G").trim().charAt(0).toUpperCase() || "G";

  return (
    <nav className={`fnav fnav--${variant}`} aria-label="Primary">
      <Link className="fnav-brand" href="/">
        <Mark />
        <span className="fnav-word">
          Agent<i>OS</i>
        </span>
        <span className="fnav-v">{version}</span>
      </Link>

      <div className="fnav-links">
        {FORGE_NAV_PRIMARY.map((it) => {
          const ct = it.count ? counts[it.count] : 0;
          const hot = it.count === "gate" && ct > 0;
          return (
            <Link key={it.id} href={it.href} className={`fnav-link${isActive(it.href) ? " on" : ""}`} aria-current={isActive(it.href) ? "page" : undefined}>
              {it.label}
              {it.count && ct > 0 && <span className={`fnav-ct${hot ? " hot" : ""}`}>{ct}</span>}
            </Link>
          );
        })}

        <div className="fnav-more" ref={moreRef}>
          <button
            type="button"
            className={`fnav-link fnav-more-btn${moreActive ? " on" : ""}`}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMoreOpen((v) => !v);
            }}
          >
            More
            <span className="fnav-chev" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          {moreOpen && (
            <div className="fnav-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              {FORGE_NAV_MORE.map((m) => (
                <Link key={m.id} href={m.href} role="menuitem" className={`fnav-menu-item${isActive(m.href) ? " on" : ""}`} onClick={() => setMoreOpen(false)}>
                  {m.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fnav-right">
        <button type="button" className="fnav-search" onClick={onOpenCommandPalette} aria-label="Open command palette">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <kbd>⌘K</kbd>
        </button>
        <span className="fnav-avatar" title={user}>
          {initial}
        </span>
      </div>
    </nav>
  );
}

export default ForgeNav;
