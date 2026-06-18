"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { ForgeBootLoader } from "../forge/ForgeBootLoader";
import { ForgeChatDock } from "../forge/ForgeChatDock";
import { AgentOSEventsProvider, useAgentOSEventsContext } from "../../lib/agentos-events-context";
import { ForgeDashboardShell } from "../forge/ForgeDashboardShell";
import { ForgeDashboardView } from "../forge/ForgeDashboardView";
import { ForgeControlGateView } from "../forge/ForgeControlGateView";
import { ForgeInspectorSidebar } from "../forge/ForgeInspectorSidebar";
import { ForgeMemoryQueuePanel } from "../forge/ForgeMemoryQueuePanel";
import { ForgeWikiView } from "../forge/ForgeWikiView";
import {
  buildCommandPaletteItems,
  toActivityFeed,
  toAgentPresences,
  toApprovalItems,
  toDashboardStats,
  toHealthMetrics,
  toMissionControlData,
  toMissionTimeline
} from "../forge/dashboard-adapters";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ApprovalCard,
  ForgeFaqAccordion,
  ForgeSectionHeader,
  ForgeSegmentedControl,
  ForgeStatCard,
  GeneratedAppFrame,
  MagneticButton,
  TerminalWindow,
  type ForgeFaqItem
} from "@agentos/ui";
import {
  apiGet,
  apiGetResult,
  apiPost,
  discordLoginUrl,
  fetchApiHealth,
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
  OperatorRecord,
  BuildIntent
} from "@agentos/shared";

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

const EMPTY_DASHBOARD: DashboardPayload = {
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
    warningThresholdPercent: 0,
    totalTokens: 0
  },
  system: {
    api: "offline",
    worker: "offline",
    gateway: "offline",
    discordMode: "mock",
    providerMode: "mock"
  }
};

function normalizeDashboardPayload(raw: Partial<DashboardPayload> | null | undefined): DashboardPayload {
  if (!raw) return { ...EMPTY_DASHBOARD };
  return {
    workspaces: raw.workspaces ?? [],
    operators: raw.operators ?? [],
    agents: raw.agents ?? [],
    missions: raw.missions ?? [],
    runs: raw.runs ?? [],
    approvals: raw.approvals ?? [],
    audit: raw.audit ?? [],
    archive: raw.archive ?? [],
    routines: raw.routines ?? [],
    loadout: raw.loadout ?? [],
    sessions: raw.sessions ?? [],
    quickActions: raw.quickActions ?? [],
    chatThreads: raw.chatThreads ?? [],
    chatMessages: raw.chatMessages ?? [],
    routingDecisions: raw.routingDecisions ?? [],
    usage: raw.usage ?? EMPTY_DASHBOARD.usage,
    quota: raw.quota,
    system: raw.system ?? EMPTY_DASHBOARD.system
  };
}

function mergeDashboardPayload(
  current: DashboardPayload | null,
  update: Partial<DashboardPayload>
): DashboardPayload {
  return normalizeDashboardPayload({
    ...normalizeDashboardPayload(current ?? undefined),
    ...update
  });
}

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

const appBuildDraft: MissionDraft = {
  title: "Build a Nebraska news reader",
  objective: "Create a standalone news hub with read-aloud support.",
  prompt: "Build me a standalone app that aggregates Nebraska news with text-to-speech.",
  command: "echo app-scaffold",
  sandboxLevel: "workspace_write",
  provider: "mock",
  model: "mock-agentos-local",
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
  return (
    <AgentOSEventsProvider>
      <AgentOSLocalAppInner section={section} />
    </AgentOSEventsProvider>
  );
}

