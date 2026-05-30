"use client";

import { startTransition, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  AgentProfile,
  AgentTask,
  ApprovalRecord,
  AuditEvent,
  DemoMissionRun,
  LlmChatResponse,
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
  defaultDemoMission,
  defaultMemories,
  defaultTasks,
  defaultUsageEvents
} from "@agentos/shared";
import type { OfficeInteractable } from "@agentos/game-schema";
import { officeInteractables, panelLabels } from "@agentos/game-schema";
import { OfficeGame } from "../game/OfficeGame";
import { useCommandCenterStore } from "../state/useCommandCenterStore";

const apiBase = process.env.NEXT_PUBLIC_AGENTOS_API_URL ?? "http://localhost:8787";

type SystemResponse = {
  api: "online" | "offline";
  worker: "online" | "offline";
  gateway: "online" | "offline";
  discordMode: "mock" | "real" | "real-configured";
  providerMode: "mock" | "real";
  features?: Record<string, boolean>;
};

type DashboardData = {
  agents: AgentProfile[];
  tasks: AgentTask[];
  memories: MemoryRecord[];
  usageEvents: UsageEvent[];
  budgets: UsageBudget[];
  approvals: ApprovalRecord[];
  auditEvents: AuditEvent[];
  demoMission: DemoMissionRun;
  system: SystemResponse;
  apiOnline: boolean;
};

type ConsoleState = {
  prompt: string;
  model: string;
  response: string;
  error: string;
  loading: boolean;
  savedMemoryId?: string;
};

