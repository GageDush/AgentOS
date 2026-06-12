"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AgentPresenceCard,
  AppShell,
  ReactiveWorkbenchPanel,
  TopNav,
  type ForgeAgentPresence
} from "@agentos/ui";
import { apiGet } from "../../lib/agentos-api";
import type { AgentProfile, MissionRun } from "@agentos/shared";
import { toAgentPresences } from "../../components/forge/dashboard-adapters";

type Station = {
  id: string;
  label: string;
  href: string;
  x: string;
  y: string;
};

const stations: Station[] = [
  { id: "builder", label: "Builder", href: "/missions", x: "18%", y: "28%" },
  { id: "reviewer", label: "Reviewer", href: "/control-gate", x: "72%", y: "24%" },
  { id: "research", label: "Research", href: "/archive", x: "22%", y: "68%" },
  { id: "security", label: "Security", href: "/control-gate", x: "68%", y: "62%" },
  { id: "deploy", label: "Deploy", href: "/settings", x: "48%", y: "48%" }
];

export default function OfficePage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [runs, setRuns] = useState<MissionRun[]>([]);
  const [activeStation, setActiveStation] = useState<Station | null>(null);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const data = await apiGet<{ agents: AgentProfile[]; runs: MissionRun[] }>(
        "/dashboard",
        { agents: [], runs: [] } as { agents: AgentProfile[]; runs: MissionRun[] }
      );
      if (!mounted) return;
      setAgents(data.agents);
      setRuns(data.runs);
    };
    void refresh();
    const interval = setInterval(refresh, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const activeRun = runs[0];
  const presences: ForgeAgentPresence[] = useMemo(() => toAgentPresences(agents, activeRun), [agents, activeRun]);

  return (
      <AppShell
        top={
          <TopNav
            wordmark="AgentOS Office"
            items={[{ id: "office", label: "Office (experimental)", href: "/office", active: true }]}
            extraLinks={[{ id: "dashboard", label: "Dashboard", href: "/" }]}
          />
        }
      >
        <main style={{ padding: "1rem", minHeight: "70vh" }}>
          <p style={{ color: "var(--forge-muted)", marginTop: 0 }}>
            Lightweight agent map — click a station to open the related panel.
          </p>
          <div
            className="forge-panel forge-scanlines"
            style={{ position: "relative", minHeight: 420, overflow: "hidden" }}
          >
            {stations.map((station) => (
              <button
                key={station.id}
                type="button"
                data-forge-proximity="true"
                className="forge-btn forge-magnetic"
                onClick={() => setActiveStation(station)}
                style={{
                  position: "absolute",
                  left: station.x,
                  top: station.y,
                  transform: "translate(-50%, -50%)"
                }}
              >
                {station.label}
              </button>
            ))}
            {presences.map((agent, index) => (
              <div
                key={agent.id}
                style={{
                  position: "absolute",
                  left: `${12 + (index % 4) * 20}%`,
                  top: `${78 + Math.floor(index / 4) * 8}%`,
                  width: 180
                }}
              >
                <AgentPresenceCard agent={agent} />
              </div>
            ))}
          </div>
          {activeStation ? (
            <div style={{ marginTop: "1rem" }}>
              <ReactiveWorkbenchPanel
                title={activeStation.label}
                subtitle="Station workbench"
                href={activeStation.href}
                onClose={() => setActiveStation(null)}
              >
                <p style={{ color: "var(--forge-muted)" }}>
                  Open the {activeStation.label} panel to supervise missions, approvals, or runtime settings.
                </p>
              </ReactiveWorkbenchPanel>
            </div>
          ) : null}
        </main>
      </AppShell>
  );
}