function AgentOSLocalAppInner({ section }: { section: SectionKey }) {
  const { mode: eventsMode, lastSnapshot } = useAgentOSEventsContext();
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
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [operatorAuth, setOperatorAuth] = useState<OperatorAuthSession | null>(null);
  const [activeGateResults, setActiveGateResults] = useState<Array<{ gateId: string; status: "pass" | "fail"; summary?: string }>>([]);

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
    if (!lastSnapshot) return;
    const payload = lastSnapshot as Partial<DashboardPayload>;
    setApiOnline(true);
    startTransition(() => {
      setData((current) => mergeDashboardPayload(current, payload));
      setActiveRunId((current) => current ?? payload.runs?.[0]?.id);
    });
  }, [lastSnapshot]);

  useEffect(() => {
    let mounted = true;
    const pollMs = eventsMode === "live" ? 12_000 : 2500;
    const refresh = async () => {
      const healthOk = await fetchApiHealth();
      if (!mounted) return;
      if (!healthOk) {
        setApiOnline(false);
        return;
      }
      const result = await apiGetResult<DashboardPayload>("/dashboard");
      if (!mounted) return;
      if (!result.ok) {
        setApiOnline(false);
        return;
      }
      setApiOnline(true);
      startTransition(() => {
        setData(normalizeDashboardPayload(result.data));
        setActiveRunId((current) => current ?? result.data.runs?.[0]?.id);
      });
    };

    void refresh();
    const interval = setInterval(refresh, pollMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [eventsMode]);

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
    if (!activeRunId) {
      setActiveGateResults([]);
      return;
    }
    const refreshGates = async () => {
      const result = await apiGetResult<{
        results?: Array<{ gateId: string; status: "pass" | "fail"; summary?: string }>;
      }>(`/runs/${activeRunId}/gates`);
      if (!mounted || !result.ok) return;
      setActiveGateResults(
        (result.data.results ?? []).map((gate) => ({
          gateId: gate.gateId,
          status: gate.status,
          summary: gate.summary
        }))
      );
    };
    void refreshGates();
    const interval = setInterval(refreshGates, eventsMode === "live" ? 5000 : 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeRunId, eventsMode]);

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

  const activeRun = useMemo(() => data?.runs?.find((run) => run.id === activeRunId), [data?.runs, activeRunId]);
  const activeMission = useMemo(
    () => data?.missions?.find((mission) => mission.latestRunId === activeRunId),
    [data?.missions, activeRunId]
  );
  const pendingApprovals = data?.approvals?.filter((approval) => approval.status === "pending") ?? [];
  const activeMissionCount = data?.missions?.filter((mission) => mission.status === "running").length ?? 0;
  // Run Inspector only belongs on operational run surfaces (missions, gate, blackbox).
  const showInspector = section === "missions" || section === "control-gate" || section === "blackbox";
  const activeThread = useMemo(
    () =>
      data?.chatThreads?.find((thread) => thread.id === activeMission?.activeThreadId) ??
      data?.chatThreads?.[0],
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
    () => data?.routingDecisions?.find((route) => route.id === activeRun?.routeDecisionId),
    [data?.routingDecisions, activeRun?.routeDecisionId]
  );

  async function refreshDashboard() {
    const result = await apiGetResult<DashboardPayload>("/dashboard");
    if (!result.ok) {
      setApiOnline(false);
      return;
    }
    setApiOnline(true);
    startTransition(() => {
      setData(normalizeDashboardPayload(result.data));
      if (!activeRunId) setActiveRunId(result.data.runs?.[0]?.id);
    });
  }

  async function runPlatformDemo() {
    setBusyAction("run-demo");
    setError("");
    try {
      const payload = await apiPost<{ run?: MissionRun; mission?: MissionRecord; result?: { summary?: string } }>(
        "/mission/demo/run"
      );
      if (payload.run?.id) setActiveRunId(payload.run.id);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Demo mission failed.");
    } finally {
      setBusyAction(undefined);
    }
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

  async function bulkApproveAllAction() {
    setBusyAction("bulk-approve-all");
    setError("");
    try {
      const result = await apiPost<{
        ok: boolean;
        total: number;
        approved: number;
        failures?: Array<{ approvalId: string; summary: string }>;
      }>("/approvals/bulk/approve-once");
      if (!result.ok && result.failures?.length) {
        setError(
          `Approved ${result.approved}/${result.total}. ${result.failures.length} failed: ${result.failures[0]?.summary ?? "unknown error"}`
        );
      }
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bulk approval failed.");
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

  const loadingHealth = useMemo(
    () =>
      toHealthMetrics({
        system: { api: "offline", worker: "offline", gateway: "offline", discordMode: "mock", providerMode: "mock" },
        agents: [],
        runs: [],
        pendingApprovals: 0
      }),
    []
  );

  if (apiOnline === false) {
    return (
      <ForgeDashboardShell section={section} healthMetrics={loadingHealth} commandItems={[]} pendingApprovals={0}>
        <div className="alert error-alert">
          AgentOS API is offline. Start the stack with <code>pnpm control -Action RestartWithTunnel</code> or{" "}
          <code>pnpm dev:api</code>, then reload this page.
        </div>
        <ForgeBootLoader compact inline />
      </ForgeDashboardShell>
    );
  }

  if (!data) {
    return (
      <ForgeDashboardShell section={section} healthMetrics={loadingHealth} commandItems={[]} pendingApprovals={0}>
        <ForgeBootLoader compact inline />
      </ForgeDashboardShell>
    );
  }

  return (
    <ForgeDashboardShell
      section={section}
      healthMetrics={healthMetrics}
      commandItems={commandItems}
      pendingApprovals={pendingApprovals.length}
      activeMissions={activeMissionCount}
      showInspector={showInspector}
    >
      <section className="forge-page-grid">
        <ForgeSectionHeader
          kicker={labelForSection(section)}
          title={titleForSection(section)}
          accentWord={
            section === "control-gate" ? "Approval" : section === "dashboard" ? "mission" : undefined
          }
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
        {apiOnline !== true ? (
          <div className="alert error-alert" role="status">
            API offline — showing last known state. Start the stack with <code>pnpm stack:background</code> or check the tunnel.
          </div>
        ) : null}

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
              tools: data.loadout.map((item) => item.name),
              agents: data.agents,
              audits: data.audit
            })}
            activity={toActivityFeed(data.audit, activeLogs)}
            agents={toAgentPresences(data.agents, activeRun, activeRoute, data.audit)}
            timeline={toMissionTimeline(activeRun, activeLogs, activeGateResults)}
            approvals={toApprovalItems(pendingApprovals)}
            onRunAgain={activeMission ? () => void runMission(activeMission.id) : undefined}
            onRunDemo={() => void runPlatformDemo()}
            onSelectAgent={() => router.push("/operators")}
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
            onCommand={(command) => {
              setDraft((current) => ({ ...current, objective: command }));
              router.push("/missions");
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
                onRefresh={refreshDashboard}
                setBusyAction={setBusyAction}
                setError={setError}
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
            onApproveAll={() => void bulkApproveAllAction()}
            busyBulk={busyAction === "bulk-approve-all"}
          />
        ) : null}
        {section === "blackbox" ? <BlackboxView audit={data.audit} activeLogs={activeLogs} activeRunId={activeRunId} /> : null}
        {section === "archive" ? <ArchiveView archive={data.archive} /> : null}
        {section === "wiki" ? <ForgeWikiView /> : null}
        {section === "loadout" ? <LoadoutView loadout={data.loadout} providerStatus={providerStatus} /> : null}
        {section === "settings" ? <SettingsView data={data} providerStatus={providerStatus} /> : null}
      </section>

      {showInspector ? (
        <ForgeInspectorSidebar collapsedDefault={false} mission={activeMission} run={activeRun}>
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
          <RecentHistory runs={data.runs} missions={data.missions} onSelectRun={setActiveRunId} activeRunId={activeRunId} />
        </ForgeInspectorSidebar>
      ) : null}

      <ForgeChatDock
        thread={activeThread}
        messages={data.chatMessages}
        chatDraft={chatDraft}
        setChatDraft={setChatDraft}
        busyAction={busyAction}
        onSendChat={sendChatMessage}
        quickActions={activeQuickActions}
        onConsumeQuickAction={consumeQuickAction}
      />
    </ForgeDashboardShell>
  );
}

