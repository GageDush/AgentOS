"use client";

import {
  AgentActivityFeed,
  AgentPresenceCard,
  AgentRichMessageCard,
  AmbientSystemHealthBar,
  ApprovalCard,
  CommandPalette,
  GeneratedAppFrame,
  IntegrationCard,
  MetricPill,
  MissionControlPanel,
  MissionTimeline,
  ProximityProvider,
  QuickActionButton,
  SandboxApprovalCenter,
  StatusRail,
  TerminalWindow,
  TopNav
} from "@agentos/ui";
import {
  sampleActivity,
  sampleAgents,
  sampleApprovals,
  sampleHealth,
  sampleIntegrations,
  sampleMissionControl,
  sampleQuickActions,
  sampleTimeline
} from "@agentos/app-generator/templates/agentos-forge/sample-data";
import { buildAshAdminRichMessage } from "@agentos/shared";

const previewPendingApprovals = [
  {
    id: "approval-preview",
    missionId: "mission-preview",
    runId: "run-preview",
    status: "pending"
  }
];

export default function ForgePreviewPage() {
  return (
    <ProximityProvider>
      <div className="forge-root" style={{ minHeight: "100vh" }}>
        <div className="forge-ambient-grid" aria-hidden="true" />
        <TopNav
          wordmark="AgentOS Forge Preview"
          items={[
            { id: "gallery", label: "Gallery", href: "/preview/forge", active: true }
          ]}
          statusChips={[
            { id: "local", label: "Local", value: "preview", status: "ok" }
          ]}
        />
        <AmbientSystemHealthBar metrics={sampleHealth} />
        <main style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>AgentOS Forge Component Gallery</h1>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <MissionControlPanel data={sampleMissionControl} />
            <AgentActivityFeed events={sampleActivity} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
            {sampleAgents.map((agent) => (
              <AgentPresenceCard key={agent.id} agent={agent} />
            ))}
          </div>
          <MissionTimeline steps={sampleTimeline} />
          <SandboxApprovalCenter approvals={sampleApprovals} />
          <ApprovalCard approval={sampleApprovals[0]} />
          <section style={{ display: "grid", gap: "0.75rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem" }}>Agent Rich Message Card</h2>
            <AgentRichMessageCard
              message={{
                ...buildAshAdminRichMessage("Gage", "Message Context/Request"),
                scope: { approvalRequestId: "approval-preview", missionId: "mission-preview", runId: "run-preview" }
              }}
              pendingApprovals={previewPendingApprovals}
            />
          </section>
          <GeneratedAppFrame />
          <StatusRail actions={sampleQuickActions} />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <MetricPill label="Tokens" value="12.4k" status="ok" />
            <QuickActionButton label="Run Tests" description="pnpm test" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            {sampleIntegrations.map((item) => (
              <IntegrationCard key={item.id} integration={item} />
            ))}
          </div>
          <TerminalWindow title="Terminal Window" subtitle="Sample output">
            <code>pnpm typecheck && pnpm test</code>
          </TerminalWindow>
        </main>
        <CommandPalette
          commands={[
            { id: "1", label: "/open approvals", category: "slash" },
            { id: "2", label: "@Reviewer", category: "agent", description: "Code review agent" }
          ]}
          open={false}
        />
      </div>
    </ProximityProvider>
  );
}
