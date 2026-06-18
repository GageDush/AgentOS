export type ForgeNavItem = {
  id: string;
  label: string;
  href: string;
  count?: "missions" | "gate";
};

/** Primary nav — visible in the pill/rail bar. */
export const FORGE_NAV_PRIMARY: ForgeNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/" },
  { id: "missions", label: "Missions", href: "/missions", count: "missions" },
  { id: "control-gate", label: "Control Gate", href: "/control-gate", count: "gate" },
  { id: "blackbox", label: "Blackbox", href: "/blackbox" },
];

/** Overflow nav — More menu + footer platform links. */
export const FORGE_NAV_MORE: ForgeNavItem[] = [
  { id: "loadout", label: "Agents", href: "/loadout" },
  { id: "routines", label: "Automations", href: "/routines" },
  { id: "wiki", label: "Memory", href: "/wiki" },
  { id: "docs", label: "OSINT Docs", href: "/docs" },
  { id: "operators", label: "Operators", href: "/operators" },
  { id: "archive", label: "Archive", href: "/archive" },
  { id: "settings", label: "Settings", href: "/settings" },
  { id: "scraper", label: "Scraper", href: "/scraper" },
];
