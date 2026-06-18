/* eslint-disable */
/* ────────────────────────────────────────────────────────────────────────
   AgentOS Forge — Home data, icons, brand marks and seed content.
   Ported from the Claude Design handoff (agentos-shared.jsx, Jun 2026).

   The mission / integration / provider data here is representative seed
   content that mirrors the live runtime shapes. Swap these for real data
   sources (API / SQLite adapters) to wire the home to the runtime — the
   component props are already shaped for it.
   ──────────────────────────────────────────────────────────────────────── */
import * as React from "react";

/* ─── Inline icons (Lucide stroke 1.6) ───────────────────────── */
const Ic = ({ d, w = 14 }: { d: React.ReactNode; w?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={w}
    height={w}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

export const I: Record<string, React.ReactElement> = {
  play: <Ic d={<polygon points="6 4 20 12 6 20 6 4" />} />,
  square: <Ic d={<rect x="5" y="5" width="14" height="14" rx="1.5" />} />,
  check: <Ic d={<polyline points="20 6 9 17 4 12" />} />,
  x: (
    <Ic
      d={
        <g>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </g>
      }
    />
  ),
  arrow: (
    <Ic
      d={
        <g>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="13 6 19 12 13 18" />
        </g>
      }
    />
  ),
  back: (
    <Ic
      d={
        <g>
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="11 18 5 12 11 6" />
        </g>
      }
    />
  ),
  term: (
    <Ic
      d={
        <g>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </g>
      }
    />
  ),
  cpu: (
    <Ic
      d={
        <g>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="2" x2="9" y2="4" />
          <line x1="15" y1="2" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="22" />
          <line x1="15" y1="20" x2="15" y2="22" />
          <line x1="20" y1="9" x2="22" y2="9" />
          <line x1="20" y1="14" x2="22" y2="14" />
          <line x1="2" y1="9" x2="4" y2="9" />
          <line x1="2" y1="14" x2="4" y2="14" />
        </g>
      }
    />
  ),
  db: (
    <Ic
      d={
        <g>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </g>
      }
    />
  ),
  shield: <Ic d={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />} />,
  archive: (
    <Ic
      d={
        <g>
          <rect x="2" y="3" width="20" height="5" rx="1" />
          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
          <line x1="10" y1="13" x2="14" y2="13" />
        </g>
      }
    />
  ),
  bolt: <Ic d={<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />} />,
  search: (
    <Ic
      d={
        <g>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </g>
      }
    />
  ),
  send: (
    <Ic
      d={
        <g>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </g>
      }
    />
  ),
  brain: (
    <Ic
      d={
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2zm5 0A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z" />
      }
    />
  ),
  star: (
    <Ic d={<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />} />
  ),
  grid: (
    <Ic
      d={
        <g>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </g>
      }
    />
  ),
  chevD: <Ic d={<polyline points="6 9 12 15 18 9" />} />,
  spark: <Ic d={<path d="M5 12h4l3-9 4 18 3-9h0" />} />,
  plug: (
    <Ic
      d={
        <g>
          <path d="M9 2v6" />
          <path d="M15 2v6" />
          <path d="M6 9h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V9z" />
          <path d="M12 18v4" />
        </g>
      }
    />
  ),
  branch: (
    <Ic
      d={
        <g>
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </g>
      }
    />
  ),
  msg: (
    <Ic d={<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />} />
  ),
  card: (
    <Ic
      d={
        <g>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </g>
      }
    />
  ),
  folder: <Ic d={<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />} />,
  filter: <Ic d={<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />} />,
  refresh: (
    <Ic
      d={
        <g>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </g>
      }
    />
  ),
  clock: (
    <Ic
      d={
        <g>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </g>
      }
    />
  ),
};

/* ─── AgentOS mark ───────────────────────────────────────────── */
export const Mark = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="3" y="3" width="42" height="42" rx="10" stroke="var(--accent)" strokeWidth="2.6" />
    <rect x="9.5" y="11.5" width="3.5" height="3.5" rx=".5" fill="var(--accent)" />
    <rect x="13" y="15" width="3.5" height="3.5" rx=".5" fill="var(--accent)" />
    <rect x="16.5" y="18.5" width="3.5" height="3.5" rx=".5" fill="var(--accent)" />
    <rect x="13" y="22" width="3.5" height="3.5" rx=".5" fill="var(--accent)" />
    <rect x="9.5" y="25.5" width="3.5" height="3.5" rx=".5" fill="var(--accent)" />
    <rect x="9.5" y="32" width="12" height="3" rx=".5" fill="var(--accent)" />
  </svg>
);

/* ─── Integration brand logos ────────────────────────────────── */
const Logos: Record<string, React.ReactElement> = {
  github: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 .5C5.4.5 0 5.9 0 12.5c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.3v3.4c0 .3.2.7.8.6 4.8-1.6 8.2-6.1 8.2-11.4C24 5.9 18.6.5 12 .5z" />
    </svg>
  ),
  linear: (
    <svg viewBox="0 0 100 100" width="22" height="22" fill="currentColor">
      <path d="M1.22 61.45A50 50 0 0 0 38.55 98.78L1.22 61.45zM0 49.71l50.29 50.29c3.06-.16 6.07-.59 9-1.28L1.28 40.72A50.39 50.39 0 0 0 0 49.71zM4.24 28.42l67.34 67.34a50.36 50.36 0 0 0 7.04-4l-70.4-70.4a50.36 50.36 0 0 0-3.98 7.06zm9.7-13.42c10.3-9 23.7-14.5 38.4-14.7 27.6 0 50 22.4 50 50-.3 14.7-5.8 28.1-14.7 38.4L13.94 15z" />
    </svg>
  ),
  slack: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M5.04 15.16a2.523 2.523 0 0 1-2.52 2.52A2.523 2.523 0 0 1 0 15.16a2.527 2.527 0 0 1 2.52-2.52h2.52v2.52zM6.31 15.16a2.527 2.527 0 0 1 2.52-2.52 2.527 2.527 0 0 1 2.52 2.52v6.32A2.523 2.523 0 0 1 8.83 24a2.523 2.523 0 0 1-2.52-2.52v-6.32zM8.83 5.04A2.523 2.523 0 0 1 6.31 2.52 2.523 2.523 0 0 1 8.83 0a2.527 2.527 0 0 1 2.52 2.52v2.52H8.83zM8.83 6.31a2.527 2.527 0 0 1 2.52 2.52 2.527 2.527 0 0 1-2.52 2.52H2.52A2.523 2.523 0 0 1 0 8.83a2.523 2.523 0 0 1 2.52-2.52h6.31zM18.96 8.83a2.523 2.523 0 0 1 2.52-2.52A2.523 2.523 0 0 1 24 8.83a2.527 2.527 0 0 1-2.52 2.52h-2.52V8.83zM17.69 8.83a2.527 2.527 0 0 1-2.52 2.52 2.527 2.527 0 0 1-2.52-2.52V2.52A2.523 2.523 0 0 1 15.17 0a2.523 2.523 0 0 1 2.52 2.52v6.31zM15.17 18.96a2.523 2.523 0 0 1 2.52 2.52A2.523 2.523 0 0 1 15.17 24a2.527 2.527 0 0 1-2.52-2.52v-2.52h2.52zM15.17 17.69a2.527 2.527 0 0 1-2.52-2.52 2.527 2.527 0 0 1 2.52-2.52h6.31A2.523 2.523 0 0 1 24 15.17a2.523 2.523 0 0 1-2.52 2.52h-6.31z" />
    </svg>
  ),
  stripe: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M13.479 9.883c-1.626-.604-2.512-1.067-2.512-1.803 0-.622.511-.977 1.423-.977 1.667 0 3.379.642 4.558 1.22l.666-4.111c-.935-.446-2.847-1.177-5.49-1.177-1.87 0-3.425.489-4.536 1.401-1.155.954-1.757 2.334-1.757 4 0 3.023 1.847 4.312 4.847 5.403 1.936.688 2.581 1.178 2.581 1.934 0 .733-.629 1.155-1.762 1.155-1.403 0-3.716-.689-5.231-1.578l-.673 4.157C5.16 20.448 7.504 21 9.864 21c1.978 0 3.624-.467 4.736-1.355 1.245-.989 1.89-2.444 1.89-4.34 0-3.106-1.91-4.41-5.011-5.422z" />
    </svg>
  ),
  notion: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z" />
    </svg>
  ),
  fs: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="2" y1="11" x2="22" y2="11" />
    </svg>
  ),
};

