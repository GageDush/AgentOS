"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { ForgeDashboardShell } from "../forge/ForgeDashboardShell";
import { ForgeDashboardView } from "../forge/ForgeDashboardView";
import { ForgeControlGateView } from "../forge/ForgeControlGateView";
import {
  buildCommandPaletteItems,
  buildDefaultQuickActions,
  toActivityFeed,
  toAgentPresences,
  toApprovalItems,
  toDashboardStats,
  toHealthMetrics,
  toMissionControlData,
  toMissionTimeline,
  toQuickActions
} from "../forge/dashboard-adapters";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ForgeFaqAccordion,
  ForgeSectionHeader,
  ForgeSegmentedControl,
  ForgeStatCard,
  TerminalWindow,
  type ForgeFaqItem
} from "@agentos/ui";
import {
  apiGet,
  apiPost,
  discordLoginUrl,
  fetchAuthSession,
  logoutOperator,
  type OperatorAuthSession
} from "../../lib/agentos-api";
import type {
  AgentProfile,
  AgentRichQuickActionType,
  AgentRichMessageScope,
  AgentRoutingDecisionRecord,
  ApprovalRecord,
  QuotaStewardStatus,
  AuditEvent,
  ChatMessageRecord,
  ChatThreadRecord,
  LoadoutItem,
  MemoryRecord,
  MissionRecord,
  MissionRun,
  MissionRunLog,
  QuickActionRecord,
  RoutineRecord,
  SandboxPermissionLevel,
  SessionRecord,
  WorkspaceRecord,
  OperatorRecord
} from "@agentos/shared";

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
  workspaces: WorkspaceRecord[];
  operators: OperatorRecord[];
  agents: AgentProfile[];
  missions: MissionRecord[];
  runs: MissionRun[];
  approvals: ApprovalRecord[];
  audit: AuditEvent[];
  archive: MemoryRecord[];
  routines: RoutineRecord[];
  loadout: LoadoutItem[];
  sessions: SessionRecord[];
  quickActions: QuickActionRecord[];
  chatThreads: ChatThreadRecord[];
  chatMessages: ChatMessageRecord[];
  routingDecisions: AgentRoutingDecisionRecord[];
  usage: {
    dailySpend: number;
    monthlySpend: number;
    dailyLimit: number;
    monthlyLimit: number;
    warningThresholdPercent: number;
    totalTokens: number;
  };
  quota?: {
    allowed: boolean;
    warning: boolean;
    blocked: boolean;
    reason?: string;
    status: QuotaStewardStatus;
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
  createGitHubIssue: boolean;
};

type RoutineDraft = {
  title: string;
  objective: string;
  prompt: string;
  command: string;
  sandboxLevel: SandboxPermissionLevel;
  provider: "mock" | "ollama";
  model: string;
  frequency: "manual" | "hourly" | "daily" | "weekly";
};

type ProviderStatus = {
  defaultProvider: string;
  ollama: { available: boolean; message: string };
  mock: { available: boolean; message: string };
};

type PolicyPreview = {
  decision: {
    policy: "auto_allowed" | "approval_required" | "denied";
    permissionLevel: SandboxPermissionLevel;
    reason: string;
  };
  requestedLevel: SandboxPermissionLevel;
  requiresControlGate: boolean;
  explanation: string;
};

const sandboxLevels: SandboxPermissionLevel[] = [
  "observe",
  "workspace_write",
  "safe_execute",
  "network_limited",
  "dependency_install",
  "external_action",
  "repo_mutation",
  "system_elevated"
];

const defaultDraft: MissionDraft = {
  title: "Validate local command center quality gate",
  objective: "Create a local mission, plan the run, request approval, then execute a safe repository command.",
  prompt: "Review the mission, explain the command intent, and note any local risks before execution.",
  command: "pnpm typecheck",
  sandboxLevel: "workspace_write",
  provider: "ollama",
  model: "qwen2.5-coder:7b",
  createGitHubIssue: false
};

const defaultRoutineDraft: RoutineDraft = {
  title: "Nightly quality gate",
  objective: "Run a recurring local quality check with a clear approval posture.",
  prompt: "Summarize the routine intent, local impact, and any approval boundary before the command runs.",
  command: "pnpm typecheck",
  sandboxLevel: "workspace_write",
  provider: "mock",
  model: "mock-agentos-local",
  frequency: "daily"
};

