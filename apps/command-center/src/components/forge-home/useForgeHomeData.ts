/* eslint-disable */
"use client";

/* ────────────────────────────────────────────────────────────────────────
   useForgeHomeData — live data for the home/dashboard surface.

   Fetches the same /dashboard aggregate the operational app uses (SQLite via
   the Fastify API on :8787, proxied through /agentos-api) and maps it into the
   home view-model. Badge counts here are derived from the SAME records as
   /control-gate, so the home and the operational app always agree:

     gate count  = approvals.filter(status === "pending").length
     active      = missions.filter(status === "running").length

   Actions (compose, approve, deny) hit the real, gated pipeline. Seed data is
   used only as a first-paint placeholder and on API failure (clearly flagged
   via `live`/`error`).
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGetResult, apiPost, fetchApiHealth } from "../../lib/agentos-api";
import {
  initialMissions,
  initialMarquee,
  type Mission,
  type MissionStatus,
  type MarqueeEvent,
} from "./forge-home-data";

/* Minimal shapes of the /dashboard payload fields we read (kept local so the
   home does not couple to the operational app's private types). */
type ApiMission = {
  id: string;
  title: string;
  status: string;
  provider?: string;
  model?: string;
  latestRunId?: string;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
};
type ApiRun = { id: string; missionId: string; status: string };
type ApiApproval = {
  id: string;
  agentId?: string;
  missionId?: string;
  runId?: string;
  tool?: string;
  command?: string;
  inputSummary?: string;
  status: string;
  createdAt?: string;
};
type ApiAudit = { id: string; event?: string; summary?: string; missionId?: string; runId?: string; createdAt?: string };
type DashboardLike = {
  missions?: ApiMission[];
  runs?: ApiRun[];
  approvals?: ApiApproval[];
  audit?: ApiAudit[];
  usage?: { totalTokens?: number };
  quota?: { status?: unknown };
};

const HOME_AGENTS = ["Coder", "Writer", "Sentinel", "Researcher"] as const;

