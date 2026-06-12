"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  AppShell,
  AmbientSystemHealthBar,
  CommandPalette,
  TopNav,
  type ForgeCommandItem,
  type ForgeHealthMetric,
  type ForgeNavItem,
  type ForgeNavLinkProps
} from "@agentos/ui";
import { useAgentOSEventsContextOptional } from "../../lib/agentos-events-context";
import { useAgentOSEvents } from "../../lib/use-agentos-events";

function ForgeNavLink({
  href,
  className,
  children,
  onClick,
  "aria-current": ariaCurrent,
  ...rest
}: ForgeNavLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={onClick}
      prefetch={false}
      {...(ariaCurrent ? { "aria-current": ariaCurrent } : {})}
      {...rest}
    >
      {children}
    </Link>
  );
}

type SectionKey =
  | "dashboard"
  | "missions"
  | "routines"
  | "operators"
  | "control-gate"
  | "blackbox"
  | "archive"
  | "loadout"
  | "settings";

type ForgeDashboardShellProps = {
  section: SectionKey;
  healthMetrics: ForgeHealthMetric[];
  commandItems: ForgeCommandItem[];
  pendingApprovals?: number;
  onCommand?: (command: ForgeCommandItem) => void;
  children: ReactNode;
};

const slimNav: Array<{ id: string; label: string; href: string; section: SectionKey }> = [
  { id: "dashboard", label: "Dashboard", href: "/", section: "dashboard" },
  { id: "missions", label: "Missions", href: "/missions", section: "missions" },
  { id: "control-gate", label: "Control Gate", href: "/control-gate", section: "control-gate" },
  { id: "blackbox", label: "Blackbox", href: "/blackbox", section: "blackbox" }
];

const overflowNav: Array<{ id: string; label: string; href: string; section?: SectionKey }> = [
  { id: "agents", label: "Agents", href: "/operators", section: "operators" },
  { id: "automations", label: "Automations", href: "/routines", section: "routines" },
  { id: "integrations", label: "Integrations", href: "/loadout", section: "loadout" },
  { id: "archive", label: "Archive", href: "/archive", section: "archive" },
  { id: "settings", label: "Settings", href: "/settings", section: "settings" },
  { id: "office", label: "Office (preview)", href: "/office" }
];

export function ForgeDashboardShell({
  section,
  healthMetrics,
  commandItems,
  pendingApprovals = 0,
  onCommand,
  children
}: ForgeDashboardShellProps) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const sharedEvents = useAgentOSEventsContextOptional();
  const fallbackEvents = useAgentOSEvents({ pollFallbackMs: 5000, enabled: !sharedEvents });
  const connectionMode = sharedEvents?.mode ?? fallbackEvents.mode;

  const navItems: ForgeNavItem[] = useMemo(
    () =>
      slimNav.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        active: item.section === section || (item.section === "dashboard" && section === "dashboard")
      })),
    [section]
  );

  const overflowItems: ForgeNavItem[] = useMemo(
    () =>
      overflowNav.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        active: item.section === section
      })),
    [section]
  );

  const handleCommand = useCallback(
    (command: ForgeCommandItem) => {
      onCommand?.(command);
      if (command.id === "slash-approvals") router.push("/control-gate");
      else if (command.id === "slash-tests") router.push("/missions");
      else if (command.id === "slash-inspect") router.push("/settings");
      else if (command.id === "slash-sync") router.push("/archive");
      else if (command.id === "slash-build" || command.id === "generate-ui") router.push("/preview/forge");
      else if (command.id.startsWith("agent-")) router.push("/operators");
      else if (command.id === "start-mission") router.push("/missions");
      setPaletteOpen(false);
    },
    [onCommand, router]
  );

  return (
    <AppShell
      top={
        <TopNav
          wordmark="AgentOS"
          items={navItems}
          overflowItems={overflowItems}
          healthMetrics={healthMetrics}
          pendingApprovals={pendingApprovals}
          linkComponent={ForgeNavLink}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />
      }
      healthBar={
        <div className="forge-health-bar-standalone">
          <AmbientSystemHealthBar metrics={healthMetrics} />
          <p className="forge-mono forge-connection-pill" data-mode={connectionMode} style={{ margin: "0.35rem 0 0", fontSize: "0.68rem" }}>
            {connectionMode === "live" ? "● Live" : connectionMode === "polling" ? "◐ Polling" : "○ Offline"}
          </p>
        </div>
      }
      commandPalette={
        <CommandPalette
          commands={commandItems}
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onExecute={handleCommand}
        />
      }
    >
      <div className="forge-dashboard-layout">
        <div className="forge-parallax-watermark" aria-hidden="true" />
        {children}
      </div>
    </AppShell>
  );
}