const fallbackData: DashboardData = {
  agents: defaultAgents,
  tasks: defaultTasks,
  memories: defaultMemories,
  usageEvents: defaultUsageEvents,
  budgets: defaultBudgets,
  approvals: defaultApprovals,
  auditEvents: defaultAuditEvents,
  demoMission: defaultDemoMission,
  system: {
    api: "offline",
    worker: "offline",
    gateway: "offline",
    discordMode: "mock",
    providerMode: "mock",
    features: {
      ollama: true,
      discord: false,
      demoMode: true,
      cloudProviders: false,
      toolExecution: false
    }
  },
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
  const [consoleState, setConsoleState] = useState<ConsoleState>({
    prompt: "Give me a tight, friendly AgentOS demo briefing for friends and family.",
    model: "qwen2.5-coder:7b",
    response: "",
    error: "",
    loading: false
  });
  const [taskDraft, setTaskDraft] = useState({
    title: "Draft a show-off AgentOS demo mission",
    prompt: "Write a concise one-minute demo narration for the AgentOS command center.",
    assignedAgentId: "agentos-operator"
  });

  const usage = calculateUsageSummary(data.usageEvents, data.budgets);
  const selectedHint = activeTarget
    ? `${activeTarget.label} selected. ${activeTarget.kind} surfaces ${panelLabels[activePanel] ?? activePanel}.`
    : "Select a highlighted office zone or use the quick command chips below the scene.";

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
      const [health, system, agents, tasks, memories, usageEvents, budgets, approvals, auditEvents, demoMission] =
        await Promise.all([
          getJson("/health", { ok: false }),
          getJson("/system", fallbackData.system),
          getJson("/agents", defaultAgents),
          getJson("/tasks", defaultTasks),
          getJson("/memory", defaultMemories),
          getJson("/usage", defaultUsageEvents),
          getJson("/usage/budgets", defaultBudgets),
          getJson("/approvals", defaultApprovals),
          getJson("/audit", defaultAuditEvents),
          getJson("/mission/demo", defaultDemoMission)
        ]);
      if (!mounted) return;
      startTransition(() => {
        setData({
          agents,
          tasks,
          memories,
          usageEvents,
          budgets,
          approvals,
          auditEvents,
          demoMission,
          system,
          apiOnline: Boolean((health as { ok?: boolean }).ok)
        });
      });
    };
    void load();
    const interval = setInterval(load, 7000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  async function runLocalAi() {
    setConsoleState((current) => ({ ...current, loading: true, error: "", response: "" }));
    try {
      const response = await fetch(`${apiBase}/llm/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: consoleState.prompt,
          model: consoleState.model,
          agentId: activeTarget?.kind === "agent" ? activeTarget.id : "agentos-operator",
          saveMemory: true
        })
      });
      const payload = (await response.json()) as Omit<LlmChatResponse, "ok"> & { ok?: boolean; error?: string };
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Local AI request failed.");
      }
      setConsoleState((current) => ({
        ...current,
        loading: false,
        response: payload.response,
        savedMemoryId: payload.savedMemoryId
      }));
      openPanel("LocalAIConsolePanel");
    } catch (error) {
      setConsoleState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Local AI request failed."
      }));
    }
  }

  async function createTask() {
    const response = await fetch(`${apiBase}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskDraft.title,
        description: taskDraft.prompt,
        prompt: taskDraft.prompt,
        assignedAgentId: taskDraft.assignedAgentId,
        status: "queued"
      })
    });
    if (response.ok) {
      const created = (await response.json()) as AgentTask;
      setData((current) => ({ ...current, tasks: [created, ...current.tasks] }));
      openPanel("TaskPanel");
    }
  }

  async function runTask(taskId: string) {
    await fetch(`${apiBase}/tasks/${taskId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: consoleState.model })
    });
  }

  async function runDemoMission() {
    const response = await fetch(`${apiBase}/mission/demo/run`, { method: "POST" });
    if (response.ok) {
      const mission = (await response.json()) as DemoMissionRun;
      setData((current) => ({ ...current, demoMission: mission }));
      openPanel("MissionBoardPanel", officeInteractables.find((item) => item.id === "mission-board"));
    }
  }

  return (
    <main className="shell">
      <section className="stage">
        <header className="topbar">
          <div className="brand">
            <h1>AgentOS Command Center</h1>
            <p>Local-first command center with live office interactions, safe local AI, and demo mission flow.</p>
          </div>
          <div className="metrics">
            <Metric value={data.apiOnline ? "Online" : "Fallback"} label="API" />
            <Metric value={data.agents.length} label="Agents" />
            <Metric value={data.tasks.length} label="Tasks" />
            <Metric value={data.system.providerMode === "real" ? "Local AI" : "Mock"} label="Provider" />
          </div>
        </header>
        <div className="game-wrap">
          <OfficeGame />
        </div>
        <div className="hint-strip">
          {officeInteractables.slice(0, 7).map((target) => (
            <button className="chip" key={target.id} onClick={() => openPanel(target.panel, target)}>
              {target.label}
            </button>
          ))}
          <button className="chip chip-strong" onClick={() => openPanel("LocalAIConsolePanel")}>
            Local AI Console
          </button>
          <button className="chip chip-strong" onClick={runDemoMission}>
            Run Demo Mission
          </button>
        </div>
        <div className="status-footer">
          <div className="issue-pill">
            <span className={`status-dot ${data.apiOnline ? "online" : "warning"}`} />
            {data.apiOnline ? "Live API connected" : "Fallback seed data active"}
          </div>
          <div className="footer-text">{selectedHint}</div>
        </div>
      </section>
      <aside className="side-panel">
        <PanelHeader
          activePanel={activePanel}
          activeTarget={activeTarget}
          providerMode={data.system.providerMode}
          apiOnline={data.apiOnline}
        />
        <HeroPanel
          demoMission={data.demoMission}
          usage={usage}
          onRunMission={runDemoMission}
          onOpenConsole={() => openPanel("LocalAIConsolePanel")}
        />
        <PanelSwitch
          activePanel={activePanel}
          activeTarget={activeTarget}
          data={data}
          usage={usage}
          consoleState={consoleState}
          setConsoleState={setConsoleState}
          onRunLocalAi={runLocalAi}
          taskDraft={taskDraft}
          setTaskDraft={setTaskDraft}
          onCreateTask={createTask}
          onRunTask={runTask}
        />
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

function PanelHeader({
  activePanel,
  activeTarget,
  providerMode,
  apiOnline
}: {
  activePanel: string;
  activeTarget?: OfficeInteractable;
  providerMode: string;
  apiOnline: boolean;
}) {
  return (
    <section className="panel">
      <h2>{panelLabels[activePanel] ?? (activePanel === "LocalAIConsolePanel" ? "Local AI Console" : "AgentOS")}</h2>
      <p className="panel-subtitle">
        {activeTarget ? `${activeTarget.label} is active in the office.` : "The selected office surface drives this panel."}
      </p>
      <div className="meta-row">
        <span className="meta-tag">{apiOnline ? "api live" : "seed fallback"}</span>
        <span className="meta-tag">{providerMode === "real" ? "ollama ready" : "mock provider"}</span>
      </div>
    </section>
  );
}

function HeroPanel({
  demoMission,
  usage,
  onRunMission,
  onOpenConsole
}: {
  demoMission: DemoMissionRun;
  usage: ReturnType<typeof calculateUsageSummary>;
  onRunMission: () => Promise<void>;
  onOpenConsole: () => void;
}) {
  return (
    <section className="panel panel-hero">
      <div className="hero-card">
        <div>
          <div className="eyebrow">Demo Surface</div>
          <h3>Show-off Local AI Command Center</h3>
          <p className="small">
            Office interactions, a local AI console, mission playback, memory capture, and safe status surfaces in one place.
          </p>
        </div>
        <img
          className="hero-avatar"
          src="/assets/executive/discord/briefing_avatar.png"
          alt="Executive avatar"
        />
      </div>
      <div className="button-row">
        <button className="btn btn-strong" onClick={() => void onRunMission()}>
          Run Demo Mission
        </button>
        <button className="btn" onClick={onOpenConsole}>
          Open Local AI Console
        </button>
      </div>
      <div className="small">
        Mission status: {demoMission.status}. Monthly usage: ${usage.monthlySpend.toFixed(2)} / ${usage.monthlyLimit.toFixed(2)}.
      </div>
    </section>
  );
}

function PanelSwitch({
  activePanel,
  activeTarget,
  data,
  usage,
  consoleState,
  setConsoleState,
  onRunLocalAi,
  taskDraft,
  setTaskDraft,
  onCreateTask,
  onRunTask
}: {
  activePanel: string;
  activeTarget?: OfficeInteractable;
  data: DashboardData;
  usage: ReturnType<typeof calculateUsageSummary>;
  consoleState: ConsoleState;
  setConsoleState: Dispatch<SetStateAction<ConsoleState>>;
  onRunLocalAi: () => Promise<void>;
  taskDraft: { title: string; prompt: string; assignedAgentId: string };
  setTaskDraft: Dispatch<SetStateAction<{ title: string; prompt: string; assignedAgentId: string }>>;
  onCreateTask: () => Promise<void>;
  onRunTask: (taskId: string) => Promise<void>;
}) {
  switch (activePanel) {
    case "AgentPanel":
      return <AgentPanel agents={data.agents} memories={data.memories} activeTarget={activeTarget} />;
    case "TaskPanel":
    case "MissionBoardPanel":
      return (
        <TaskPanel
          tasks={data.tasks}
          agents={data.agents}
          demoMission={data.demoMission}
          taskDraft={taskDraft}
          setTaskDraft={setTaskDraft}
          onCreateTask={onCreateTask}
          onRunTask={onRunTask}
        />
      );
    case "MemoryPanel":
      return <MemoryPanel memories={data.memories} />;
    case "TokenManagerPanel":
      return <TokenPanel usage={usage} events={data.usageEvents} />;
    case "ApprovalPanel":
      return <ApprovalPanel approvals={data.approvals} />;
    case "LogsPanel":
      return <LogsPanel auditEvents={data.auditEvents} />;
    case "DiscordPanel":
      return <DiscordPanel system={data.system} />;
    case "SettingsPanel":
      return <SettingsPanel system={data.system} />;
    case "LocalAIConsolePanel":
      return (
        <LocalAiPanel
          consoleState={consoleState}
          setConsoleState={setConsoleState}
          onRunLocalAi={onRunLocalAi}
        />
      );
    case "SystemHealthPanel":
    default:
      return <SystemPanel apiOnline={data.apiOnline} system={data.system} memories={data.memories} />;
  }
}

function AgentPanel({
  agents,
  memories,
  activeTarget
}: {
  agents: AgentProfile[];
  memories: MemoryRecord[];
  activeTarget?: OfficeInteractable;
}) {
  return (
    <section className="panel">
      <h3>Production Team</h3>
      <div className="list">
        {agents.map((agent) => {
          const isSelected = activeTarget?.id === agent.id;
          return (
            <div className={`row ${isSelected ? "row-selected" : ""}`} key={agent.id}>
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
          );
        })}
      </div>
    </section>
  );
}

function TaskPanel({
  tasks,
  agents,
  demoMission,
  taskDraft,
  setTaskDraft,
  onCreateTask,
  onRunTask
}: {
  tasks: AgentTask[];
  agents: AgentProfile[];
  demoMission: DemoMissionRun;
  taskDraft: { title: string; prompt: string; assignedAgentId: string };
  setTaskDraft: Dispatch<SetStateAction<{ title: string; prompt: string; assignedAgentId: string }>>;
  onCreateTask: () => Promise<void>;
  onRunTask: (taskId: string) => Promise<void>;
}) {
  return (
    <>
      <section className="panel">
        <h3>Demo Mission Mode</h3>
        <img className="panel-image" src="/assets/executive/ui/ui_current_mission_panel.png" alt="Mission panel art" />
        <div className="small">Status: {demoMission.status}</div>
        <div className="list">
          {demoMission.steps.map((step) => {
            const agent = agents.find((item) => item.id === step.agentId);
            return (
              <div className="row" key={step.id}>
                <div className="row-title">
                  <span>{agent?.name ?? step.agentId}</span>
                  <span className={`status ${step.status}`}>{step.status}</span>
                </div>
                <p className="small">{step.summary}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <h3>Create a Task</h3>
        <label className="field">
          <span>Title</span>
          <input value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label className="field">
          <span>Prompt</span>
          <textarea
            rows={4}
            value={taskDraft.prompt}
            onChange={(event) => setTaskDraft((current) => ({ ...current, prompt: event.target.value }))}
          />
        </label>
        <div className="button-row">
          <button className="btn btn-strong" onClick={() => void onCreateTask()}>
            Queue Task
          </button>
        </div>
      </section>
      <section className="panel">
        <h3>Task Queue</h3>
        <div className="list">
          {tasks.map((task) => {
            const agent = agents.find((item) => item.id === task.assignedAgentId);
            return (
              <div className="row" key={task.id}>
                <div className="row-title">
                  <span>{task.title}</span>
                  <span className={`status ${String(task.status)}`}>{task.status}</span>
                </div>
                <p className="small">{task.prompt || task.description}</p>
                <p className="small">Assigned: {agent?.name ?? "Unassigned"}</p>
                {task.result ? <p className="small result-preview">{task.result.slice(0, 180)}</p> : null}
                {task.error ? <p className="small error-text">{task.error}</p> : null}
                <div className="button-row">
                  <button className="btn" onClick={() => void onRunTask(task.id)}>
                    Run with Local AI
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function MemoryPanel({ memories }: { memories: MemoryRecord[] }) {
  return (
    <section className="panel">
      <h3>Recent Memory</h3>
      <div className="list">
        {memories.slice(0, 8).map((memory) => (
          <div className="row" key={memory.id}>
            <div className="row-title">
              <span>{memory.title}</span>
              <span className="status">{memory.type}</span>
            </div>
            <p className="small">{memory.content}</p>
            <p className="small">Source: {memory.source}</p>
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
      <img className="panel-image" src="/assets/executive/ui/ui_strategy_brief_panel.png" alt="Strategy panel art" />
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
      <p className="small">Recorded usage events: {events.length}. Local Ollama calls currently count as $0 demo spend.</p>
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
      <img className="panel-image" src="/assets/executive/ui/ui_operations_log_panel.png" alt="Operations log art" />
      <div className="list">
        {auditEvents.slice(0, 10).map((event) => (
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

function DiscordPanel({ system }: { system: SystemResponse }) {
  return (
    <section className="panel">
      <h3>Discord Status Surface</h3>
      <img className="panel-image" src="/assets/executive/discord/mobile_card_executive_summary.png" alt="Discord card art" />
      <p className="small">
        {system.discordMode === "mock" ? "Discord not configured yet. Safe read-only command scaffolding is ready." : "Discord credentials detected."}
      </p>
      <div className="list">
        {["/status", "/agents", "/tasks", "/health"].map((command) => (
          <div className="row" key={command}>{command}</div>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel({ system }: { system: SystemResponse }) {
  return (
    <section className="panel">
      <h3>Settings & Flags</h3>
      <div className="list">
        {Object.entries(system.features ?? {}).map(([key, enabled]) => (
          <div className="row" key={key}>
            <div className="row-title">
              <span>{key}</span>
              <span className={`status ${enabled ? "online" : "blocked"}`}>{enabled ? "enabled" : "disabled"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LocalAiPanel({
  consoleState,
  setConsoleState,
  onRunLocalAi
}: {
  consoleState: ConsoleState;
  setConsoleState: Dispatch<SetStateAction<ConsoleState>>;
  onRunLocalAi: () => Promise<void>;
}) {
  return (
    <section className="panel">
      <h3>Local AI Console</h3>
      <p className="small">Uses Ollama when `AGENTOS_MODEL_PROVIDER=ollama`. Safe local request only, no tool execution.</p>
      <label className="field">
        <span>Model</span>
        <input value={consoleState.model} onChange={(event) => setConsoleState((current) => ({ ...current, model: event.target.value }))} />
      </label>
      <label className="field">
        <span>Prompt</span>
        <textarea
          rows={6}
          value={consoleState.prompt}
          onChange={(event) => setConsoleState((current) => ({ ...current, prompt: event.target.value }))}
        />
      </label>
      <div className="button-row">
        <button className="btn btn-strong" disabled={consoleState.loading || !consoleState.prompt.trim()} onClick={() => void onRunLocalAi()}>
          {consoleState.loading ? "Running..." : "Run Local AI"}
        </button>
      </div>
      {consoleState.error ? <p className="small error-text">{consoleState.error}</p> : null}
      {consoleState.response ? (
        <div className="row">
          <div className="row-title">
            <span>Response</span>
            <span className="small">{consoleState.savedMemoryId ? "saved to memory" : "not saved"}</span>
          </div>
          <p className="small">{consoleState.response}</p>
        </div>
      ) : null}
    </section>
  );
}

function SystemPanel({
  apiOnline,
  system,
  memories
}: {
  apiOnline: boolean;
  system: SystemResponse;
  memories: MemoryRecord[];
}) {
  return (
    <>
      <section className="panel">
        <h3>System Health</h3>
        <div className="list">
          <div className="row"><div className="row-title"><span>Command Center</span><span className="status">online</span></div></div>
          <div className="row"><div className="row-title"><span>API</span><span className="status">{apiOnline ? "online" : "fallback"}</span></div></div>
          <div className="row"><div className="row-title"><span>Gateway</span><span className="status">{system.gateway}</span></div></div>
          <div className="row"><div className="row-title"><span>Worker</span><span className="status">{system.worker}</span></div></div>
          <div className="row"><div className="row-title"><span>Discord</span><span className="status">{system.discordMode}</span></div></div>
        </div>
      </section>
      <section className="panel">
        <h3>Recent Memory Signal</h3>
        <div className="list">
          {memories.slice(0, 4).map((memory) => (
            <div className="row" key={memory.id}>
              <div className="row-title">
                <span>{memory.title}</span>
                <span className="small">{memory.type}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
