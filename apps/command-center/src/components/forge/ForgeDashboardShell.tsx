"use client";

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
  type ForgeStatusChip
} from "@agentos/ui";

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

const primaryNav: Array<{ id: string; label: string; href: string; section: SectionKey }> = [
  { id: "product", label: "Product", href: "/", section: "dashboard" },
  { id: "agents", label: "Agents", href: "/operators", section: "operators" },
  { id: "automations", label: "Automations", href: "/routines", section: "routines" },
  { id: "integrations", label: "Integrations", href: "/loadout", section: "loadout" },
  { id: "settings", label: "Settings", href: "/settings", section: "settings" }
];

const extraNav: ForgeNavItem[] = [
  { id: "missions", label: "Missions", href: "/missions" },
  { id: "control-gate", label: "Control Gate", href: "/control-gate" },
  { id: "blackbox", label: "Blackbox", href: "/blackbox" },
  { id: "office", label: "Office", href: "/office" }
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

  const navItems: ForgeNavItem[] = useMemo(
    () =>
      primaryNav.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        active: item.section === section
      })),
    [section]
  );

  const statusChips: ForgeStatusChip[] = useMemo(() => {
    const api = healthMetrics.find((m) => m.id === "api");
    const server = healthMetrics.find((m) => m.id === "server");
    return [
      { id: "local", label: "Local", value: server?.value ?? "unknown", status: server?.status },
      { id: "api", label: "API", value: api?.value ?? "unknown", status: api?.status },
      { id: "sandbox", label: "Sandbox", value: "gated", status: "ok" }
    ];
  }, [healthMetrics]);

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
          statusChips={statusChips}
          extraLinks={extraNav}
          pendingApprovals={pendingApprovals}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />
      }
      healthBar={<AmbientSystemHealthBar metrics={healthMetrics} />}
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
