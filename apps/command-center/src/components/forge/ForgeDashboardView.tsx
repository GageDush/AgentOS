"use client";

import { useEffect } from "react";
import {
  AgentActivityFeed,
  AgentPresenceCard,
  ForgeStatCard,
  GeneratedAppFrame,
  MissionControlPanel,
  MissionTimeline,
  SandboxApprovalCenter,
  ScrollReveal,
  StatusRail,
  type ForgeActivityEvent,
  type ForgeAgentPresence,
  type ForgeApprovalItem,
  type ForgeMissionControlData,
  type ForgeMissionStep,
  type ForgeQuickAction,
  type ForgeStatCardData
} from "@agentos/ui";

type ForgeDashboardViewProps = {
  missionControl: ForgeMissionControlData;
  activity: ForgeActivityEvent[];
  agents: ForgeAgentPresence[];
  timeline: ForgeMissionStep[];
  approvals: ForgeApprovalItem[];
  quickActions: ForgeQuickAction[];
  stats?: ForgeStatCardData[];
  onRunAgain?: () => void;
  onQuickAction?: (id: string) => void;
  onAllowOnce?: (id: string) => void;
  onAllowMission?: (id: string) => void;
  onDeny?: (id: string) => void;
  busyId?: string;
};

export function ForgeDashboardView({
  missionControl,
  activity,
  agents,
  timeline,
  approvals,
  quickActions,
  stats = [],
  onRunAgain,
  onQuickAction,
  onAllowOnce,
  onAllowMission,
  onDeny,
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
    <div className="forge-page-grid">
      {stats.length > 0 ? (
        <ScrollReveal staggerIndex={0}>
          <div className="forge-page-grid-cards">
            {stats.map((stat, index) => (
              <ScrollReveal key={stat.id} staggerIndex={index} staggerMs={70}>
                <ForgeStatCard
                  label={stat.label}
                  value={stat.value}
                  caption={stat.caption}
                  accent={stat.accent}
                  featured={stat.featured}
                />
              </ScrollReveal>
            ))}
          </div>
        </ScrollReveal>
      ) : null}

      <ScrollReveal staggerIndex={1}>
        <div className="forge-page-grid-2col">
          <MissionControlPanel data={missionControl} onRunAgain={onRunAgain} />
          <AgentActivityFeed events={activity} />
        </div>
      </ScrollReveal>

      <ScrollReveal staggerIndex={2}>
        <div className="forge-page-grid-cards">
          {agents.map((agent, index) => (
            <ScrollReveal key={agent.id} staggerIndex={index} staggerMs={70}>
              <AgentPresenceCard agent={agent} />
            </ScrollReveal>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal staggerIndex={3}>
        <div className="forge-page-grid-main-rail">
          <div className="forge-page-grid">
            <MissionTimeline steps={timeline} />
            {approvals.length > 0 ? (
              <SandboxApprovalCenter
                approvals={approvals}
                onAllowOnce={onAllowOnce}
                onAllowMission={onAllowMission}
                onDeny={onDeny}
                busyId={busyId}
              />
            ) : null}
            <GeneratedAppFrame />
          </div>
          <StatusRail actions={quickActions} onAction={onQuickAction} busyId={busyId} />
        </div>
      </ScrollReveal>
    </div>
  );
}
