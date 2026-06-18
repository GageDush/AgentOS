"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import {
  AppShell,
  AmbientSystemHealthBar,
  CommandPalette,
  type ForgeCommandItem,
  type ForgeHealthMetric
} from "@agentos/ui";
import { ForgeNav } from "./ForgeNav";
import { useAgentOSEventsContextOptional } from "../../lib/agentos-events-context";
import { useAgentOSEvents } from "../../lib/use-agentos-events";

type SectionKey =
  | "dashboard"
  | "missions"
  | "routines"
  | "operators"
  | "control-gate"
  | "blackbox"
  | "archive"
  | "wiki"
  | "loadout"
  | "settings";

type ForgeDashboardShellProps = {
  section: SectionKey;
  healthMetrics: ForgeHealthMetric[];
  commandItems: ForgeCommandItem[];
  pendingApprovals?: number;
  activeMissions?: number;
  /** Run Inspector only belongs on operational run surfaces. When false the
   *  layout collapses to a single column (no empty 320px rail). */
  showInspector?: boolean;
  onCommand?: (command: ForgeCommandItem) => void;
  children: ReactNode;
};

export function ForgeDashboardShell({
  section,
  healthMetrics,
  commandItems,
  pendingApprovals = 0,
  activeMissions = 0,
  showInspector = true,
  onCommand,
  children
}: ForgeDashboardShellProps) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const sharedEvents = useAgentOSEventsContextOptional();
  const fallbackEvents = useAgentOSEvents({ pollFallbackMs: 5000, enabled: !sharedEvents });
  const connectionMode = sharedEvents?.mode ?? fallbackEvents.mode;

  // section is retained for callers/typing parity; ForgeNav derives active state
  // from the pathname so the rail and pill stay in sync automatically.
  void section;

  const handleCommand = useCallback(
    (command: ForgeCommandItem) => {
      onCommand?.(command);
      if (command.id === "slash-approvals") router.push("/control-gate");
      else if (command.id === "slash-tests") router.push("/missions");
      else if (command.id === "slash-inspect") router.push("/settings");
      else if (command.id === "slash-sync") router.push("/archive");
      else if (command.id === "slash-wiki") router.push("/wiki");
      else if (command.id === "slash-build" || command.id === "generate-ui") router.push("/preview/forge");
      else if (command.id.startsWith("agent-")) router.push("/loadout");
      else if (command.id === "start-mission") router.push("/missions");
      setPaletteOpen(false);
    },
    [onCommand, router]
  );

  return (
    <AppShell
      top={
        <ForgeNav
          variant="rail"
          missionCount={activeMissions}
          gateCount={pendingApprovals}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />
      }
      healthBar={
        <div className="forge-health-bar-standalone">
          <AmbientSystemHealthBar metrics={healthMetrics} />
          <p
            className="forge-mono forge-connection-pill"
            data-mode={connectionMode}
            style={{ margin: "0.35rem 0 0", fontSize: "0.68rem" }}
          >
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
      <div className={`forge-dashboard-layout${showInspector ? "" : " forge-dashboard-layout--full"}`}>
        <div className="forge-parallax-watermark" aria-hidden="true" />
        {children}
      </div>
    </AppShell>
  );
}