function clock5(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function mapStatus(s: string): MissionStatus {
  switch (s) {
    case "running":
      return "running";
    case "awaiting_approval":
      return "awaiting";
    case "completed":
      return "completed";
    case "failed":
    case "denied":
      return "failed";
    case "paused":
      return "paused";
    default:
      return "queued";
  }
}

function agentFor(m: ApiMission): string {
  const meta = (m.metadata ?? {}) as Record<string, unknown>;
  const tagged = typeof meta.agent === "string" ? (meta.agent as string) : "";
  if ((HOME_AGENTS as readonly string[]).includes(tagged)) return tagged;
  const p = (m.provider ?? "").toLowerCase();
  if (p.includes("anthropic") || p.includes("claude") || p.includes("cloud")) return "Researcher";
  if (p.includes("google") || p.includes("gemini")) return "Researcher";
  return "Coder";
}

function progressFor(m: ApiMission, runs: ApiRun[]): number {
  const st = mapStatus(m.status);
  if (st === "completed") return 1;
  if (st === "queued") return 0;
  const run = m.latestRunId ? runs.find((r) => r.id === m.latestRunId) : runs.find((r) => r.missionId === m.id);
  if (run) {
    if (run.status === "completed") return 1;
    if (run.status === "running") return 0.6;
    if (run.status === "planning" || run.status === "queued") return 0.15;
    if (run.status === "awaiting_approval" || run.status === "paused") return 0.4;
    if (run.status === "failed" || run.status === "denied") return 0.5;
  }
  if (st === "awaiting") return 0.4;
  if (st === "failed") return 0.5;
  return 0.5;
}

function integrationFor(m: ApiMission): string | undefined {
  const meta = (m.metadata ?? {}) as Record<string, unknown>;
  const i = typeof meta.integration === "string" ? (meta.integration as string) : undefined;
  return i;
}

const TAG_BY_EVENT = (event = ""): { tag: string; cls: string } => {
  const e = event.toLowerCase();
  if (e.includes("deny") || e.includes("fail") || e.includes("error")) return { tag: "ERR", cls: "err" };
  if (e.includes("approv") || e.includes("gate")) return { tag: "GATE", cls: "run" };
  if (e.includes("run") || e.includes("start")) return { tag: "RUN", cls: "run" };
  if (e.includes("warn")) return { tag: "WARN", cls: "warn" };
  return { tag: "OK", cls: "ok" };
};

export type HomeGate = {
  id: string;
  agent: string;
  title: string;
  integration?: string;
  gate: { verb: string; target: string };
};

export type ForgeHomeData = {
  live: boolean;
  loading: boolean;
  error: string | null;
  missions: Mission[];
  gateItems: HomeGate[];
  marquee: MarqueeEvent[];
  counts: { active: number; awaiting: number; queued: number; todayRuns: number };
  busy: string | null;
  runMission: (p: { title: string; agent: string; model: string; sandbox: string }) => Promise<void>;
  approve: (id: string, mode: "once" | "mission") => Promise<void>;
  deny: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useForgeHomeData(): ForgeHomeData {
  const [payload, setPayload] = useState<DashboardLike | null>(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const healthy = await fetchApiHealth();
    if (!mounted.current) return;
    if (!healthy) {
      setLive(false);
      setError("API offline — showing placeholder data.");
      setLoading(false);
      return;
    }
    const result = await apiGetResult<DashboardLike>("/dashboard");
    if (!mounted.current) return;
    if (!result.ok) {
      setLive(false);
      setError("Could not reach the runtime — showing placeholder data.");
      setLoading(false);
      return;
    }
    setPayload(result.data);
    setLive(true);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const id = setInterval(() => void refresh(), 8000);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [refresh]);

  const view = useMemo(() => {
    const emptyCounts = { active: 0, awaiting: 0, queued: 0, todayRuns: 0 };

    if (loading) {
      return {
        missions: [] as Mission[],
        gateItems: [] as HomeGate[],
        marquee: [] as MarqueeEvent[],
        counts: emptyCounts,
      };
    }

    if (!live || !payload) {
      const active = initialMissions.filter((m) => m.status === "running").length;
      const awaiting = initialMissions.filter((m) => m.status === "awaiting").length;
      const queued = initialMissions.filter((m) => m.status === "queued").length;
      const gateItems: HomeGate[] = initialMissions
        .filter((m) => m.status === "awaiting" && m.gate)
        .slice(0, 2)
        .map((m) => ({ id: m.id, agent: m.agent, title: m.title, integration: m.integration, gate: m.gate! }));
      return {
        missions: initialMissions,
        gateItems,
        marquee: initialMarquee,
        counts: { active, awaiting, queued, todayRuns: initialMissions.length + 8 },
      };
    }

    const runs = payload.runs ?? [];
    const apiMissions = payload.missions ?? [];
    const approvals = (payload.approvals ?? []).filter((a) => a.status === "pending");
    const missions: Mission[] = apiMissions.map((m) => ({
      id: m.id,
      title: m.title,
      agent: agentFor(m),
      status: mapStatus(m.status),
      progress: progressFor(m, runs),
      created: clock5(m.createdAt),
      integration: integrationFor(m),
      model: m.model,
    }));
    const missionById = new Map(apiMissions.map((m) => [m.id, m]));

    const gateItems: HomeGate[] = approvals.slice(0, 2).map((a) => {
      const mission = a.missionId ? missionById.get(a.missionId) : undefined;
      return {
        id: a.id,
        agent: mission ? agentFor(mission) : "Sentinel",
        title: mission?.title ?? a.inputSummary ?? "Pending approval",
        integration: mission ? integrationFor(mission) : undefined,
        gate: { verb: a.tool ?? "action", target: a.command ?? a.inputSummary ?? "—" },
      };
    });

    const marquee: MarqueeEvent[] = (payload.audit ?? [])
      .slice()
      .reverse()
      .slice(0, 10)
      .map((ev) => {
        const { tag, cls } = TAG_BY_EVENT(ev.event);
        return { ts: clock5(ev.createdAt), tag, tagCls: cls, id: ev.runId ?? ev.missionId ?? ev.id, body: ev.summary ?? ev.event ?? "" };
      });

    return {
      missions,
      gateItems,
      marquee: marquee.length ? marquee : initialMarquee,
      counts: {
        active: apiMissions.filter((m) => m.status === "running").length,
        awaiting: approvals.length,
        queued: apiMissions.filter((m) => m.status === "queued" || m.status === "draft").length,
        todayRuns: runs.length,
      },
    };
  }, [live, payload, loading]);

  const runMission = useCallback(
    async (p: { title: string; agent: string; model: string; sandbox: string }) => {
      setBusy("compose");
      setError(null);
      try {
        // Create a real mission, then start its run. The run still pauses at the
        // Control Gate when policy requires — approval gates are preserved.
        const mission = await apiPost<{ id: string }>("/missions", {
          title: p.title,
          objective: p.title,
          prompt: p.title,
          metadata: { agent: p.agent, source: "home-compose" },
        });
        if (mission?.id) {
          try {
            await apiPost(`/missions/${mission.id}/run`);
          } catch {
            /* run kickoff is best-effort; the mission still exists and is visible */
          }
        }
        await refresh();
      } catch (cause) {
        if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not start that mission.");
      } finally {
        if (mounted.current) setBusy(null);
      }
    },
    [refresh]
  );

  const approve = useCallback(
    async (id: string, mode: "once" | "mission") => {
      setBusy(`approve-${id}`);
      setError(null);
      try {
        const endpoint = mode === "mission" ? `/approvals/${id}/approve-for-mission` : `/approvals/${id}/approve-once`;
        await apiPost(endpoint);
        await refresh();
      } catch (cause) {
        if (mounted.current) setError(cause instanceof Error ? cause.message : "Approval failed.");
      } finally {
        if (mounted.current) setBusy(null);
      }
    },
    [refresh]
  );

  const deny = useCallback(
    async (id: string) => {
      setBusy(`deny-${id}`);
      setError(null);
      try {
        await apiPost(`/approvals/${id}/deny`);
        await refresh();
      } catch (cause) {
        if (mounted.current) setError(cause instanceof Error ? cause.message : "Deny failed.");
      } finally {
        if (mounted.current) setBusy(null);
      }
    },
    [refresh]
  );

  return {
    live,
    loading,
    error,
    missions: view.missions,
    gateItems: view.gateItems,
    marquee: view.marquee,
    counts: view.counts,
    busy,
    runMission,
    approve,
    deny,
    refresh,
  };
}
