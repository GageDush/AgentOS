"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  AgentProfile,
  ApprovalRecord,
  AuditEvent,
  LoadoutItem,
  MemoryRecord,
  MissionRecord,
  MissionRun,
  MissionRunLog,
  RoutineRecord,
  SandboxPermissionLevel,
  SessionRecord
} from "@agentos/shared";

const apiBase = process.env.NEXT_PUBLIC_AGENTOS_API_URL ?? "http://localhost:8787";

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

type DashboardPayload = {
  agents: AgentProfile[];
  missions: MissionRecord[];
  runs: MissionRun[];
  approvals: ApprovalRecord[];
  audit: AuditEvent[];
  archive: MemoryRecord[];
  routines: RoutineRecord[];
  loadout: LoadoutItem[];
  sessions: SessionRecord[];
  usage: {
    dailySpend: number;
    monthlySpend: number;
    dailyLimit: number;
    monthlyLimit: number;
    warningThresholdPercent: number;
    totalTokens: number;
  };
  system: {
    api: string;
    worker: string;
    gateway: string;
    discordMode: string;
    providerMode: string;
  };
};

type MissionDraft = {
  title: string;
  objective: string;
  prompt: string;
  command: string;
  sandboxLevel: SandboxPermissionLevel;
  provider: "mock" | "ollama";
  model: string;
};

const navItems: Array<{ href: string; key: SectionKey; label: string }> = [
  { href: "/", key: "dashboard", label: "Command Center" },
  { href: "/missions", key: "missions", label: "Missions" },
  { href: "/routines", key: "routines", label: "Routines" },
  { href: "/operators", key: "operators", label: "Operators" },
  { href: "/control-gate", key: "control-gate", label: "Control Gate" },
  { href: "/blackbox", key: "blackbox", label: "Blackbox" },
  { href: "/archive", key: "archive", label: "Archive" },
  { href: "/loadout", key: "loadout", label: "Loadout" },
  { href: "/settings", key: "settings", label: "Settings" }
];

