"use client";

import { useEffect } from "react";
import {
  AgentActivityFeed,
  AgentPresenceStrip,
  CommandInput,
  ForgeMetricStrip,
  MissionControlPanel,
  MissionTimeline,
  SandboxApprovalCenter,
  ScrollReveal,
  type ForgeActivityEvent,
  type ForgeAgentPresence,
  type ForgeApprovalItem,
  type ForgeMissionControlData,
  type ForgeMissionStep,
  type ForgeStatCardData
} from "@agentos/ui";

type ForgeDashboardViewProps = {
  missionControl: ForgeMissionControlData;
  activity: ForgeActivityEvent[];
  agents: ForgeAgentPresence[];
  timeline: ForgeMissionStep[];
  approvals: ForgeApprovalItem[];
  stats?: ForgeStatCardData[];
  onRunAgain?: () => void;
  onRunDemo?: () => void;
  onAllowOnce?: (id: string) => void;
  onAllowMission?: (id: string) => void;
  onDeny?: (id: string) => void;
  onCommand?: (command: string) => void;
  onSelectAgent?: (id: string) => void;
  busyId?: string;
};

export function ForgeDashboardView({
  missionControl,
  activity,
  agents,
  timeline,
  approvals,
  stats = [],
  onRunAgain,
  onRunDemo,
  onAllowOnce,
  onAllowMission,
  onDeny,
  onCommand,
  onSelectAgent,
  busyId
}: ForgeDashboardViewProps) {
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY * 0.04;
      document.documentElement.style.setProperty("--forge-parallax-y", `${y}px`);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="forge-dashboard-surface">
      <div className="forge-ambient-orb forge-ambient-orb-a" aria-hidden="true" />
      <div className="forge-ambient-orb forge-ambient-orb-b" aria-hidden="true" />

      {stats.length > 0 ? (
        <ScrollReveal staggerIndex={0}>
          <ForgeMetricStrip stats={stats} />
        </ScrollReveal>
      ) : null}

      <ScrollReveal staggerIndex={1}>
        <div className="forge-zone-hero">
          <div className="forge-hero-actions">
            {onRunDemo ? (
              <button type="button" className="forge-btn forge-btn-primary" onClick={onRunDemo}>
                Run Platform Demo
              </button>
            ) : null}
          </div>
          <MissionControlPanel data={missionControl} onRunAgain={onRunAgain} />
          <div className="forge-command-deck">
            <p className="forge-command-deck-title forge-zone-label-case">Command input</p>
            <CommandInput placeholder="Ask agent, run /slash command, or dispatch work…" onSubmit={onCommand} />
            {approvals.length > 0 ? (
              <SandboxApprovalCenter
                approvals={approvals.slice(0, 1)}
                onAllowOnce={onAllowOnce}
                onAllowMission={onAllowMission}
                onDeny={onDeny}
                busyId={busyId}
              />
            ) : null}
            <AgentActivityFeed events={activity} maxItems={12} />
          </div>
        </div>
      </ScrollReveal>

      {agents.length > 0 ? (
        <ScrollReveal staggerIndex={2}>
          <AgentPresenceStrip agents={agents} onSelectAgent={onSelectAgent} />
        </ScrollReveal>
      ) : null}

      <ScrollReveal staggerIndex={3}>
        <div className="forge-zone-lower forge-zone-lower-single">
          <MissionTimeline steps={timeline} />
          {approvals.length > 1 ? (
            <SandboxApprovalCenter
              approvals={approvals.slice(1)}
              onAllowOnce={onAllowOnce}
              onAllowMission={onAllowMission}
              onDeny={onDeny}
              busyId={busyId}
            />
          ) : null}
        </div>
      </ScrollReveal>
    </div>
  );
}