/* ─── Types ──────────────────────────────────────────────────── */
export type MissionStatus = "running" | "awaiting" | "completed" | "queued" | "failed" | "paused";

export interface Mission {
  id: string;
  title: string;
  agent: string;
  status: MissionStatus;
  progress: number;
  created: string;
  integration?: string;
  model?: string;
  routeReason?: string;
  plan?: string;
  gate?: { verb: string; target: string };
}

export interface IntegrationCommand {
  name: string;
  ic: string;
  trigger: string;
  triggerLive: boolean;
  agent: string;
  desc: string;
}

export interface Integration {
  slug: string;
  name: string;
  handle: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  logo: React.ReactElement;
  connected: boolean;
  desc: string;
  commands: IntegrationCommand[];
}

/* ─── Agent info ─────────────────────────────────────────────── */
export const AGENT_INFO: Record<string, { ic: React.ReactElement; color: string; glow: string }> = {
  Coder: { ic: I.term, color: "var(--accent)", glow: "rgba(255,106,53,0.18)" },
  Writer: { ic: I.brain, color: "var(--status-ok)", glow: "rgba(34,201,122,0.16)" },
  Sentinel: { ic: I.shield, color: "var(--status-warn)", glow: "rgba(245,166,35,0.16)" },
  Researcher: { ic: I.spark, color: "var(--status-info)", glow: "rgba(123,179,255,0.14)" },
};