const defaultDraft: MissionDraft = {
  title: "Validate local command center quality gate",
  objective: "Create a local mission, plan the run, request approval, then execute a safe repository command.",
  prompt: "Review the mission, explain the command intent, and note any local risks before execution.",
  command: "pnpm typecheck",
  sandboxLevel: "workspace_write",
  provider: "mock",
  model: "mock-agentos-local"
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

export function AgentOSLocalApp({ section }: { section: SectionKey }) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [draft, setDraft] = useState<MissionDraft>(defaultDraft);
  const [activeRunId, setActiveRunId] = useState<string>();
  const [activeLogs, setActiveLogs] = useState<MissionRunLog[]>([]);
  const [busyAction, setBusyAction] = useState<string>();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const nextData = await getJson<DashboardPayload>("/dashboard", {
        agents: [],
        missions: [],
        runs: [],
        approvals: [],
        audit: [],
        archive: [],
        routines: [],
        loadout: [],
        sessions: [],
        usage: {
          dailySpend: 0,
          monthlySpend: 0,
          dailyLimit: 0,
          monthlyLimit: 0,
          warningThresholdPercent: 80,
          totalTokens: 0
        },
        system: {
          api: "offline",
          worker: "offline",
          gateway: "offline",
          discordMode: "mock",
          providerMode: "mock"
        }
      });
      if (!mounted) return;
      startTransition(() => {
        setData(nextData);
        setActiveRunId((current) => current ?? nextData.runs[0]?.id);
      });
    };

    void refresh();
    const interval = setInterval(refresh, 2500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!activeRunId) return;

    const refreshLogs = async () => {
      const logs = await getJson<MissionRunLog[]>(`/runs/${activeRunId}/logs`, []);
      if (!mounted) return;
      setActiveLogs(logs);
    };

    void refreshLogs();
    const interval = setInterval(refreshLogs, 1200);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeRunId]);

  const activeRun = useMemo(() => data?.runs.find((run) => run.id === activeRunId), [data?.runs, activeRunId]);
  const activeMission = useMemo(() => data?.missions.find((mission) => mission.latestRunId === activeRunId), [data?.missions, activeRunId]);
  const pendingApprovals = data?.approvals.filter((approval) => approval.status === "pending") ?? [];

  async function refreshDashboard() {
    const nextData = await getJson<DashboardPayload>("/dashboard", data as DashboardPayload);
    startTransition(() => {
      setData(nextData);
      if (!activeRunId) setActiveRunId(nextData.runs[0]?.id);
    });
  }

  async function createMissionAndRun() {
    setBusyAction("create-mission");
    setError("");
    try {
      const createdResponse = await fetch(`${apiBase}/missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const mission = (await createdResponse.json()) as MissionRecord;
      const runResponse = await fetch(`${apiBase}/missions/${mission.id}/run`, { method: "POST" });
      const runPayload = (await runResponse.json()) as { run: MissionRun };
      setActiveRunId(runPayload.run.id);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mission creation failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function runMission(missionId: string) {
    setBusyAction(`run-${missionId}`);
    setError("");
    try {
      const response = await fetch(`${apiBase}/missions/${missionId}/run`, { method: "POST" });
      const payload = (await response.json()) as { run: MissionRun };
      setActiveRunId(payload.run.id);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mission run failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function resolveApprovalAction(approval: ApprovalRecord, mode: "approve-once" | "approve-for-mission" | "deny") {
    setBusyAction(`${mode}-${approval.id}`);
    setError("");
    try {
      const endpoint =
        mode === "approve-once"
          ? `/approvals/${approval.id}/approve-once`
          : mode === "approve-for-mission"
            ? `/approvals/${approval.id}/approve-for-mission`
            : `/approvals/${approval.id}/deny`;

      await fetch(`${apiBase}${endpoint}`, { method: "POST" });
      if (mode !== "deny" && approval.runId) {
        await fetch(`${apiBase}/runs/${approval.runId}/continue`, { method: "POST" });
        setActiveRunId(approval.runId);
      }
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Approval action failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  if (!data) {
    return <main className="local-shell"><div className="loading-state">Loading AgentOS Local…</div></main>;
  }

  return (
    <main className="local-shell">
      <div className="ambient-grid" />
      <aside className="local-nav">
        <div className="nav-brand">
          <p className="nav-kicker">AgentOS Local</p>
          <h1>Developer Operations Hub</h1>
          <p>Schedule, run, approve, and observe local AI missions without leaving your machine.</p>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <Link className={`nav-link ${item.key === section ? "nav-link-active" : ""}`} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <Link className="nav-link nav-link-muted" href="/demo/office">
            Deprecated Office Demo
          </Link>
        </nav>
        <div className="nav-meta">
          <StatPill label="API" value={data.system.api} />
          <StatPill label="Gateway" value={data.system.gateway} />
          <StatPill label="Provider" value={data.system.providerMode} />
        </div>
      </aside>

      <section className="local-main">
        <header className="hero-bar">
          <div>
            <p className="hero-kicker">{labelForSection(section)}</p>
            <h2>{titleForSection(section)}</h2>
            <p className="hero-copy">{descriptionForSection(section)}</p>
          </div>
          <div className="hero-metrics">
            <MetricCard label="Active Missions" value={String(data.missions.filter((mission) => mission.status !== "completed").length)} />
            <MetricCard label="Pending Gate" value={String(pendingApprovals.length)} />
            <MetricCard label="Sessions" value={String(data.sessions.length)} />
            <MetricCard label="Tokens" value={String(data.usage.totalTokens)} />
          </div>
        </header>

        {error ? <div className="alert error-alert">{error}</div> : null}

        <div className="content-grid">
          <section className="primary-column">
            {section === "dashboard" ? (
              <DashboardView
                data={data}
                activeRun={activeRun}
                activeMission={activeMission}
                activeLogs={activeLogs}
                onRunMission={runMission}
              />
            ) : null}
            {section === "missions" ? (
              <MissionsView
                data={data}
                draft={draft}
                setDraft={setDraft}
                busyAction={busyAction}
                activeRunId={activeRunId}
                onCreateMissionAndRun={createMissionAndRun}
                onRunMission={runMission}
                onSelectRun={setActiveRunId}
              />
            ) : null}
            {section === "routines" ? <RoutinesView routines={data.routines} /> : null}
            {section === "operators" ? <OperatorsView agents={data.agents} sessions={data.sessions} /> : null}
            {section === "control-gate" ? (
              <ControlGateView approvals={pendingApprovals} busyAction={busyAction} onResolveApproval={resolveApprovalAction} />
            ) : null}
            {section === "blackbox" ? <BlackboxView audit={data.audit} activeLogs={activeLogs} /> : null}
            {section === "archive" ? <ArchiveView archive={data.archive} /> : null}
            {section === "loadout" ? <LoadoutView loadout={data.loadout} /> : null}
            {section === "settings" ? <SettingsView data={data} /> : null}
          </section>

          <aside className="secondary-column">
            <RunInspector
              mission={activeMission}
              run={activeRun}
              logs={activeLogs}
              approvals={pendingApprovals}
              onResolveApproval={resolveApprovalAction}
              busyAction={busyAction}
            />
            <RecentHistory runs={data.runs} missions={data.missions} onSelectRun={setActiveRunId} activeRunId={activeRunId} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function labelForSection(section: SectionKey) {
  if (section === "dashboard") return "Command Center";
  if (section === "control-gate") return "Operator Approval Surface";
  return section.replace("-", " ");
}

function titleForSection(section: SectionKey) {
  switch (section) {
    case "dashboard":
      return "Local-first mission control";
    case "missions":
      return "Create and supervise mission runs";
    case "routines":
      return "Scheduled automations, kept mock-first";
    case "operators":
      return "Agent roster and long-running sessions";
    case "control-gate":
      return "Permission decisions with audit trail";
    case "blackbox":
      return "Live execution story and operator trace";
    case "archive":
      return "Mission memory and archived results";
    case "loadout":
      return "Local models, tools, and integration posture";
    case "settings":
      return "System mode and local runtime configuration";
  }
}

function descriptionForSection(section: SectionKey) {
  switch (section) {
    case "dashboard":
      return "The first vertical slice is live: create a mission, pause at Control Gate when needed, execute a safe command, and keep the result in history.";
    case "missions":
      return "Mission records now drive the app instead of the deprecated office scene.";
    case "control-gate":
      return "Approve once, deny, or approve for the whole mission with an audit event for every decision.";
    default:
      return "AgentOS Local stays mock-first, local-safe, and ready for Ollama when you want it.";
  }
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="panel-card">
      <div className="panel-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function DashboardView({
  data,
  activeRun,
  activeMission,
  activeLogs,
  onRunMission
}: {
  data: DashboardPayload;
  activeRun?: MissionRun;
  activeMission?: MissionRecord;
  activeLogs: MissionRunLog[];
  onRunMission: (missionId: string) => Promise<void>;
}) {
  const pendingApprovals = data.approvals.filter((approval) => approval.status === "pending");
  return (
    <>
      <Panel title="First Vertical Slice" subtitle="Create mission -> plan -> gate -> execute -> archive">
        <div className="snapshot-grid">
          <Snapshot label="Missions" value={String(data.missions.length)} copy="One-off agent jobs with run history." />
          <Snapshot label="Approvals" value={String(pendingApprovals.length)} copy="Control Gate requests waiting on an operator." />
          <Snapshot label="Archive" value={String(data.archive.length)} copy="Saved mission outputs and decision memory." />
          <Snapshot label="Sessions" value={String(data.sessions.length)} copy="Long-running local work that can be resumed." />
        </div>
      </Panel>
      <Panel title="Current Focus" subtitle={activeMission ? activeMission.title : "Pick or run a mission to inspect it."}>
        <div className="focus-card">
          <div>
            <strong>{activeMission?.objective ?? "No mission selected"}</strong>
            <p>{activeRun?.resultSummary ?? activeRun?.error ?? "This panel follows the newest run and its logs."}</p>
          </div>
          {activeMission ? (
            <button className="primary-button" onClick={() => void onRunMission(activeMission.id)}>
              Run Again
            </button>
          ) : null}
        </div>
        <div className="log-preview">
          {activeLogs.slice(-4).map((log) => (
            <div className="log-line" key={log.id}>
              <span className={`log-level log-level-${log.level}`}>{log.level}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Recent Missions" subtitle="Latest command-center activity">
        <div className="table-list">
          {data.missions.slice(0, 6).map((mission) => (
            <div className="table-row" key={mission.id}>
              <div>
                <strong>{mission.title}</strong>
                <p>{mission.command}</p>
              </div>
              <div className="row-meta">
                <span className={`status-chip status-chip-${mission.status}`}>{mission.status}</span>
                <span>{mission.sandboxLevel}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function MissionsView({
  data,
  draft,
  setDraft,
  busyAction,
  activeRunId,
  onCreateMissionAndRun,
  onRunMission,
  onSelectRun
}: {
  data: DashboardPayload;
  draft: MissionDraft;
  setDraft: Dispatch<SetStateAction<MissionDraft>>;
  busyAction?: string;
  activeRunId?: string;
  onCreateMissionAndRun: () => Promise<void>;
  onRunMission: (missionId: string) => Promise<void>;
  onSelectRun: (runId: string) => void;
}) {
  return (
    <>
      <Panel title="Compose Mission" subtitle="Defaulted to a gated safe-command run so the full flow is visible.">
        <div className="form-grid">
          <label>
            <span>Title</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Command</span>
            <input value={draft.command} onChange={(event) => setDraft((current) => ({ ...current, command: event.target.value }))} />
          </label>
          <label className="wide-field">
            <span>Objective</span>
            <textarea rows={3} value={draft.objective} onChange={(event) => setDraft((current) => ({ ...current, objective: event.target.value }))} />
          </label>
          <label className="wide-field">
            <span>Prompt</span>
            <textarea rows={4} value={draft.prompt} onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} />
          </label>
          <label>
            <span>Sandbox Level</span>
            <select value={draft.sandboxLevel} onChange={(event) => setDraft((current) => ({ ...current, sandboxLevel: event.target.value as SandboxPermissionLevel }))}>
              {[
                "observe",
                "workspace_write",
                "safe_execute",
                "network_limited",
                "dependency_install",
                "external_action",
                "repo_mutation",
                "system_elevated"
              ].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Provider</span>
            <select value={draft.provider} onChange={(event) => setDraft((current) => ({ ...current, provider: event.target.value as "mock" | "ollama" }))}>
              <option value="mock">mock</option>
              <option value="ollama">ollama</option>
            </select>
          </label>
          <label className="wide-field">
            <span>Model</span>
            <input value={draft.model} onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))} />
          </label>
        </div>
        <div className="button-row">
          <button className="primary-button" disabled={busyAction === "create-mission"} onClick={() => void onCreateMissionAndRun()}>
            {busyAction === "create-mission" ? "Creating…" : "Create Mission and Run"}
          </button>
        </div>
      </Panel>
      <Panel title="Mission Queue" subtitle="Select a run to inspect live logs on the right.">
        <div className="table-list">
          {data.missions.map((mission) => (
            <div className="table-row" key={mission.id}>
              <div>
                <strong>{mission.title}</strong>
                <p>{mission.objective}</p>
                <p className="command-line">{mission.command}</p>
              </div>
              <div className="row-actions">
                <span className={`status-chip status-chip-${mission.status}`}>{mission.status}</span>
                <button className="secondary-button" disabled={busyAction === `run-${mission.id}`} onClick={() => void onRunMission(mission.id)}>
                  {busyAction === `run-${mission.id}` ? "Running…" : "Run"}
                </button>
                {mission.latestRunId ? (
                  <button className={`ghost-button ${activeRunId === mission.latestRunId ? "ghost-button-active" : ""}`} onClick={() => onSelectRun(mission.latestRunId!)}>
                    Inspect
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function RoutinesView({ routines }: { routines: RoutineRecord[] }) {
  return (
    <Panel title="Routines" subtitle="Scheduled automations stay mock-first for this pivot slice.">
      <div className="table-list">
        {routines.map((routine) => (
          <div className="table-row" key={routine.id}>
            <div>
              <strong>{routine.title}</strong>
              <p>{routine.objective}</p>
            </div>
            <div className="row-meta">
              <span className={`status-chip status-chip-${routine.enabled ? "running" : "queued"}`}>{routine.enabled ? "enabled" : "disabled"}</span>
              <span>{routine.frequency}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OperatorsView({ agents, sessions }: { agents: AgentProfile[]; sessions: SessionRecord[] }) {
  return (
    <>
      <Panel title="Operators" subtitle="Agent roster reused from the existing mock team.">
        <div className="table-list">
          {agents.map((agent) => (
            <div className="table-row" key={agent.id}>
              <div>
                <strong>{agent.name}</strong>
                <p>{agent.role}</p>
              </div>
              <div className="row-meta">
                <span className={`status-chip status-chip-${agent.status}`}>{agent.status}</span>
                <span>{agent.workload}% load</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Sessions" subtitle="Resumable long-running work.">
        <div className="table-list">
          {sessions.map((session) => (
            <div className="table-row" key={session.id}>
              <div>
                <strong>{session.title}</strong>
                <p>{session.summary}</p>
              </div>
              <div className="row-meta">
                <span className={`status-chip status-chip-${session.status}`}>{session.status}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function ControlGateView({
  approvals,
  busyAction,
  onResolveApproval
}: {
  approvals: ApprovalRecord[];
  busyAction?: string;
  onResolveApproval: (approval: ApprovalRecord, mode: "approve-once" | "approve-for-mission" | "deny") => Promise<void>;
}) {
  return (
    <Panel title="Control Gate" subtitle="Every risky action becomes a logged decision.">
      <div className="table-list">
        {approvals.length === 0 ? <div className="empty-state">No pending approvals.</div> : null}
        {approvals.map((approval) => (
          <div className="approval-card" key={approval.id}>
            <div className="row-title-inline">
              <strong>{approval.tool}</strong>
              <span className="status-chip status-chip-awaiting_approval">{approval.permissionLevel}</span>
            </div>
            <p>{approval.inputSummary}</p>
            {approval.command ? <p className="command-line">{approval.command}</p> : null}
            <div className="button-row">
              <button className="primary-button" disabled={busyAction === `approve-once-${approval.id}`} onClick={() => void onResolveApproval(approval, "approve-once")}>
                Approve Once
              </button>
              <button className="secondary-button" disabled={busyAction === `approve-for-mission-${approval.id}`} onClick={() => void onResolveApproval(approval, "approve-for-mission")}>
                Approve for Mission
              </button>
              <button className="danger-button" disabled={busyAction === `deny-${approval.id}`} onClick={() => void onResolveApproval(approval, "deny")}>
                Deny
              </button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BlackboxView({ audit, activeLogs }: { audit: AuditEvent[]; activeLogs: MissionRunLog[] }) {
  return (
    <>
      <Panel title="Live Logs" subtitle="Polled from the active mission run.">
        <div className="log-preview full-log">
          {activeLogs.length === 0 ? <div className="empty-state">Run a mission to stream logs here.</div> : null}
          {activeLogs.map((log) => (
            <div className="log-line" key={log.id}>
              <span className={`log-level log-level-${log.level}`}>{log.level}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Audit Trail" subtitle="Blackbox records every decision and completion event.">
        <div className="table-list">
          {audit.slice(0, 20).map((event) => (
            <div className="table-row" key={event.id}>
              <div>
                <strong>{event.event}</strong>
                <p>{event.summary}</p>
              </div>
              <div className="row-meta">
                <span>{event.actor}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function ArchiveView({ archive }: { archive: MemoryRecord[] }) {
  return (
    <Panel title="Archive" subtitle="Mission output, memory, and operator notes.">
      <div className="table-list">
        {archive.map((memory) => (
          <div className="table-row" key={memory.id}>
            <div>
              <strong>{memory.title}</strong>
              <p>{memory.content}</p>
            </div>
            <div className="row-meta">
              <span className="status-chip status-chip-completed">{memory.type}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function LoadoutView({ loadout }: { loadout: LoadoutItem[] }) {
  return (
    <Panel title="Loadout" subtitle="Local model posture, policies, and tooling integrations.">
      <div className="table-list">
        {loadout.map((item) => (
          <div className="table-row" key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <p>{item.summary}</p>
            </div>
            <div className="row-meta">
              <span className={`status-chip status-chip-${item.status}`}>{item.status}</span>
              <span>{item.kind}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SettingsView({ data }: { data: DashboardPayload }) {
  return (
    <>
      <Panel title="Runtime Mode" subtitle="Mock-first by default, Ollama when you opt in.">
        <div className="settings-grid">
          <Setting label="Provider mode" value={data.system.providerMode} />
          <Setting label="Gateway" value={data.system.gateway} />
          <Setting label="Discord" value={data.system.discordMode} />
          <Setting label="Monthly budget" value={`$${data.usage.monthlyLimit.toFixed(2)}`} />
        </div>
      </Panel>
      <Panel title="Policy Snapshot" subtitle="Safe commands are small by design during the pivot.">
        <div className="policy-list">
          <div><strong>Auto-allowed:</strong> `git status`, `git diff`, `pnpm test`, `pnpm typecheck`, `pnpm lint`</div>
          <div><strong>Approval required:</strong> installs, repo writes, network access, `.env` reads</div>
          <div><strong>Denied:</strong> `sudo`, `rm -rf /`, unrestricted system writes</div>
        </div>
      </Panel>
    </>
  );
}

function RunInspector({
  mission,
  run,
  logs,
  approvals,
  onResolveApproval,
  busyAction
}: {
  mission?: MissionRecord;
  run?: MissionRun;
  logs: MissionRunLog[];
  approvals: ApprovalRecord[];
  onResolveApproval: (approval: ApprovalRecord, mode: "approve-once" | "approve-for-mission" | "deny") => Promise<void>;
  busyAction?: string;
}) {
  const approval = run?.approvalRequestId ? approvals.find((item) => item.id === run.approvalRequestId) : undefined;
  return (
    <>
      <Panel title="Run Inspector" subtitle={run ? run.id : "No run selected"}>
        {mission && run ? (
          <div className="inspector-stack">
            <div className="table-row">
              <div>
                <strong>{mission.title}</strong>
                <p>{mission.objective}</p>
                <p className="command-line">{mission.command}</p>
              </div>
              <div className="row-meta">
                <span className={`status-chip status-chip-${run.status}`}>{run.status}</span>
                <span>{mission.sandboxLevel}</span>
              </div>
            </div>
            <div className="mini-log">
              {logs.slice(-6).map((log) => (
                <div className="log-line" key={log.id}>
                  <span className={`log-level log-level-${log.level}`}>{log.level}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">Pick a mission run from the history list.</div>
        )}
      </Panel>
      {approval ? (
        <Panel title="Pending Decision" subtitle="The active run is paused at Control Gate.">
          <p>{approval.inputSummary}</p>
          {approval.command ? <p className="command-line">{approval.command}</p> : null}
          <div className="button-row">
            <button className="primary-button" disabled={busyAction === `approve-once-${approval.id}`} onClick={() => void onResolveApproval(approval, "approve-once")}>
              Approve Once
            </button>
            <button className="secondary-button" disabled={busyAction === `approve-for-mission-${approval.id}`} onClick={() => void onResolveApproval(approval, "approve-for-mission")}>
              Approve for Mission
            </button>
            <button className="danger-button" disabled={busyAction === `deny-${approval.id}`} onClick={() => void onResolveApproval(approval, "deny")}>
              Deny
            </button>
          </div>
        </Panel>
      ) : null}
    </>
  );
}

function RecentHistory({
  runs,
  missions,
  onSelectRun,
  activeRunId
}: {
  runs: MissionRun[];
  missions: MissionRecord[];
  onSelectRun: (runId: string) => void;
  activeRunId?: string;
}) {
  return (
    <Panel title="Run History" subtitle="Completed, blocked, and live mission runs.">
      <div className="table-list">
        {runs.map((run) => {
          const mission = missions.find((item) => item.id === run.missionId);
          return (
            <button className={`history-button ${activeRunId === run.id ? "history-button-active" : ""}`} key={run.id} onClick={() => onSelectRun(run.id)}>
              <div>
                <strong>{mission?.title ?? run.missionId}</strong>
                <p>{run.requestedCommand ?? "No command recorded"}</p>
              </div>
              <span className={`status-chip status-chip-${run.status}`}>{run.status}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function Snapshot({ label, value, copy }: { label: string; value: string; copy: string }) {
  return (
    <div className="snapshot-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{copy}</p>
    </div>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
