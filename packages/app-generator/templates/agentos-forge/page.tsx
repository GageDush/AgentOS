"use client";

import {
  AgentActivityFeed,
  AmbientSystemHealthBar,
  AppShell,
  CommandInput,
  GeneratedAppFrame,
  MissionControlPanel,
  SandboxApprovalCenter,
  StatusRail,
  TopNav
} from "@agentos/ui";
import { ForgeDashboardSections } from "./components";
import {
  sampleActivity,
  sampleApprovals,
  sampleHealth,
  sampleMissionControl,
  sampleQuickActions
} from "./sample-data";

/**
 * AgentOS Forge generated app template.
 * uiPreset: "agentos-forge"
 */
export default function AgentOSForgeGeneratedPage() {
  return (
    <AppShell
      top={
        <TopNav
          wordmark="AgentOS"
          items={[
            { id: "dashboard", label: "Product", href: "/", active: true },
            { id: "agents", label: "Agents", href: "/operators" },
            { id: "automations", label: "Automations", href: "/routines" },
            { id: "integrations", label: "Integrations", href: "/loadout" },
            { id: "settings", label: "Settings", href: "/settings" }
          ]}
          healthMetrics={[
            { id: "local", label: "Local", value: "online", status: "ok" },
            { id: "api", label: "API", value: "online", status: "ok" },
            { id: "sandbox", label: "Sandbox", value: "gated", status: "ok" }
          ]}
        />
      }
      healthBar={<AmbientSystemHealthBar metrics={sampleHealth} />}
    >
      <main style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
        <CommandInput placeholder="/build dashboard surface with AgentOS Forge" />
        <ForgeDashboardSections />
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem" }}>
          <MissionControlPanel data={sampleMissionControl} />
          <AgentActivityFeed events={sampleActivity} />
        </div>
        <SandboxApprovalCenter approvals={sampleApprovals} />
        <GeneratedAppFrame />
        <StatusRail actions={sampleQuickActions} />
      </main>
    </AppShell>
  );
}