/* ─── Integrations config ────────────────────────────────────── */
export const INTEGRATIONS: Record<string, Integration> = {
  github: {
    slug: "github", name: "GitHub", handle: "github.com/GageDush",
    color: "#F3EFEB", bg: "#0d1117", border: "#30363d", glow: "rgba(243,239,235,0.10)",
    logo: Logos.github, connected: true,
    desc: "Wire your repos to the runtime. Review PRs, triage issues, sweep dependencies, and ship release notes — all from missions.",
    commands: [
      { name: "Review pull request", ic: "check", trigger: "on PR opened", triggerLive: true, agent: "Coder", desc: "Read diff, run tests, post inline review comments." },
      { name: "Triage issue", ic: "filter", trigger: "on issue label", triggerLive: true, agent: "Researcher", desc: "Classify by area, propose owners, surface related issues." },
      { name: "Sweep CVEs", ic: "shield", trigger: "cron · weekly", triggerLive: true, agent: "Sentinel", desc: "pnpm audit, classify findings, draft patch PRs." },
      { name: "Release notes", ic: "star", trigger: "on tag · v*", triggerLive: false, agent: "Writer", desc: "Draft markdown from merged PRs since last tag." },
      { name: "Refactor sweep", ic: "bolt", trigger: "manual", triggerLive: false, agent: "Coder", desc: "Detect deprecated APIs across selected paths." },
    ],
  },
  linear: {
    slug: "linear", name: "Linear", handle: "linear.app/flous",
    color: "#a195fc", bg: "#1d1c25", border: "#2e2c3d", glow: "rgba(161,149,252,0.16)",
    logo: Logos.linear, connected: true,
    desc: "Plan cycles, triage backlog, run daily standups, and keep velocity honest — without leaving the runtime.",
    commands: [
      { name: "Triage backlog", ic: "filter", trigger: "cron · daily 09:00", triggerLive: true, agent: "Researcher", desc: "Cluster new tickets, propose owners, flag duplicates." },
      { name: "Daily standup", ic: "msg", trigger: "cron · daily 09:30", triggerLive: true, agent: "Writer", desc: "Summarize yesterday's progress + blockers per assignee." },
      { name: "Sprint review draft", ic: "star", trigger: "cron · cycle end", triggerLive: true, agent: "Writer", desc: "Generate review notes from completed work." },
      { name: "Estimate ticket", ic: "bolt", trigger: "on label · needs-est", triggerLive: false, agent: "Researcher", desc: "Reference similar past work to propose point estimate." },
    ],
  },
  slack: {
    slug: "slack", name: "Slack", handle: "flous.slack.com",
    color: "#ECB22E", bg: "#1A1D21", border: "#383B41", glow: "rgba(236,178,46,0.14)",
    logo: Logos.slack, connected: true,
    desc: "Listen to channels, parse threads, draft replies, and route signal to the runtime. Quiet by default.",
    commands: [
      { name: "Summarize channel", ic: "archive", trigger: "cron · 17:00", triggerLive: true, agent: "Writer", desc: "Daily TL;DR of #general, #incidents, and #launches." },
      { name: "Mention monitor", ic: "msg", trigger: "on @gage", triggerLive: true, agent: "Researcher", desc: "Draft replies for review; you approve or edit before send." },
      { name: "Incident assist", ic: "shield", trigger: "on #incidents post", triggerLive: true, agent: "Sentinel", desc: "Pull related blackbox entries, link to runbook." },
    ],
  },
  stripe: {
    slug: "stripe", name: "Stripe", handle: "dashboard.stripe.com · acct_1NQ…",
    color: "#635BFF", bg: "#1d1a3a", border: "#2e2b50", glow: "rgba(99,91,255,0.16)",
    logo: Logos.stripe, connected: true,
    desc: "Handle failed charges, refund triage, and subscription audits. Money decisions always stop at the gate.",
    commands: [
      { name: "Failed payment recovery", ic: "refresh", trigger: "on charge.failed", triggerLive: true, agent: "Researcher", desc: "Retry per rules, then draft customer email — hold at gate." },
      { name: "Refund triage", ic: "card", trigger: "on refund.requested", triggerLive: true, agent: "Researcher", desc: "Classify by reason, surface history, propose action. Gate always." },
      { name: "Subscription audit", ic: "shield", trigger: "cron · weekly Mon", triggerLive: true, agent: "Sentinel", desc: "Find mismatched plans, churning trials, dunning escapes." },
    ],
  },
  notion: {
    slug: "notion", name: "Notion", handle: "notion.so/flous",
    color: "#F3EFEB", bg: "#191919", border: "#2f2f2f", glow: "rgba(255,255,255,0.08)",
    logo: Logos.notion, connected: false,
    desc: "Write to your team wiki. Memory notes sync, meeting recaps land in the right database.",
    commands: [],
  },
  fs: {
    slug: "fs", name: "Local filesystem", handle: "~/code/agentos",
    color: "var(--accent)", bg: "rgba(255,106,53,0.06)", border: "rgba(255,106,53,0.22)", glow: "rgba(255,106,53,0.14)",
    logo: Logos.fs, connected: true,
    desc: "Read, write, and patch local code. Sandbox profiles gate destructive ops.",
    commands: [
      { name: "Read file", ic: "archive", trigger: "tool", triggerLive: true, agent: "Coder", desc: "No gate · always allowed." },
      { name: "Write file", ic: "send", trigger: "tool", triggerLive: true, agent: "Coder", desc: "Gate · scope shown." },
      { name: "Run shell", ic: "term", trigger: "tool", triggerLive: true, agent: "Coder", desc: "Gate · command shown." },
      { name: "Grep search", ic: "search", trigger: "tool", triggerLive: true, agent: "Coder", desc: "No gate · read-only." },
    ],
  },
};