function labelForSection(section: SectionKey) {
  if (section === "dashboard") return "Command Center";
  if (section === "control-gate") return "Operator Approval Surface";
  if (section === "wiki") return "Memory Wiki";
  return section.replace("-", " ");
}

function titleForSection(section: SectionKey) {
  switch (section) {
    case "dashboard":
      return "Your local agent mission control";
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
    case "wiki":
      return "Curated memory, Cursor sessions, and project briefs";
    case "loadout":
      return "Local models, tools, and integration posture";
    case "settings":
      return "System mode and local runtime configuration";
  }
}

function descriptionForSection(section: SectionKey) {
  switch (section) {
    case "dashboard":
      return "Track live runs, approve sandbox actions, and dispatch work from one calm operator surface.";
    case "missions":
      return "Mission records now drive the app instead of the deprecated office scene.";
    case "control-gate":
      return "Approve once, deny, or approve for the whole mission with an audit event for every decision.";
    case "wiki":
      return "Browse what agents and Cursor sessions have recorded — consolidated briefs, flows, and session digests.";
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
        <p className="operator-auth-copy">
          Sign in with Discord to attribute approvals and gate decisions to your operator ID in the audit trail.
        </p>
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
      <p className="operator-auth-copy">Approvals and gate actions record as <code>{session.operatorId}</code>.</p>
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

type MissionFilter = "all" | "active" | "complete" | "app";

function missionOutputDir(mission: MissionRecord) {
  return (mission.metadata as { outputDir?: string } | undefined)?.outputDir;
}

function missionBuildIntent(mission: MissionRecord): BuildIntent | undefined {
  return (mission.metadata as { buildIntent?: BuildIntent } | undefined)?.buildIntent;
}

function isAppCreationMission(mission: MissionRecord) {
  const intent = missionBuildIntent(mission);
  if (intent?.taskType === "app_creation") return true;
  const text = `${mission.prompt} ${mission.objective}`.toLowerCase();
  return /\b(build|create|make)\b.*\b(app|application)\b/.test(text);
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
  onSelectRun,
  onRefresh,
  setBusyAction,
  setError
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
  onRefresh: () => Promise<void>;
  setBusyAction: Dispatch<SetStateAction<string | undefined>>;
  setError: Dispatch<SetStateAction<string>>;
}) {
  const [missionFilter, setMissionFilter] = useState<MissionFilter>("all");
  const [questionnaireMissionId, setQuestionnaireMissionId] = useState<string>();
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [previewMissionId, setPreviewMissionId] = useState<string>();
  const [previewContent, setPreviewContent] = useState<ReactNode>(null);

  const filteredMissions = useMemo(() => {
    return data.missions.filter((mission) => {
      if (missionFilter === "active") {
        return mission.status === "running" || mission.status === "queued" || mission.status === "awaiting_approval";
      }
      if (missionFilter === "complete") return mission.status === "completed";
      if (missionFilter === "app") return isAppCreationMission(mission) || Boolean(missionOutputDir(mission));
      return true;
    });
  }, [data.missions, missionFilter]);

  const questionnaireMission = data.missions.find((mission) => mission.id === questionnaireMissionId);
  const questionnaireIntent = questionnaireMission ? missionBuildIntent(questionnaireMission) : undefined;

  async function loadGeneratedPreview(missionId: string) {
    setBusyAction(`preview-${missionId}`);
    setError("");
    try {
      const preview = await apiGetResult<{
        outputDir: string;
        readme: string;
        pageSource: string;
        files: string[];
      }>(`/missions/${missionId}/generated-app/preview`);
      if (!preview.ok) {
        setError("No generated app preview available for this mission yet.");
        return;
      }
      setPreviewMissionId(missionId);
      setPreviewContent(
        <div>
          <p className="forge-mono" style={{ fontSize: "0.72rem", marginBottom: "0.75rem" }}>
            {preview.data.outputDir}
          </p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.75rem", margin: 0 }}>{preview.data.readme || preview.data.pageSource}</pre>
        </div>
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Preview load failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function generateQuestionnaire(missionId: string) {
    setBusyAction(`questionnaire-${missionId}`);
    setError("");
    try {
      const mission = data.missions.find((item) => item.id === missionId);
      await apiPost(`/missions/${missionId}/questionnaire/generate`, {
        description: mission?.prompt ?? mission?.objective
      });
      setQuestionnaireMissionId(missionId);
      await onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Questionnaire generation failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function submitQuestionnaire(missionId: string) {
    setBusyAction(`submit-q-${missionId}`);
    setError("");
    try {
      await apiPost(`/missions/${missionId}/questionnaire/submit`, { answers: questionnaireAnswers });
      await onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Questionnaire submit failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function submitFeedbackAndRegen(missionId: string, feedback: string) {
    setBusyAction(`regen-${missionId}`);
    setError("");
    try {
      await apiPost(`/missions/${missionId}/feedback`, { text: feedback, kind: "functional" });
      const payload = await apiPost<{ run: MissionRun }>(`/missions/${missionId}/regen`, { feedback, scope: "scoped" });
      onSelectRun(payload.run.id);
      await onRefresh();
      await loadGeneratedPreview(missionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Regeneration failed.");
    } finally {
      setBusyAction(undefined);
    }
  }

  return (
    <>
      <Panel title="Compose Mission" subtitle="Defaulted to a gated safe-command run so the full flow is visible.">
        <div className="form-grid forge-form-grid">
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
          <label className="wide-field checkbox-field forge-checkbox-field">
            <span>GitHub issue (opt-in)</span>
            <input
              type="checkbox"
              checked={draft.createGitHubIssue}
              onChange={(event) => setDraft((current) => ({ ...current, createGitHubIssue: event.target.checked }))}
            />
            <p className="field-hint forge-field-hint">Creates a triage issue on GageDush/AgentOS when the mission is saved.</p>
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
        <div className="button-row forge-button-row">
          <button className="secondary-button" type="button" onClick={() => setDraft(appBuildDraft)}>
            Use app-build preset
          </button>
          <button className="primary-button" disabled={busyAction === "create-mission"} onClick={() => void onCreateMissionAndRun()}>
            {busyAction === "create-mission" ? "Creating..." : "Create Mission and Run"}
          </button>
        </div>
      </Panel>
      <Panel title="Mission Queue" subtitle="Filter missions and open generated app previews when available.">
        <ForgeSegmentedControl
          value={missionFilter}
          onChange={(value) => setMissionFilter(value as MissionFilter)}
          options={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "complete", label: "Complete" },
            { id: "app", label: "App builds" }
          ]}
        />
        <div className="table-list forge-table-list">
          {filteredMissions.map((mission) => (
            <div className="table-row forge-table-row" key={mission.id}>
              <div>
                <strong>{mission.title}</strong>
                <p>{mission.objective}</p>
                <p className="command-line">{mission.command}</p>
                {isAppCreationMission(mission) ? <span className="forge-chip forge-chip-active">app_creation</span> : null}
              </div>
              <div className="row-actions">
                <span className={`status-chip status-chip-${mission.status}`}>{mission.status}</span>
                {isAppCreationMission(mission) ? (
                  <button
                    className="ghost-button"
                    disabled={busyAction === `questionnaire-${mission.id}`}
                    onClick={() => void generateQuestionnaire(mission.id)}
                  >
                    Questionnaire
                  </button>
                ) : null}
                <button className="secondary-button" disabled={busyAction === `run-${mission.id}`} onClick={() => void onRunMission(mission.id)}>
                  {busyAction === `run-${mission.id}` ? "Running..." : "Run"}
                </button>
                {missionOutputDir(mission) ? (
                  <button
                    className="ghost-button"
                    disabled={busyAction === `preview-${mission.id}`}
                    onClick={() => void loadGeneratedPreview(mission.id)}
                  >
                    Preview
                  </button>
                ) : null}
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
      {questionnaireMission && questionnaireIntent ? (
        <Panel title="Build questionnaire" subtitle="Answer essentials before running an app_creation mission.">
          <div className="form-grid forge-form-grid">
            {questionnaireIntent.questionnaire.map((item) => (
              <label className="wide-field" key={item.id}>
                <span>{item.prompt}</span>
                <input
                  value={questionnaireAnswers[item.id] ?? ""}
                  onChange={(event) =>
                    setQuestionnaireAnswers((current) => ({ ...current, [item.id]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="button-row forge-button-row">
            <button
              className="primary-button"
              disabled={busyAction === `submit-q-${questionnaireMission.id}`}
              onClick={() => void submitQuestionnaire(questionnaireMission.id)}
            >
              {busyAction === `submit-q-${questionnaireMission.id}` ? "Saving..." : "Save answers"}
            </button>
            <button className="secondary-button" onClick={() => void onRunMission(questionnaireMission.id)}>
              Run after save
            </button>
          </div>
        </Panel>
      ) : null}
      {previewMissionId && previewContent ? (
        <GeneratedAppFrame
          title="Generated user app"
          previewContent={previewContent}
          onInspectSubmit={(selection) => {
            const feedback = selection.userInstruction?.trim();
            if (feedback) void submitFeedbackAndRegen(previewMissionId, feedback);
          }}
        />
      ) : null}
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
        <div className="form-grid forge-form-grid">
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
        <div className="button-row forge-button-row">
          <button className="primary-button" disabled={busyAction === "create-routine"} onClick={() => void onCreateRoutine()}>
            {busyAction === "create-routine" ? "Creating..." : "Create Routine"}
          </button>
        </div>
      </Panel>
      <Panel title="Routines" subtitle="Scheduled automations stay mock-first but can run now for review.">
        <div className="table-list forge-table-list">
          {routines.map((routine) => (
            <div className="table-row forge-table-row" key={routine.id}>
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
        <div className="table-list forge-table-list">
          {agents.map((agent) => (
            <div className="table-row forge-table-row" key={agent.id}>
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
        <div className="table-list forge-table-list">
          {sessions.map((session) => (
            <div className="table-row forge-table-row" key={session.id}>
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

type RunGateStatus = {
  runId: string;
  missionId?: string;
  required: string[];
  passed: string[];
  pending: string[];
  releasePrepared: boolean;
  results?: Array<{ gateId: string; status: "pass" | "fail"; summary?: string }>;
};

function BlackboxView({
  audit,
  activeLogs,
  activeRunId
}: {
  audit: AuditEvent[];
  activeLogs: MissionRunLog[];
  activeRunId?: string;
}) {
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState<"all" | MissionRunLog["level"]>("all");
  const [gateStatus, setGateStatus] = useState<RunGateStatus | null>(null);
  const [gateBusy, setGateBusy] = useState<string>();

  useEffect(() => {
    let mounted = true;
    if (!activeRunId) {
      setGateStatus(null);
      return;
    }
    const load = async () => {
      const result = await apiGetResult<RunGateStatus>(`/runs/${activeRunId}/gates`);
      if (mounted && result.ok) setGateStatus(result.data);
    };
    void load();
    const interval = setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeRunId]);

  async function runGateAction(action: "prepare" | "approve") {
    if (!activeRunId) return;
    setGateBusy(action);
    try {
      await apiPost(`/runs/${activeRunId}/gates/release/${action}`);
      const result = await apiGetResult<RunGateStatus>(`/runs/${activeRunId}/gates`);
      if (result.ok) setGateStatus(result.data);
    } finally {
      setGateBusy(undefined);
    }
  }
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
      {gateStatus && gateStatus.required.length > 0 ? (
        <Panel title="Completion gates" subtitle="QA, security, and release gates for the active run.">
          <div className="forge-page-grid-cards">
            {gateStatus.required.map((gate) => {
              const result = gateStatus.results?.find((entry) => entry.gateId === gate);
              const failed = result?.status === "fail";
              const passed = gateStatus.passed.includes(gate);
              return (
                <Snapshot
                  key={gate}
                  label={gate}
                  value={failed ? "failed" : passed ? "passed" : "pending"}
                  copy={
                    failed
                      ? (result?.summary ?? `Gate ${gate} failed.`)
                      : gate === "release" && gateStatus.releasePrepared
                        ? "Release checklist prepared."
                        : `Gate ${gate} for run ${gateStatus.runId}.`
                  }
                  accent={gateStatus.pending.includes(gate) || failed}
                />
              );
            })}
          </div>
          {gateStatus.pending.includes("release") ? (
            <div className="button-row forge-button-row">
              <button className="secondary-button" disabled={gateBusy === "prepare"} onClick={() => void runGateAction("prepare")}>
                {gateBusy === "prepare" ? "Preparing..." : "Prepare release"}
              </button>
              <button className="primary-button" disabled={gateBusy === "approve"} onClick={() => void runGateAction("approve")}>
                {gateBusy === "approve" ? "Approving..." : "Approve release"}
              </button>
            </div>
          ) : null}
        </Panel>
      ) : null}
      <Panel title="Search Blackbox" subtitle="Filter live logs and audit events by keyword or signal.">
        <div className="form-grid forge-form-grid">
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
        <div className="table-list forge-table-list">
          {filteredAudit.slice(0, 30).map((event) => (
            <div className="table-row forge-table-row" key={event.id}>
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
      <div className="table-list forge-table-list">
        {archive.map((memory) => (
          <div className="table-row forge-table-row" key={memory.id}>
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
      <div className="table-list forge-table-list">
        {loadout.map((item) => (
          <div className="table-row forge-table-row" key={item.id}>
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
        <div className="table-row forge-table-row">
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

type LlmRoutesResponse = {
  mode: string;
  litellmEnabled: boolean;
  health: { ollama: boolean; litellm: boolean };
  aliases: Array<{ alias: string; models: string[]; lanes: string[]; requiresApproval: boolean }>;
};

function RouterHealthPanel() {
  const [routes, setRoutes] = useState<LlmRoutesResponse | null>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await apiGetResult<LlmRoutesResponse>("/llm/routes");
      if (!active) return;
      if (result.ok) {
        setRoutes(result.data);
        setDown(false);
      } else {
        setDown(true);
      }
    };
    void load();
    const id = setInterval(load, 12000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const litellmValue = routes
    ? routes.litellmEnabled
      ? routes.health.litellm
        ? "reachable"
        : "enabled · down"
      : "disabled"
    : "—";

  return (
    <Panel title="LLM Router" subtitle="Local-first routing — Ollama direct, LiteLLM optional.">
      {down ? (
        <div className="settings-grid">
          <Setting label="Router" value="API unavailable" />
        </div>
      ) : !routes ? (
        <div className="settings-grid">
          <Setting label="Router" value="Checking…" />
        </div>
      ) : (
        <>
          <div className="settings-grid">
            <Setting label="Mode" value={routes.mode} />
            <Setting label="Ollama" value={routes.health.ollama ? "reachable" : "unavailable"} />
            <Setting label="LiteLLM" value={litellmValue} />
            <Setting label="Aliases" value={String(routes.aliases.length)} />
          </div>
          {!routes.litellmEnabled ? (
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--forge-mono)",
                fontSize: "0.72rem",
                lineHeight: 1.5,
                color: "var(--forge-soft)"
              }}
            >
              Cloud lanes are off. Enable with <code>pnpm llm:litellm:setup</code>, then set <code>FEATURE_LITELLM_PROXY=true</code> and{" "}
              <code>pnpm stack:restart</code>.
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}

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
      <RouterHealthPanel />
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

  const approvalItem = approval ? toApprovalItems([approval])[0] : undefined;

  return (
    <>
      <Panel title="Run Inspector" subtitle={run ? run.id : "No run selected"}>
        {mission && run ? (
          <div className="inspector-stack forge-inspector-stack">
            <div className="table-row forge-table-row">
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
              <div className="mini-log forge-mini-log">
                <div className="log-line forge-log-line">
                  <span className="log-level log-level-plan">route</span>
                  <span>
                    {`executed: ${(Array.isArray(route.executedAgentIds)
                      ? route.executedAgentIds
                      : Array.isArray(route.metadata?.executedAgentIds)
                        ? route.metadata.executedAgentIds
                        : [route.selectedPrimaryAgentId]
                    ).join(", ")} | gates: ${route.requiredGates.join(", ") || "none"}`}
                  </span>
                </div>
              </div>
            ) : null}
            {latestStdout ? (
              <div className="mini-log forge-mini-log">
                <div className="log-line forge-log-line">
                  <span className="log-level log-level-stdout">stdout</span>
                  <span>{latestStdout.message}</span>
                </div>
              </div>
            ) : null}
            {latestStderr ? (
              <div className="mini-log forge-mini-log">
                <div className="log-line forge-log-line">
                  <span className="log-level log-level-stderr">stderr</span>
                  <span>{latestStderr.message}</span>
                </div>
              </div>
            ) : null}
            <div className="mini-log forge-mini-log">
              {logs.slice(-6).map((log) => (
                <div className="log-line forge-log-line" key={log.id}>
                  <span className={`log-level log-level-${log.level}`}>{log.level}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
            {quickActions.length > 0 ? (
              <div className="button-row forge-button-row">
                {quickActions.slice(0, 6).map((action) => (
                  <MagneticButton
                    disabled={busyAction === `quick-${action.id}`}
                    key={action.id}
                    onClick={() => void onConsumeQuickAction(action.id)}
                  >
                    {action.emoji} {action.label}
                  </MagneticButton>
                ))}
              </div>
            ) : null}
            <ForgeMemoryQueuePanel runId={run.id} />
          </div>
        ) : (
          <div className="empty-state">Pick a mission run from the history list.</div>
        )}
      </Panel>
      {approvalItem ? (
        <ApprovalCard
          approval={approvalItem}
          busy={
            busyAction === `approve-once-${approvalItem.id}` ||
            busyAction === `approve-for-mission-${approvalItem.id}` ||
            busyAction === `deny-${approvalItem.id}`
          }
          onAllowOnce={() => void onResolveApproval(approval!, "approve-once")}
          onAllowMission={() => void onResolveApproval(approval!, "approve-for-mission")}
          onDeny={() => void onResolveApproval(approval!, "deny")}
        />
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
      <div className="mini-log forge-mini-log">
        {visibleMessages.slice(-6).map((message) => (
          <div className="log-line forge-log-line" key={message.id}>
            <span className={`log-level log-level-${message.role === "assistant" ? "result" : message.role === "system" ? "system" : "plan"}`}>
              {message.role}
            </span>
            <span>{message.content}</span>
          </div>
        ))}
      </div>
      <label className="wide-field">
        <span className="forge-field-label">Message</span>
        <textarea
          className="forge-textarea"
          rows={3}
          value={chatDraft}
          onChange={(event) => setChatDraft(event.target.value)}
          placeholder='Try "approve that", "pause it", "run QA", or "show details".'
        />
      </label>
      <div className="button-row forge-button-row">
        <MagneticButton variant="primary" disabled={busyAction === "send-chat" || !thread} onClick={() => void onSendChat()}>
          {busyAction === "send-chat" ? "Sending..." : "Send"}
        </MagneticButton>
        {quickActions.slice(0, 4).map((action) => (
          <MagneticButton
            disabled={busyAction === `quick-${action.id}`}
            key={action.id}
            onClick={() => void onConsumeQuickAction(action.id)}
          >
            {action.emoji} {action.label}
          </MagneticButton>
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
      <div className="table-list forge-table-list">
        {runs.map((run) => {
          const mission = missions.find((item) => item.id === run.missionId);
          return (
            <button
              className={`history-button forge-history-button ${activeRunId === run.id ? "history-button-active forge-history-button-active" : ""}`.trim()}
              key={run.id}
              onClick={() => onSelectRun(run.id)}
            >
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
