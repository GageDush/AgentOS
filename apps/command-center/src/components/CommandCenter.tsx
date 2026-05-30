"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AgentProfile,
  AgentTask,
  ApprovalRecord,
  AuditEvent,
  MemoryRecord,
  UsageBudget,
  UsageEvent
} from "@agentos/shared";
import {
  calculateUsageSummary,
  defaultAgents,
  defaultApprovals,
  defaultAuditEvents,
  defaultBudgets,
  defaultMemories,
  defaultTasks,
  defaultUsageEvents
} from "@agentos/shared";
import type { OfficeInteractable } from "@agentos/game-schema";
import { officeInteractables, panelLabels } from "@agentos/game-schema";
import { OfficeGame } from "../game/OfficeGame";
import { useCommandCenterStore } from "../state/useCommandCenterStore";

const apiBase = process.env.NEXT_PUBLIC_AGENTOS_API_URL ?? "http://localhost:8787";

type DashboardData = {
  agents: AgentProfile[];
  tasks: AgentTask[];
  memories: MemoryRecord[];
  usageEvents: UsageEvent[];
  budgets: UsageBudget[];
  approvals: ApprovalRecord[];
  auditEvents: AuditEvent[];
  apiOnline: boolean;
};

const fallbackData: DashboardData = {
  agents: defaultAgents,
  tasks: defaultTasks,
  memories: defaultMemories,
  usageEvents: defaultUsageEvents,
  budgets: defaultBudgets,
  approvals: defaultApprovals,
  auditEvents: defaultAuditEvents,
  apiOnline: false
};

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBase}${path}`, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function CommandCenter() {
  const { activePanel, activeTarget, openPanel } = useCommandCenterStore();
  const [data, setData] = useState<DashboardData>(fallbackData);

  useEffect(() => {
    const onInteraction = (event: Event) => {
      const detail = (event as CustomEvent<OfficeInteractable>).detail;
      openPanel(detail.panel, detail);
    };
    window.addEventListener("agentos:interaction", onInteraction);
    return () => window.removeEventListener("agentos:interaction", onInteraction);
  }, [openPanel]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [health, agents, tasks, memories, usageEvents, budgets, approvals, auditEvents] = await Promise.all([
        getJson("/health", { ok: false }),
        getJson("/agents", defaultAgents),
        getJson("/tasks", defaultTasks),
        getJson("/memory", defaultMemories),
        getJson("/usage", defaultUsageEvents),
        getJson("/usage/budgets", defaultBudgets),
        getJson("/approvals", defaultApprovals),
        getJson("/audit", defaultAuditEvents)
      ]);
      if (!mounted) return;
      setData({
        agents,
        tasks,
        memories,
        usageEvents,
        budgets,
        approvals,
        auditEvents,
        apiOnline: Boolean((health as { ok?: boolean }).ok)
      });
    };
    void load();
    const interval = setInterval(load, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const usage = useMemo(() => calculateUsageSummary(data.usageEvents, data.budgets), [data.usageEvents, data.budgets]);

  return (
    <main className="shell">
      <section className="stage">
        <header className="topbar">
          <div className="brand">
            <h1>AgentOS Command Center</h1>
            <p>Mock-mode office dashboard with supervised agents, memory, usage limits, and approvals.</p>
          </div>
          <div className="metrics">
            <Metric value={data.apiOnline ? "Online" : "Mock"} label="API" />
            <Metric value={data.agents.length} label="Agents" />
            <Metric value={data.tasks.length} label="Tasks" />
            <Metric value={`$${usage.monthlySpend.toFixed(2)}`} label="Month" />
          </div>
        </header>
        <div className="game-wrap">
          <OfficeGame />
        </div>
        <div className="hint-strip">
          {officeInteractables.slice(0, 8).map((target) => (
            <button className="chip" key={target.id} onClick={() => openPanel(target.panel, target)}>
              {target.label}
            </button>
          ))}
        </div>
      </section>
      <aside className="side-panel">
        <PanelHeader activePanel={activePanel} activeTarget={activeTarget} />
        <PanelSwitch activePanel={activePanel} data={data} usage={usage} />
      </aside>
    </main>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PanelHeader({ activePanel, activeTarget }: { activePanel: string; activeTarget?: OfficeInteractable }) {
  return (
    <section className="panel">
      <h2>{panelLabels[activePanel] ?? "AgentOS"}</h2>
      <p className="panel-subtitle">
        {activeTarget ? `${activeTarget.label} selected from the office.` : "Select any highlighted office object."}
      </p>
      <div className="small">Panel: {activePanel}</div>
    </section>
  );
}

function PanelSwitch({
  activePanel,
  data,
  usage
}: {
  activePanel: string;
  data: DashboardData;
  usage: ReturnType<typeof calculateUsageSummary>;
}) {
  switch (activePanel) {
    case "AgentPanel":
      return <AgentPanel agents={data.agents} memories={data.memories} />;
    case "TaskPanel":
    case "MissionBoardPanel":
      return <TaskPanel tasks={data.tasks} agents={data.agents} />;
    case "MemoryPanel":
      return <MemoryPanel memories={data.memories} />;
    case "TokenManagerPanel":
      return <TokenPanel usage={usage} events={data.usageEvents} />;
    case "ApprovalPanel":
      return <ApprovalPanel approvals={data.approvals} />;
    case "LogsPanel":
      return <LogsPanel auditEvents={data.auditEvents} />;
    case "DiscordPanel":
      return <DiscordPanel />;
    case "SettingsPanel":
      return <SettingsPanel />;
    case "SystemHealthPanel":
    default:
      return <SystemPanel apiOnline={data.apiOnline} />;
  }
}

function AgentPanel({ agents, memories }: { agents: AgentProfile[]; memories: MemoryRecord[] }) {
  return (
    <section className="panel">
      <h3>Production Team</h3>
      <div className="list">
        {agents.map((agent) => (
          <div className="row" key={agent.id}>
            <div className="row-title">
              <span>{agent.name}</span>
              <span className={`status ${agent.status}`}>{agent.status}</span>
            </div>
            <p className="small">{agent.role}</p>
            <div className="progress">
              <span style={{ width: `${agent.workload}%` }} />
            </div>
            <p className="small">Relevant memories: {memories.filter((memory) => memory.agentId === agent.id).length}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TaskPanel({ tasks, agents }: { tasks: AgentTask[]; agents: AgentProfile[] }) {
  return (
    <section className="panel">
      <h3>Task Pipeline</h3>
      <div className="list">
        {tasks.map((task) => {
          const agent = agents.find((item) => item.id === task.assignedAgentId);
          return (
            <div className="row" key={task.id}>
              <div className="row-title">
                <span>{task.title}</span>
                <span className="status">{task.status}</span>
              </div>
              <p className="small">{task.description}</p>
              <p className="small">Assigned: {agent?.name ?? "Unassigned"}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MemoryPanel({ memories }: { memories: MemoryRecord[] }) {
  return (
    <section className="panel">
      <h3>Memory Browser</h3>
      <div className="list">
        {memories.map((memory) => (
          <div className="row" key={memory.id}>
            <div className="row-title">
              <span>{memory.title}</span>
              <span className="status">{memory.type}</span>
            </div>
            <p className="small">{memory.content}</p>
            <p className="small">Tags: {memory.tags.join(", ") || "none"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TokenPanel({ usage, events }: { usage: ReturnType<typeof calculateUsageSummary>; events: UsageEvent[] }) {
  const dailyPct = usage.dailyLimit ? Math.min(100, (usage.dailySpend / usage.dailyLimit) * 100) : 0;
  const monthlyPct = usage.monthlyLimit ? Math.min(100, (usage.monthlySpend / usage.monthlyLimit) * 100) : 0;
  return (
    <section className="panel">
      <h3>Token & Credit Manager</h3>
      <div className="row">
        <div className="row-title">
          <span>Daily</span>
          <span>${usage.dailySpend.toFixed(2)} / ${usage.dailyLimit.toFixed(2)}</span>
        </div>
        <div className="progress">
          <span style={{ width: `${dailyPct}%` }} />
        </div>
      </div>
      <div className="row">
        <div className="row-title">
          <span>Monthly</span>
          <span>${usage.monthlySpend.toFixed(2)} / ${usage.monthlyLimit.toFixed(2)}</span>
        </div>
        <div className="progress">
          <span style={{ width: `${monthlyPct}%` }} />
        </div>
      </div>
      <p className="small">Mock token events: {events.length}. Hard stop: {usage.hardStopEnabled ? "enabled" : "disabled"}.</p>
    </section>
  );
}

function ApprovalPanel({ approvals }: { approvals: ApprovalRecord[] }) {
  return (
    <section className="panel">
      <h3>Approval Gates</h3>
      <div className="list">
        {approvals.map((approval) => (
          <div className="row" key={approval.id}>
            <div className="row-title">
              <span>{approval.tool}</span>
              <span className="status">{approval.status}</span>
            </div>
            <p className="small">{approval.inputSummary}</p>
            <div className="button-row">
              <button className="btn">Approve</button>
              <button className="btn">Deny</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LogsPanel({ auditEvents }: { auditEvents: AuditEvent[] }) {
  return (
    <section className="panel">
      <h3>Audit Log</h3>
      <div className="list">
        {auditEvents.map((event) => (
          <div className="row" key={event.id}>
            <div className="row-title">
              <span>{event.event}</span>
              <span className="small">{event.actor}</span>
            </div>
            <p className="small">{event.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DiscordPanel() {
  return (
    <section className="panel">
      <h3>Discord Mobile Control</h3>
      <p className="small">Mock mode is active until credentials are configured.</p>
      <div className="list">
        {["/status", "/agents", "/tasks", "/task-create", "/approve", "/deny", "/tokens", "/memory-search"].map((command) => (
          <div className="row" key={command}>{command}</div>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel() {
  return (
    <section className="panel">
      <h3>Settings</h3>
      <p className="small">Provider mode: mock. Human approvals: enabled. Sanitization: strict.</p>
    </section>
  );
}

function SystemPanel({ apiOnline }: { apiOnline: boolean }) {
  return (
    <section className="panel">
      <h3>System Health</h3>
      <div className="list">
        <div className="row"><div className="row-title"><span>Command Center</span><span className="status">online</span></div></div>
        <div className="row"><div className="row-title"><span>API</span><span className="status">{apiOnline ? "online" : "fallback"}</span></div></div>
        <div className="row"><div className="row-title"><span>Gateway</span><span className="status">mock</span></div></div>
        <div className="row"><div className="row-title"><span>Worker</span><span className="status">mock</span></div></div>
      </div>
    </section>
  );
}