/* ─── Provider brand marks ───────────────────────────────────── */
const ProviderLogos: Record<string, React.ReactElement> = {
  ollama: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M6.6 3.2c.9 0 1.6.8 1.9 1.9.9-.5 2-.7 3.5-.7s2.6.2 3.5.7c.3-1.1 1-1.9 1.9-1.9 1.2 0 2 1.3 2 3 0 .9-.3 1.7-.7 2.2 1 .9 1.6 2.2 1.6 3.8v3.1c0 2.5-2 4.5-4.5 4.5h-7.2c-2.5 0-4.5-2-4.5-4.5v-3.1c0-1.6.6-2.9 1.6-3.8-.4-.5-.7-1.3-.7-2.2 0-1.7.8-3 2-3Z" />
      <ellipse cx="9.4" cy="12.4" rx="1" ry="1.4" fill="#0A0908" />
      <ellipse cx="14.6" cy="12.4" rx="1" ry="1.4" fill="#0A0908" />
    </svg>
  ),
  claude: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <g>
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d="M12 2.2 12.85 9 12 12 11.15 9 Z" transform={`rotate(${i * 30} 12 12)`} />
        ))}
      </g>
    </svg>
  ),
  chatgpt: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="4.4" ry="9" />
      <ellipse cx="12" cy="12" rx="4.4" ry="9" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="4.4" ry="9" transform="rotate(120 12 12)" />
    </svg>
  ),
  cursor: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M5 3 19.2 11.6 12.6 12.7 9.2 19 Z" />
    </svg>
  ),
  gemini: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12 2c.45 4.8 3.4 7.75 8 8-4.6.25-7.55 3.2-8 8-.45-4.8-3.4-7.75-8-8 4.6-.25 7.55-3.2 8-8Z" />
    </svg>
  ),
};