export function AgentOSLocalApp({ section }: { section: SectionKey }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [draft, setDraft] = useState<MissionDraft>(defaultDraft);
  const [routineDraft, setRoutineDraft] = useState<RoutineDraft>(defaultRoutineDraft);
  const [activeRunId, setActiveRunId] = useState<string>();
  const [activeLogs, setActiveLogs] = useState<MissionRunLog[]>([]);
  const [policyPreview, setPolicyPreview] = useState<PolicyPreview>();
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>();
  const [busyAction, setBusyAction] = useState<string>();
  const [busyRichAction, setBusyRichAction] = useState<AgentRichQuickActionType>();
  const [chatDraft, setChatDraft] = useState("show details");
  const [error, setError] = useState("");
  const [operatorAuth, setOperatorAuth] = useState<OperatorAuthSession | null>(null);

  useEffect(() => {
    let mounted = true;
    const refreshAuth = async () => {
      const auth = await fetchAuthSession();
      if (!mounted) return;
      setOperatorAuth(auth.authenticated ? auth.session : null);
    };
    void refreshAuth();
    const interval = setInterval(refreshAuth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const nextData = await apiGet<DashboardPayload>("/dashboard", {
        workspaces: [],
        operators: [],
        agents: [],
        missions: [],
        runs: [],
        approvals: [],
        audit: [],
        archive: [],
        routines: [],
        loadout: [],
        sessions: [],
        quickActions: [],
        chatThreads: [],
        chatMessages: [],
        routingDecisions: [],
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
      const logs = await apiGet<MissionRunLog[]>(`/runs/${activeRunId}/logs`, []);
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

  useEffect(() => {
    let mounted = true;
    const refreshAux = async () => {
      const [nextPolicy, nextProviderStatus] = await Promise.all([
        apiGet<PolicyPreview>(
          `/policy/check?command=${encodeURIComponent(draft.command)}&sandboxLevel=${encodeURIComponent(draft.sandboxLevel)}`,
          {
            decision: {
              policy: "approval_required",
              permissionLevel: "safe_execute",
              reason: "Policy preview unavailable."
            },
            requestedLevel: draft.sandboxLevel,
            requiresControlGate: true,
            explanation: "Policy preview unavailable."
          }
        ),
        apiGet<ProviderStatus>("/providers/status", {
          defaultProvider: "mock",
          ollama: { available: false, message: "Ollama status unavailable." },
          mock: { available: true, message: "Mock provider is always available." }
        })
      ]);
      if (!mounted) return;
      setPolicyPreview(nextPolicy);
      setProviderStatus(nextProviderStatus);
    };

    void refreshAux();
    return () => {
      mounted = false;
    };
  }, [draft.command, draft.sandboxLevel]);

  const activeRun = useMemo(() => data?.runs.find((run) => run.id === activeRunId), [data?.runs, activeRunId]);
  const activeMission = useMemo(() => data?.missions.find((mission) => mission.latestRunId === activeRunId), [data?.missions, activeRunId]);
  const pendingApprovals = data?.approvals.filter((approval) => approval.status === "pending") ?? [];
  const activeThread = useMemo(
    () =>
      data?.chatThreads.find((thread) => thread.id === activeMission?.activeThreadId) ??
      data?.chatThreads[0],
    [data?.chatThreads, activeMission?.activeThreadId]
  );
  const activeQuickActions = useMemo(
    () =>
      (data?.quickActions ?? []).filter(
        (action) =>
          !action.consumedAt &&
          (!activeMission || action.missionId === activeMission.id || action.runId === activeRun?.id || action.approvalRequestId === activeRun?.approvalRequestId)
      ),
    [data?.quickActions, activeMission, activeRun]
  );
  const activeRoute = useMemo(
    () => data?.routingDecisions.find((route) => route.id === activeRun?.routeDecisionId),
    [data?.routingDecisions, activeRun?.routeDecisionId]
  );

  async function refreshDashboard() {
    const nextData = await apiGet<DashboardPayload>("/dashboard", data as DashboardPayload);
    startTransition(() => {
      setData(nextData);
      if (!activeRunId) setActiveRunId(nextData.runs[0]?.id);
    });
  }

  async function createMissionAndRun() {
    setBusyAction("create-mission");
    setError("");
    try {
      const { createGitHubIssue, ...missionBody } = draft;
      const mission = await apiPost<MissionRecord>("/missions", {
        ...missionBody,
        createGitHubIssue,
        metadata: createGitHubIssue ? { createGitHubIssue: true } : undefined
      });
      const runPayload = await apiPost<{ run: MissionRun }>(`/missions/${mission.id}/run`);
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
      const payload = await apiPost<{ run: MissionRun }>(`/missions/${missionId}/run`);
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

      await apiPost(endpoint);
      if (mode !== "deny" && approval.runId) {
        await apiPost(`/runs/${approval.runId}/continue`);
        setActiveRunId(approval.runId);
      }
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Approval action failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function executeRichQuickActionHandler(
    actionType: AgentRichQuickActionType,
    scope?: AgentRichMessageScope
  ) {
    setBusyRichAction(actionType);
    setError("");
    try {
      const result = await apiPost<{
        ok: boolean;
        summary: string;
        runId?: string;
      }>("/rich-actions/execute", {
        actionType,
        scope: scope ?? {},
        threadId: activeThread?.id
      });
      if (!result.ok) {
        setError(result.summary);
        return;
      }
      if (actionType === "approve" && result.runId) {
        setActiveRunId(result.runId);
      }
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Rich action failed.");
    } finally {
      setBusyRichAction(undefined);
    }
  }

  async function createRoutineAction() {
    setBusyAction("create-routine");
    setError("");
    try {
      await apiPost("/routines", routineDraft);
      setRoutineDraft(defaultRoutineDraft);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Routine creation failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function toggleRoutineAction(routineId: string) {
    setBusyAction(`toggle-routine-${routineId}`);
    setError("");
    try {
      await apiPost(`/routines/${routineId}/toggle`);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Routine update failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function runRoutineAction(routineId: string) {
    setBusyAction(`run-routine-${routineId}`);
    setError("");
    try {
      const payload = await apiPost<{ run: MissionRun }>(`/routines/${routineId}/run`);
      setActiveRunId(payload.run.id);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Routine run failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function pauseSessionAction(sessionId: string) {
    setBusyAction(`pause-session-${sessionId}`);
    setError("");
    try {
      await apiPost(`/sessions/${sessionId}/pause`);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Session pause failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function resumeSessionAction(sessionId: string) {
    setBusyAction(`resume-session-${sessionId}`);
    setError("");
    try {
      await apiPost(`/sessions/${sessionId}/resume`);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Session resume failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function sendChatMessage() {
    if (!activeThread || !chatDraft.trim()) return;
    setBusyAction("send-chat");
    setError("");
    try {
      await apiPost(`/chat/threads/${activeThread.id}/messages`, { content: chatDraft });
      setChatDraft("");
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chat message failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function consumeQuickAction(actionId: string) {
    setBusyAction(`quick-${actionId}`);
    setError("");
    try {
      const payload = await apiPost<{ runId?: string }>(`/quick-actions/${actionId}/consume`);
      if (payload.runId) setActiveRunId(payload.runId);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Quick action failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  const healthMetrics = useMemo(
    () =>
      data
        ? toHealthMetrics({
            system: data.system,
            agents: data.agents,
            runs: data.runs,
            pendingApprovals: pendingApprovals.length
          })
        : [],
    [data, pendingApprovals.length]
  );

  const commandItems = useMemo(
    () =>
      data
        ? buildCommandPaletteItems({
            quickActions: data.quickActions,
            agents: data.agents,
            recentMessages: data.chatMessages.slice(-5).map((m) => m.content)
          })
        : [],
    [data]
  );

  const forgeQuickActions = useMemo(() => {
    const fromApi = data ? toQuickActions(activeQuickActions) : [];
    return fromApi.length > 0 ? fromApi : buildDefaultQuickActions();
  }, [data, activeQuickActions]);

  async function handleForgeQuickAction(actionId: string) {
    if (actionId === "open-approvals") {
      router.push("/control-gate");
      return;
    }
    if (actionId === "start-mission" || actionId === "run-tests") {
      router.push("/missions");
      return;
    }
    if (actionId === "sync-memory") {
      router.push("/archive");
      return;
    }
    if (actionId === "inspect-server") {
      router.push("/settings");
      return;
    }
    if (actionId === "generate-ui") {
      router.push("/preview/forge");
      return;
    }
    const match = activeQuickActions.find((a) => a.id === actionId);
    if (match) await consumeQuickAction(actionId);
  }

  if (!data) {
    return (
      <main className="forge-root" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="loading-state">Loading AgentOS Forge...</div>
      </main>
    );
  }

  return (
    <ForgeDashboardShell
      section={section}
      healthMetrics={healthMetrics}
      commandItems={commandItems}
      pendingApprovals={pendingApprovals.length}
    >
      <section className="forge-page-grid">
        <ForgeSectionHeader
          kicker={labelForSection(section)}
          title={titleForSection(section)}
          accentWord={section === "control-gate" ? "Approval" : undefined}
          copy={descriptionForSection(section)}
          actions={
            <OperatorAuthCard
              session={operatorAuth}
              onLogout={async () => {
                await logoutOperator();
                setOperatorAuth(null);
              }}
            />
          }
        />

        {error ? <div className="alert error-alert">{error}</div> : null}

        {section === "dashboard" ? (
          <ForgeDashboardView
            stats={toDashboardStats({
              missions: data.missions.length,
              pendingApprovals: pendingApprovals.length,
              archive: data.archive.length,
              sessions: data.sessions.length
            })}
            missionControl={toMissionControlData({
              mission: activeMission,
              run: activeRun,
              route: activeRoute,
              logs: activeLogs,
              tools: data.loadout.map((item) => item.name)
            })}
            activity={toActivityFeed(data.audit, activeLogs)}
            agents={toAgentPresences(data.agents, activeRun, activeRoute)}
            timeline={toMissionTimeline(activeRun, activeLogs)}
            approvals={toApprovalItems(pendingApprovals)}
            quickActions={forgeQuickActions}
            onRunAgain={activeMission ? () => void runMission(activeMission.id) : undefined}
            onQuickAction={(id) => void handleForgeQuickAction(id)}
            onAllowOnce={(id) => {
              const approval = pendingApprovals.find((a) => a.id === id);
              if (approval) void resolveApprovalAction(approval, "approve-once");
            }}
            onAllowMission={(id) => {
              const approval = pendingApprovals.find((a) => a.id === id);
              if (approval) void resolveApprovalAction(approval, "approve-for-mission");
            }}
            onDeny={(id) => {
              const approval = pendingApprovals.find((a) => a.id === id);
              if (approval) void resolveApprovalAction(approval, "deny");
            }}
            busyId={busyAction}
          />
        ) : null}
            {section === "missions" ? (
              <MissionsView
                data={data}
                draft={draft}
                setDraft={setDraft}
                policyPreview={policyPreview}
                providerStatus={providerStatus}
                busyAction={busyAction}
                activeRunId={activeRunId}
                onCreateMissionAndRun={createMissionAndRun}
                onRunMission={runMission}
                onSelectRun={setActiveRunId}
              />
            ) : null}
            {section === "routines" ? (
              <RoutinesView
                routines={data.routines}
                draft={routineDraft}
                setDraft={setRoutineDraft}
                busyAction={busyAction}
                onCreateRoutine={createRoutineAction}
                onToggleRoutine={toggleRoutineAction}
                onRunRoutine={runRoutineAction}
              />
            ) : null}
            {section === "operators" ? (
              <OperatorsView
                agents={data.agents}
                sessions={data.sessions}
                busyAction={busyAction}
                onPauseSession={pauseSessionAction}
                onResumeSession={resumeSessionAction}
              />
            ) : null}
        {section === "control-gate" ? (
          <ForgeControlGateView
            approvals={toApprovalItems(pendingApprovals)}
            pendingApprovals={pendingApprovals}
            operatorName={data.operators[0]?.displayName ?? "Operator"}
            busyId={busyAction}
            busyRichAction={busyRichAction}
            onRichAction={executeRichQuickActionHandler}
            onAllowOnce={(id) => {
              const approval = pendingApprovals.find((a) => a.id === id);
              if (approval) void resolveApprovalAction(approval, "approve-once");
            }}
            onAllowMission={(id) => {
              const approval = pendingApprovals.find((a) => a.id === id);
              if (approval) void resolveApprovalAction(approval, "approve-for-mission");
            }}
            onDeny={(id) => {
              const approval = pendingApprovals.find((a) => a.id === id);
              if (approval) void resolveApprovalAction(approval, "deny");
            }}
          />
        ) : null}
        {section === "blackbox" ? <BlackboxView audit={data.audit} activeLogs={activeLogs} /> : null}
        {section === "archive" ? <ArchiveView archive={data.archive} /> : null}
        {section === "loadout" ? <LoadoutView loadout={data.loadout} providerStatus={providerStatus} /> : null}
        {section === "settings" ? <SettingsView data={data} providerStatus={providerStatus} /> : null}
      </section>

      <aside className="forge-sidebar-panel">
            <RunInspector
              mission={activeMission}
              run={activeRun}
              route={activeRoute}
              logs={activeLogs}
              approvals={pendingApprovals}
              quickActions={activeQuickActions}
              onResolveApproval={resolveApprovalAction}
              onConsumeQuickAction={consumeQuickAction}
              busyAction={busyAction}
            />
            <ConversationPanel
              thread={activeThread}
              messages={data.chatMessages}
              quickActions={activeQuickActions}
              chatDraft={chatDraft}
              setChatDraft={setChatDraft}
              busyAction={busyAction}
              onSendChat={sendChatMessage}
              onConsumeQuickAction={consumeQuickAction}
            />
        <RecentHistory runs={data.runs} missions={data.missions} onSelectRun={setActiveRunId} activeRunId={activeRunId} />
      </aside>
    </ForgeDashboardShell>
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
      return "Create a mission, pause at Control Gate when needed, execute a safe command, and keep the result in history.";
    case "missions":
      return "Mission records now drive the app instead of the deprecated office scene.";
    case "control-gate":
      return "Approve once, deny, or approve for the whole mission with an audit event for every decision.";
    default:
      return "AgentOS Local stays mock-first, local-safe, and ready for Ollama when you want it.";
  }
}

function OperatorAuthCard({
  session,
  onLogout
}: {
  session: OperatorAuthSession | null;
  onLogout: () => Promise<void>;
}) {
  if (!session) {
    return (
      <div className="operator-auth-card">
        <p className="operator-auth-kicker">Operator access</p>
        <p className="operator-auth-copy">Sign in with Discord to link your operator session across app and API.</p>
        <a className="operator-auth-button" href={discordLoginUrl()}>
          Continue with Discord
        </a>
      </div>
    );
  }

  const displayName = session.globalName ?? session.username;
  return (
    <div className="operator-auth-card operator-auth-card-signed-in">
      <p className="operator-auth-kicker">Signed in</p>
      <strong className="operator-auth-name">{displayName}</strong>
      <span className="operator-auth-handle">@{session.username}</span>
      <button
        className="operator-auth-logout"
        type="button"
        onClick={() => {
          void onLogout();
        }}
      >
        Sign out
      </button>
    </div>
  );
}


function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <TerminalWindow title={title} subtitle={subtitle}>
      {children}
    </TerminalWindow>
  );
}

function MissionsView({
  data,
  draft,
  setDraft,
  policyPreview,
  providerStatus,
  busyAction,
  activeRunId,
  onCreateMissionAndRun,
  onRunMission,
  onSelectRun
}: {
  data: DashboardPayload;
  draft: MissionDraft;
  setDraft: Dispatch<SetStateAction<MissionDraft>>;
  policyPreview?: PolicyPreview;
  providerStatus?: ProviderStatus;
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
              {sandboxLevels.map((level) => (
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
          <label className="wide-field checkbox-field">
            <span>GitHub issue (opt-in)</span>
            <input
              type="checkbox"
              checked={draft.createGitHubIssue}
              onChange={(event) => setDraft((current) => ({ ...current, createGitHubIssue: event.target.checked }))}
            />
            <p className="field-hint">Creates a triage issue on GageDush/AgentOS when the mission is saved.</p>
          </label>
        </div>
        <div className="forge-page-grid-cards">
          <Snapshot label="Command policy" value={policyPreview?.decision.policy ?? "loading"} copy={policyPreview?.decision.reason ?? "Checking policy posture."} />
          <Snapshot
            label="Control Gate"
            value={policyPreview?.requiresControlGate ? "required" : "clear"}
            copy={policyPreview?.explanation ?? "Checking gate posture."}
            accent={policyPreview?.requiresControlGate}
          />
          <Snapshot label="Ollama" value={providerStatus?.ollama.available ? "ready" : "offline"} copy={providerStatus?.ollama.message ?? "Checking Ollama reachability."} />
          <Snapshot
            label="Provider path"
            value={draft.provider}
            copy={draft.provider === "ollama" ? "Uses local Ollama when available and falls back gracefully for planning." : "Uses the always-ready mock planner."}
          />
        </div>
        <div className="button-row">
          <button className="primary-button" disabled={busyAction === "create-mission"} onClick={() => void onCreateMissionAndRun()}>
            {busyAction === "create-mission" ? "Creating..." : "Create Mission and Run"}
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
                  {busyAction === `run-${mission.id}` ? "Running..." : "Run"}
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

function RoutinesView({
  routines,
  draft,
  setDraft,
  busyAction,
  onCreateRoutine,
  onToggleRoutine,
  onRunRoutine
}: {
  routines: RoutineRecord[];
  draft: RoutineDraft;
  setDraft: Dispatch<SetStateAction<RoutineDraft>>;
  busyAction?: string;
  onCreateRoutine: () => Promise<void>;
  onToggleRoutine: (routineId: string) => Promise<void>;
  onRunRoutine: (routineId: string) => Promise<void>;
}) {
  return (
    <>
      <Panel title="Create Routine" subtitle="Save a recurring mission recipe, then run it on demand or keep it scheduled.">
        <div className="form-grid">
          <label>
            <span>Title</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Frequency</span>
            <select value={draft.frequency} onChange={(event) => setDraft((current) => ({ ...current, frequency: event.target.value as RoutineDraft["frequency"] }))}>
              {["manual", "hourly", "daily", "weekly"].map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequency}
                </option>
              ))}
            </select>
          </label>
          <label className="wide-field">
            <span>Objective</span>
            <textarea rows={3} value={draft.objective} onChange={(event) => setDraft((current) => ({ ...current, objective: event.target.value }))} />
          </label>
          <label className="wide-field">
            <span>Command</span>
            <input value={draft.command} onChange={(event) => setDraft((current) => ({ ...current, command: event.target.value }))} />
          </label>
        </div>
        <div className="button-row">
          <button className="primary-button" disabled={busyAction === "create-routine"} onClick={() => void onCreateRoutine()}>
            {busyAction === "create-routine" ? "Creating..." : "Create Routine"}
          </button>
        </div>
      </Panel>
      <Panel title="Routines" subtitle="Scheduled automations stay mock-first but can run now for review.">
        <div className="table-list">
          {routines.map((routine) => (
            <div className="table-row" key={routine.id}>
              <div>
                <strong>{routine.title}</strong>
                <p>{routine.objective}</p>
                <p className="command-line">{routine.command}</p>
              </div>
              <div className="row-actions">
                <span className={`status-chip status-chip-${routine.status === "paused" ? "awaiting_approval" : "running"}`}>{routine.status}</span>
                <span>{routine.frequency}</span>
                <button className="secondary-button" disabled={busyAction === `run-routine-${routine.id}`} onClick={() => void onRunRoutine(routine.id)}>
                  {busyAction === `run-routine-${routine.id}` ? "Starting..." : "Run Now"}
                </button>
                <button className="ghost-button" disabled={busyAction === `toggle-routine-${routine.id}`} onClick={() => void onToggleRoutine(routine.id)}>
                  {routine.enabled ? "Pause" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function OperatorsView({
  agents,
  sessions,
  busyAction,
  onPauseSession,
  onResumeSession
}: {
  agents: AgentProfile[];
  sessions: SessionRecord[];
  busyAction?: string;
  onPauseSession: (sessionId: string) => Promise<void>;
  onResumeSession: (sessionId: string) => Promise<void>;
}) {
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
              <div className="row-actions">
                <span className={`status-chip status-chip-${session.status}`}>{session.status}</span>
                {session.status === "active" ? (
                  <button className="ghost-button" disabled={busyAction === `pause-session-${session.id}`} onClick={() => void onPauseSession(session.id)}>
                    Pause
                  </button>
                ) : null}
                {session.status === "paused" || session.status === "failed" ? (
                  <button className="secondary-button" disabled={busyAction === `resume-session-${session.id}`} onClick={() => void onResumeSession(session.id)}>
                    Resume
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

function BlackboxView({ audit, activeLogs }: { audit: AuditEvent[]; activeLogs: MissionRunLog[] }) {
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState<"all" | MissionRunLog["level"]>("all");
  const filteredLogs = activeLogs.filter((log) => {
    const matchesQuery = !query || log.message.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = eventFilter === "all" || eventFilter === log.level;
    return matchesQuery && matchesFilter;
  });
  const filteredAudit = audit.filter((event) => {
    const haystack = `${event.event} ${event.summary} ${event.actor}`.toLowerCase();
    return !query || haystack.includes(query.toLowerCase());
  });

  return (
    <>
      <Panel title="Search Blackbox" subtitle="Filter live logs and audit events by keyword or signal.">
        <div className="form-grid">
          <label className="wide-field">
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="approval, typecheck, ollama, failed..." />
          </label>
          <label>
            <span>Log filter</span>
            <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value as "all" | MissionRunLog["level"])}>
              {["all", "system", "plan", "approval", "exec", "stdout", "stderr", "result"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>
      <Panel title="Live Logs" subtitle="Polled from the active mission run.">
        <div className="log-preview full-log">
          {filteredLogs.length === 0 ? <div className="empty-state">Run a mission to stream logs here.</div> : null}
          {filteredLogs.map((log) => (
            <div className="log-line" key={log.id}>
              <span className={`log-level log-level-${log.level}`}>{log.level}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Audit Trail" subtitle="Blackbox records every decision and completion event.">
        <div className="table-list">
          {filteredAudit.slice(0, 30).map((event) => (
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

function LoadoutView({ loadout, providerStatus }: { loadout: LoadoutItem[]; providerStatus?: ProviderStatus }) {
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
        <div className="table-row">
          <div>
            <strong>Ollama Readiness</strong>
            <p>{providerStatus?.ollama.message ?? "Checking local provider reachability."}</p>
          </div>
          <div className="row-meta">
            <span className={`status-chip status-chip-${providerStatus?.ollama.available ? "completed" : "failed"}`}>
              {providerStatus?.ollama.available ? "ready" : "offline"}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

const operatorFaqItems: ForgeFaqItem[] = [
  {
    id: "local-first",
    question: "What does local-first mean here?",
    answer:
      "AgentOS runs against your local API and workspace by default. Missions plan and execute on your machine with mock or Ollama providers — no cloud credentials are required until you opt in."
  },
  {
    id: "control-gate",
    question: "When does Control Gate pause a mission?",
    answer:
      "Runs pause when a command crosses the mission sandbox level or policy boundary. Approve once for a single step, approve for mission to relax the gate for that run, or deny to stop with an audit event."
  },
  {
    id: "missions-vs-routines",
    question: "How are missions different from routines?",
    answer:
      "Missions are one-off jobs you compose and run immediately. Routines save the same recipe for manual, hourly, daily, or weekly triggers while staying mock-first until you schedule real execution."
  },
  {
    id: "command-palette",
    question: "What does the command palette do?",
    answer:
      "Open it from the forge header to jump to approvals, start a mission, sync archive memory, or trigger quick actions wired to the active run. It mirrors the sidebar inspector without leaving your current section."
  }
];

function SettingsView({ data, providerStatus }: { data: DashboardPayload; providerStatus?: ProviderStatus }) {
  const [runtimeView, setRuntimeView] = useState<"system" | "providers">("system");

  return (
    <>
      <Panel title="Runtime Mode" subtitle="Mock-first by default, Ollama when you opt in.">
        <div style={{ marginBottom: "14px" }}>
          <ForgeSegmentedControl
            options={[
              { id: "system", label: "System" },
              { id: "providers", label: "Providers" }
            ]}
            value={runtimeView}
            onChange={(id) => setRuntimeView(id as "system" | "providers")}
            ariaLabel="Runtime settings view"
          />
        </div>
        <div className="settings-grid">
          {runtimeView === "system" ? (
            <>
              <Setting label="API" value={data.system.api} />
              <Setting label="Worker" value={data.system.worker} />
              <Setting label="Gateway" value={data.system.gateway} />
              <Setting label="Discord" value={data.system.discordMode} />
              <Setting label="Monthly budget" value={`$${data.usage.monthlyLimit.toFixed(2)}`} />
              <Setting label="Daily spend" value={`$${data.usage.dailySpend.toFixed(2)}`} />
            </>
          ) : (
            <>
              <Setting label="Provider mode" value={data.system.providerMode} />
              <Setting label="Mock provider" value={providerStatus?.mock.available ? "ready" : "offline"} />
              <Setting label="Mock status" value={providerStatus?.mock.message ?? "Checking mock provider."} />
              <Setting label="Ollama" value={providerStatus?.ollama.available ? "reachable" : "unavailable"} />
              <Setting label="Ollama status" value={providerStatus?.ollama.message ?? "Checking Ollama reachability."} />
              <Setting label="Default provider" value={providerStatus?.defaultProvider ?? data.system.providerMode} />
            </>
          )}
        </div>
      </Panel>
      <Panel title="Policy Snapshot" subtitle="Safe commands are small by design during the pivot.">
        <div className="policy-list">
          <div><strong>Auto-allowed:</strong> `git status`, `git diff`, `pnpm test`, `pnpm typecheck`, `pnpm lint`</div>
          <div><strong>Approval required:</strong> installs, repo writes, network access, `.env` reads</div>
          <div><strong>Denied:</strong> `sudo`, `rm -rf /`, unrestricted system writes</div>
        </div>
      </Panel>
      <Panel title="Operator Help" subtitle="Local-first posture, approvals, and forge navigation.">
        <ForgeFaqAccordion items={operatorFaqItems} />
      </Panel>
    </>
  );
}

function RunInspector({
  mission,
  run,
  route,
  logs,
  approvals,
  quickActions,
  onResolveApproval,
  onConsumeQuickAction,
  busyAction
}: {
  mission?: MissionRecord;
  run?: MissionRun;
  route?: AgentRoutingDecisionRecord;
  logs: MissionRunLog[];
  approvals: ApprovalRecord[];
  quickActions: QuickActionRecord[];
  onResolveApproval: (approval: ApprovalRecord, mode: "approve-once" | "approve-for-mission" | "deny") => Promise<void>;
  onConsumeQuickAction: (actionId: string) => Promise<void>;
  busyAction?: string;
}) {
  const approval = run?.approvalRequestId ? approvals.find((item) => item.id === run.approvalRequestId) : undefined;
  const latestStdout = [...logs].reverse().find((log) => log.level === "stdout");
  const latestStderr = [...logs].reverse().find((log) => log.level === "stderr");

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
            <div className="forge-page-grid-cards">
              <Snapshot label="Provider" value={run.provider} copy={run.model} />
              <Snapshot label="Session" value={run.sessionId ? "linked" : "none"} copy={run.sessionId ?? "No session linked"} />
              <Snapshot label="Result" value={run.resultSummary ? "saved" : run.error ? "error" : "pending"} copy={run.resultSummary ?? run.error ?? "Still running"} />
            </div>
            {route ? (
              <div className="mini-log">
                <div className="log-line">
                  <span className="log-level log-level-plan">route</span>
                  <span>
                    {`${route.selectedPrimaryAgentId} -> ${route.supportingAgentIds.join(", ")} | gates: ${route.requiredGates.join(", ") || "none"}`}
                  </span>
                </div>
              </div>
            ) : null}
            {latestStdout ? (
              <div className="mini-log">
                <div className="log-line">
                  <span className="log-level log-level-stdout">stdout</span>
                  <span>{latestStdout.message}</span>
                </div>
              </div>
            ) : null}
            {latestStderr ? (
              <div className="mini-log">
                <div className="log-line">
                  <span className="log-level log-level-stderr">stderr</span>
                  <span>{latestStderr.message}</span>
                </div>
              </div>
            ) : null}
            <div className="mini-log">
              {logs.slice(-6).map((log) => (
                <div className="log-line" key={log.id}>
                  <span className={`log-level log-level-${log.level}`}>{log.level}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
            {quickActions.length > 0 ? (
              <div className="button-row">
                {quickActions.slice(0, 6).map((action) => (
                  <button
                    className="ghost-button"
                    disabled={busyAction === `quick-${action.id}`}
                    key={action.id}
                    onClick={() => void onConsumeQuickAction(action.id)}
                  >
                    {action.emoji} {action.label}
                  </button>
                ))}
              </div>
            ) : null}
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

function ConversationPanel({
  thread,
  messages,
  quickActions,
  chatDraft,
  setChatDraft,
  busyAction,
  onSendChat,
  onConsumeQuickAction
}: {
  thread?: ChatThreadRecord;
  messages: ChatMessageRecord[];
  quickActions: QuickActionRecord[];
  chatDraft: string;
  setChatDraft: Dispatch<SetStateAction<string>>;
  busyAction?: string;
  onSendChat: () => Promise<void>;
  onConsumeQuickAction: (actionId: string) => Promise<void>;
}) {
  const visibleMessages = thread ? messages.filter((message) => message.threadId === thread.id) : messages;
  return (
    <Panel title="Conversational Control" subtitle={thread ? thread.title : "No active thread"}>
      <div className="mini-log">
        {visibleMessages.slice(-6).map((message) => (
          <div className="log-line" key={message.id}>
            <span className={`log-level log-level-${message.role === "assistant" ? "result" : message.role === "system" ? "system" : "plan"}`}>
              {message.role}
            </span>
            <span>{message.content}</span>
          </div>
        ))}
      </div>
      <label className="wide-field">
        <span>Message</span>
        <textarea rows={3} value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder='Try "approve that", "pause it", "run QA", or "show details".' />
      </label>
      <div className="button-row">
        <button className="primary-button" disabled={busyAction === "send-chat" || !thread} onClick={() => void onSendChat()}>
          {busyAction === "send-chat" ? "Sending..." : "Send"}
        </button>
        {quickActions.slice(0, 4).map((action) => (
          <button
            className="ghost-button"
            disabled={busyAction === `quick-${action.id}`}
            key={action.id}
            onClick={() => void onConsumeQuickAction(action.id)}
          >
            {action.emoji} {action.label}
          </button>
        ))}
      </div>
    </Panel>
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

function Snapshot({
  label,
  value,
  copy,
  accent,
  featured
}: {
  label: string;
  value: string;
  copy: string;
  accent?: boolean;
  featured?: boolean;
}) {
  return <ForgeStatCard label={label} value={value} caption={copy} accent={accent} featured={featured} />;
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