export interface ProviderWindow {
  id: string;
  cadence: string;
  fast: boolean;
  label: string;
  used: number;
  detail: string;
}
export interface Provider {
  slug: string;
  name: string;
  plan: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  logo: React.ReactElement;
  local?: boolean;
  metered: boolean;
  tpm: number;
  share: number;
  routeFor: string;
  models: string[];
  windows: ProviderWindow[];
}

export const ROUTED_TODAY = 4_720_000;

export const PROVIDERS: Record<string, Provider> = {
  ollama: {
    slug: "ollama", name: "Ollama", plan: "Local · unmetered", color: "var(--accent)",
    bg: "rgba(255,106,53,0.08)", border: "rgba(255,106,53,0.26)", glow: "rgba(255,106,53,0.16)",
    logo: ProviderLogos.ollama, local: true, metered: false, tpm: 2480, share: 0.46,
    routeFor: "Default route — routine code, search, summaries, anything privacy-sensitive. $0, no caps.",
    models: ["qwen2.5-coder:32b", "llama3.1:70b", "qwen2.5:14b"],
    windows: [],
  },
  claude: {
    slug: "claude", name: "Claude Max", plan: "$100 / mo · Max 5×", color: "#D97757",
    bg: "rgba(217,119,87,0.10)", border: "rgba(217,119,87,0.30)", glow: "rgba(217,119,87,0.18)",
    logo: ProviderLogos.claude, metered: true, tpm: 1180, share: 0.22,
    routeFor: "Escalation route — hard reasoning, gnarly multi-file refactors, judgement calls.",
    models: ["claude-sonnet-4", "claude-opus-4"],
    windows: [
      { id: "5hr", cadence: "5HR", fast: true, label: "Session", used: 64, detail: "~7.1k / 11k msg-eq" },
      { id: "wk", cadence: "WK", fast: true, label: "Weekly", used: 38, detail: "rolling 7-day cap" },
    ],
  },
  chatgpt: {
    slug: "chatgpt", name: "ChatGPT Pro", plan: "Pro · $200 / mo · Codex", color: "#19C37D",
    bg: "rgba(25,195,125,0.09)", border: "rgba(25,195,125,0.28)", glow: "rgba(25,195,125,0.16)",
    logo: ProviderLogos.chatgpt, metered: true, tpm: 760, share: 0.14,
    routeFor: "Agentic cloud work — Codex sandboxed PR tasks, long autonomous runs.",
    models: ["gpt-5-codex", "gpt-4o", "o4-mini"],
    windows: [
      { id: "wk", cadence: "WK", fast: true, label: "Codex weekly", used: 47, detail: "agent-task cap" },
      { id: "mo", cadence: "MO", fast: false, label: "Monthly", used: 23, detail: "GPT usage pool" },
    ],
  },
  cursor: {
    slug: "cursor", name: "Cursor Pro", plan: "Pro · $20 / mo", color: "#D6DBDF",
    bg: "rgba(214,219,223,0.08)", border: "rgba(214,219,223,0.22)", glow: "rgba(214,219,223,0.12)",
    logo: ProviderLogos.cursor, metered: true, tpm: 540, share: 0.1,
    routeFor: "In-editor — tab completions, quick inline edits, scoped patches.",
    models: ["cursor-composer", "auto"],
    windows: [{ id: "mo", cadence: "MO", fast: false, label: "Fast requests", used: 62, detail: "312 / 500 req" }],
  },
  gemini: {
    slug: "gemini", name: "Gemini Pro", plan: "Pro · $20 / mo", color: "#5B8DEF",
    bg: "rgba(91,141,239,0.10)", border: "rgba(91,141,239,0.28)", glow: "rgba(91,141,239,0.16)",
    logo: ProviderLogos.gemini, metered: true, tpm: 430, share: 0.08,
    routeFor: "Huge context — 1M-token synthesis, multimodal, whole-repo reads.",
    models: ["gemini-2.5-pro", "gemini-2.0-flash"],
    windows: [{ id: "mo", cadence: "MO", fast: false, label: "Monthly", used: 18, detail: "1M-ctx pool" }],
  },
};

/* ─── Initial mission seed ───────────────────────────────────── */
export const initialMissions: Mission[] = [
  { id: "run-8x4f", title: "Refactor authentication middleware to use JWE", agent: "Coder", status: "running", progress: 0.62, created: "14:08", integration: "github", model: "ollama/qwen2.5-coder:32b", routeReason: "Local-first — routine multi-file edit, no external context needed.", plan: "JWT → JWE migration in src/auth/middleware.ts. Verify route handlers, run integration tests." },
  { id: "run-2k9a", title: "Write unit tests for billing module", agent: "Coder", status: "awaiting", progress: 0.4, created: "14:21", integration: "github", model: "anthropic/claude-sonnet-4", routeReason: "Escalated to Claude — test generation needs deeper reasoning across the webhook surface.", plan: "Generate vitest specs for stripe webhook handlers. Coverage target 80%.", gate: { verb: "write_file", target: "src/billing/__tests__/webhook.spec.ts" } },
  { id: "run-7m3b", title: "Generate API documentation from OpenAPI spec", agent: "Writer", status: "completed", progress: 1, created: "13:42", integration: "github", model: "openai/gpt-4o", routeReason: "ChatGPT — structured doc rendering from a fixed spec.", plan: "Render markdown reference from openapi.yaml. Output to docs/api/." },
  { id: "run-3f2c", title: "Sweep dependency CVEs · weekly", agent: "Sentinel", status: "awaiting", progress: 0.85, created: "13:30", integration: "github", model: "ollama/llama3.1:70b", routeReason: "Local — CVE classification over cached advisories, kept on-device.", plan: "Run pnpm audit, classify findings, propose patches.", gate: { verb: "shell", target: "pnpm up --latest @nestjs/*" } },
  { id: "run-9p4d", title: "Summarize Q2 product feedback into themes", agent: "Researcher", status: "queued", progress: 0, created: "14:34", integration: "linear", model: "google/gemini-2.5-pro", routeReason: "Gemini — 1M-token window clusters all Q2 feedback in one pass.", plan: "Cluster intercom + linear tickets, output 5-7 themes." },
  { id: "run-5n8e", title: "Migrate database schema for v0.2", agent: "Coder", status: "failed", progress: 0.55, created: "12:08", integration: "fs", model: "cursor/cursor-composer", routeReason: "Cursor — in-editor schema patch against the live workspace.", plan: "Drop deprecated cols, run prisma migrate dev." },
  { id: "run-rf12", title: 'Refund triage · "shipped late"', agent: "Researcher", status: "awaiting", progress: 0.7, created: "14:28", integration: "stripe", model: "anthropic/claude-sonnet-4", routeReason: "Claude — nuanced refund judgement on a real customer history.", plan: "Review customer history, classify, propose refund.", gate: { verb: "stripe.refund", target: "ch_3Mq… · $48.00" } },
  { id: "run-sl09", title: "Summarize #incidents · today", agent: "Writer", status: "running", progress: 0.3, created: "14:34", integration: "slack", model: "ollama/llama3.1:70b", routeReason: "Local — summarize 24h of channel logs without sending them off-box.", plan: "Read past 24h, draft incident timeline, attach blackbox links." },
];

export interface MarqueeEvent {
  ts: string;
  tag: string;
  tagCls: string;
  id: string;
  body: string;
}

export const initialMarquee: MarqueeEvent[] = [
  { ts: "14:32", tag: "OK", tagCls: "ok", id: "run-7m3b", body: "API documentation rendered to docs/api/" },
  { ts: "14:30", tag: "GATE", tagCls: "run", id: "run-2k9a", body: "awaiting write_file(src/billing/__tests__/webhook.spec.ts)" },
  { ts: "14:28", tag: "RUN", tagCls: "run", id: "run-8x4f", body: "started — Refactor authentication middleware" },
  { ts: "14:24", tag: "OK", tagCls: "ok", id: "run-4r2x", body: "pnpm test passed · 42 of 42" },
  { ts: "14:20", tag: "WARN", tagCls: "warn", id: "run-3f2c", body: "3 deprecated jwt.sign() callsites detected" },
  { ts: "14:18", tag: "OK", tagCls: "ok", id: "run-1m8w", body: "memory note pinned · JWE migration context" },
  { ts: "14:12", tag: "GATE", tagCls: "run", id: "run-3f2c", body: "awaiting shell pnpm up --latest @nestjs/*" },
  { ts: "14:08", tag: "ERR", tagCls: "err", id: "run-5n8e", body: "prisma migrate failed · rollback applied" },
];
