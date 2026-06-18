/* eslint-disable */
"use client";

/* ────────────────────────────────────────────────────────────────────────
   AgentOS Forge — Home / Dashboard surface.
   React port of the Claude Design "AgentOS — Home" handoff (Jun 2026):
   hero · compose · missions · control gate · smart analytics ·
   token sources · integrations · activity marquee · footer.

   Styling lives in src/styles/forge-home.css (loaded by app/page.tsx).
   Seed data is in ./forge-home-data — swap it for live runtime adapters
   to wire the home to real data; the component props are already shaped
   for it (missions in, approve/deny/run handlers out).
   ──────────────────────────────────────────────────────────────────────── */

import * as React from "react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  I,
  Mark,
  AGENT_INFO,
  INTEGRATIONS,
  PROVIDERS,
  ROUTED_TODAY,
  initialMissions,
  initialMarquee,
  type Mission,
  type MarqueeEvent,
} from "./forge-home-data";
import { ForgeNav } from "../forge/ForgeNav";
import { FORGE_NAV_MORE, FORGE_NAV_PRIMARY } from "../forge/forge-nav-items";
import { useForgeHomeData } from "./useForgeHomeData";

/* ════════════════════════════════════════════════════════════════
   Navigation — map the prototype's surface keys to real app routes.
   ════════════════════════════════════════════════════════════════ */
const ROUTE_MAP: Record<string, string> = {
  home: "/",
  missions: "/missions",
  gate: "/control-gate",
  agents: "/loadout",
  memory: "/wiki",
  blackbox: "/blackbox",
  settings: "/settings",
  tools: "/routines",
  router: "/",
  integrations: "/operators",
};

function useNavigate() {
  const router = useRouter();
  return useCallback(
    (key: string) => {
      let path = ROUTE_MAP[key];
      if (!path) {
        if (key.startsWith("i/")) path = "/operators";
        else if (key.startsWith("missions?")) path = "/missions";
        else path = "/" + key;
      }
      router.push(path);
    },
    [router]
  );
}

/* ════════════════════════════════════════════════════════════════
   Design-system primitives (Button / Badge) — ported from _ds_bundle
   ════════════════════════════════════════════════════════════════ */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<BtnVariant, { base: React.CSSProperties; hover: React.CSSProperties }> = {
  primary: {
    base: { background: "var(--forge-orange-400)", color: "var(--forge-bg-base)", border: "1px solid transparent" },
    hover: { background: "var(--forge-orange-300)", boxShadow: "var(--glow-accent-sm)" },
  },
  secondary: {
    base: { background: "var(--color-raised)", color: "var(--color-fg-2)", border: "1px solid var(--color-border)" },
    hover: { background: "var(--color-surface)", color: "var(--color-fg-1)", borderColor: "var(--color-border-mid)" },
  },
  ghost: {
    base: { background: "transparent", color: "var(--color-fg-3)", border: "1px solid transparent" },
    hover: { background: "var(--forge-bg-hover)", color: "var(--color-fg-1)" },
  },
  danger: {
    base: { background: "var(--status-err-bg)", color: "var(--status-err)", border: "1px solid var(--status-err-border)" },
    hover: { background: "rgba(239,69,69,0.18)" },
  },
};
const BTN_SIZE: Record<BtnSize, React.CSSProperties> = {
  sm: { height: "28px", padding: "0 10px", fontSize: "var(--text-sm)", gap: "5px" },
  md: { height: "34px", padding: "0 14px", fontSize: "var(--text-base)", gap: "6px" },
  lg: { height: "42px", padding: "0 18px", fontSize: "var(--text-md)", gap: "8px" },
};

function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  children,
  icon,
}: {
  variant?: BtnVariant;
  size?: BtnSize;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const v = BTN_VARIANT[variant];
  const s = BTN_SIZE[size];
  const hoverStyle = hovered && !disabled ? v.hover : {};
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        fontWeight: 500 as any,
        letterSpacing: "var(--tracking-wide)",
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.38 : 1,
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "background 150ms ease, color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
        ...s,
        ...v.base,
        ...hoverStyle,
      }}
    >
      {icon != null && <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>}
      {children}
    </button>
  );
}

const BADGE_STATUS: Record<string, { bg: string; color: string; border: string; pulse: boolean }> = {
  running: { bg: "var(--forge-orange-glow)", color: "var(--forge-orange-300)", border: "var(--color-border-accent)", pulse: true },
  queued: { bg: "var(--color-raised)", color: "var(--color-fg-3)", border: "var(--color-border)", pulse: false },
  paused: { bg: "var(--status-warn-bg)", color: "var(--status-warn)", border: "var(--status-warn-border)", pulse: false },
  failed: { bg: "var(--status-err-bg)", color: "var(--status-err)", border: "var(--status-err-border)", pulse: false },
  completed: { bg: "var(--status-ok-bg)", color: "var(--status-ok)", border: "var(--status-ok-border)", pulse: false },
  awaiting: { bg: "var(--status-warn-bg)", color: "var(--status-warn)", border: "var(--status-warn-border)", pulse: true },
  default: { bg: "var(--color-raised)", color: "var(--color-fg-3)", border: "var(--color-border)", pulse: false },
};

function Badge({ status, children, dot = true, size = "md" }: { status: string; children?: React.ReactNode; dot?: boolean; size?: "sm" | "md" }) {
  const s = BADGE_STATUS[status] || BADGE_STATUS.default;
  const fontSize = size === "sm" ? "var(--text-2xs)" : "var(--text-xs)";
  const padding = size === "sm" ? "1px 5px" : "2px 7px";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontFamily: "var(--font-mono)",
        fontWeight: 500 as any,
        fontSize,
        letterSpacing: "var(--tracking-wider)",
        textTransform: "uppercase",
        padding,
        borderRadius: "var(--radius-sm)",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {dot && (
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: s.color,
            flexShrink: 0,
            animation: s.pulse ? "pulse-dot 1.8s ease-in-out infinite" : "none",
          }}
        />
      )}
      {children != null ? children : status}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════
   Hooks — counter / scroll reveal / ambient pointer glow
   ════════════════════════════════════════════════════════════════ */
function useCounter(target: number, ready: boolean, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ready, duration]);
  return val;
}

function useReveal(deps: React.DependencyList = []) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    const els = document.querySelectorAll(".reveal:not(.in), .stagger:not(.in)");
    els.forEach((el) => io.observe(el));
    requestAnimationFrame(() => {
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    });
    const safety = setTimeout(() => els.forEach((el) => el.classList.add("in")), 1800);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
    // eslint-disable-next-line
  }, deps);
}

function useAmbient() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMove = (e: PointerEvent) => {
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
}

/* ════════════════════════════════════════════════════════════════
   Section header
   ════════════════════════════════════════════════════════════════ */
function SectionHead({
  num,
  label,
  title,
  sub,
  right,
}: {
  num: string;
  label: string;
  title: string;
  sub?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="reveal">
      <div className="s-meta">
        <span className="num">{num}/</span>
        <span className="label">{label}</span>
        <span className="rail" />
        {right && <span className="rail-r">{right}</span>}
      </div>
      <h2 className="s-h" dangerouslySetInnerHTML={{ __html: title }} />
      {sub && <p className="s-sub">{sub}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════════════════════ */
function Hero({
  counts,
  clock,
  loading,
}: {
  counts: { active: number; awaiting: number; todayRuns: number };
  clock: string;
  loading?: boolean;
}) {
  const runs = useCounter(loading ? 0 : counts.todayRuns, !loading);
  const stat = (n: number) => (loading ? "—" : String(n));
  return (
    <section className="hero container" id="hero">
      <div className="hero-grid">
        <div className="reveal">
          <span className="hero-pill">
            <span className="d" />
            RUNTIME · LIVE · localhost:3000
          </span>
          <h1 className="hero-h">
            Your agents,
            <br />
            <em>in formation.</em>
          </h1>
          <p className="hero-sub">
            A local-first command center for running, supervising, and shipping autonomous agent missions across your tools — with you at every control gate.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className={`v${loading ? " hero-stat-loading" : ""}`}>{stat(counts.active)}</div>
              <div className="l">Missions running</div>
            </div>
            <div className="hero-stat">
              <div className={`v${loading ? " hero-stat-loading" : ""}`}>
                {loading ? "—" : <em>{counts.awaiting}</em>}
              </div>
              <div className="l">Awaiting you</div>
            </div>
            <div className="hero-stat">
              <div className={`v${loading ? " hero-stat-loading" : ""}`}>{loading ? "—" : Math.round(runs)}</div>
              <div className="l">Runs today</div>
            </div>
          </div>
          <div className="scroll-cue">
            <span className="bar" />
            Scroll · {clock}
          </div>
        </div>

        <div className="hero-art reveal">
          <div className="orb" />
          <div className="ring" />
          <div className="ring r2" />
          <div className="ring r3" />
          <div className="mark-frame">
            <Mark size={120} />
          </div>
          <div className="pin pin-1 ok">
            <span className="d" style={{ background: "var(--status-ok)" }} />
            api · <span className="v">204ms</span>
          </div>
          <div className="pin pin-2 acc">
            <span className="d" style={{ background: "var(--accent)" }} />
            run-8x4f · <span className="v">62%</span>
          </div>
          <div className="pin pin-3 warn">
            <span className="d" style={{ background: "var(--status-warn)" }} />
            gate · <span className="v">{loading ? "…" : `${counts.awaiting} pending`}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   COMPOSE
   ════════════════════════════════════════════════════════════════ */
function Compose({ onRun }: { onRun: (p: { title: string; agent: string; model: string; sandbox: string }) => void }) {
  const [text, setText] = useState("");
  const [agent, setAgent] = useState("Coder");
  const [model, setModel] = useState("ollama/qwen2.5-coder");
  const [sandbox, setSandbox] = useState("low");
  const ta = useRef<HTMLTextAreaElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const doRun = useCallback(() => {
    if (!text.trim()) return;
    onRun({ title: text.trim(), agent, model, sandbox });
    setText("");
  }, [text, agent, model, sandbox, onRun]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && document.activeElement === ta.current) {
        e.preventDefault();
        doRun();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [doRun]);

  // Magnetic Run button
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const onMove = (e: PointerEvent) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const range = 80;
      if (dist < range) {
        const f = 1 - dist / range;
        btn.style.transform = `translate(${dx * 0.22 * f}px, ${dy * 0.22 * f}px)`;
      } else {
        btn.style.transform = "";
      }
    };
    const onLeave = () => {
      btn.style.transform = "";
    };
    window.addEventListener("pointermove", onMove);
    btn.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      btn.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const examples = [
    "Refactor the cache layer to use SWR",
    "Sweep CVEs and propose patches",
    "Write release notes for v0.2",
    "Draft refund reply for ch_3Mq…",
  ];

  return (
    <section className="s container" id="compose">
      <SectionHead
        num="001"
        label="Compose"
        right="⌘ + ↵ to run"
        title="A mission, <em>in your words.</em>"
        sub="Describe the objective. AgentOS picks the agent, model, and sandbox that fit — you can override before running."
      />
      <div className="compose-card reveal" style={{ marginTop: 40 }}>
        <div className="lbl">New mission · objective</div>
        <textarea
          ref={ta}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the mission. e.g. Refactor the auth middleware to use JWE."
          rows={2}
        />
        <div className="compose-row">
          <span className="picker">
            <span style={{ color: "var(--accent)", display: "inline-flex" }}>{AGENT_INFO[agent].ic}</span>
            <span className="k">agent</span>
            <select value={agent} onChange={(e) => setAgent(e.target.value)}>
              {Object.keys(AGENT_INFO).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            {I.chevD}
          </span>
          <span className="picker">
            <span className="k">model</span>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option>ollama/qwen2.5-coder</option>
              <option>ollama/llama3.1:70b</option>
              <option>openai/gpt-4o</option>
              <option>anthropic/claude-sonnet</option>
            </select>
            {I.chevD}
          </span>
          <span className="picker">
            <span className="k">sandbox</span>
            <select value={sandbox} onChange={(e) => setSandbox(e.target.value)}>
              <option>low</option>
              <option>strict</option>
              <option>off</option>
            </select>
            {I.chevD}
          </span>
          <span className="compose-spacer" />
          <span className="kbd-hint">
            <kbd>⌘</kbd> + <kbd>↵</kbd>
          </span>
          <button className="btn-run" ref={btnRef} onClick={doRun} disabled={!text.trim()}>
            Run mission {I.arrow}
          </button>
        </div>
        {!text && (
          <div className="examples">
            {examples.map((ex) => (
              <button key={ex} className="example-chip" onClick={() => setText(ex)}>
                + {ex}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   MISSION CARD
   ════════════════════════════════════════════════════════════════ */
function MissionCard({ m, selected, onClick }: { m: Mission; selected: boolean; onClick: () => void }) {
  const info = AGENT_INFO[m.agent] || AGENT_INFO.Coder;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lx", e.clientX - r.left + "px");
      el.style.setProperty("--ly", e.clientY - r.top + "px");
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);
  const intCfg = m.integration ? INTEGRATIONS[m.integration] : null;
  return (
    <div ref={ref} className={`miss-card ${selected ? "sel" : ""}`} onClick={onClick}>
      <div className="mc-head">
        <Badge status={m.status} size="sm" />
        {intCfg && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: intCfg.color,
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.06em",
            }}
          >
            <span style={{ width: 12, height: 12, display: "grid", placeItems: "center" }}>
              {React.cloneElement(intCfg.logo, { width: 10, height: 10 } as any)}
            </span>
            {intCfg.name}
          </span>
        )}
        <span className="mc-id">{m.id}</span>
      </div>
      <div className="mc-title">{m.title}</div>
      <div className="mc-meta">
        <span className="agent">
          <span className="ai" style={{ color: info.color }}>
            {info.ic}
          </span>
          {m.agent}
        </span>
        <span>·</span>
        <span style={{ color: "var(--color-fg-4)" }}>{m.created}</span>
      </div>
      <div className="mc-prog">
        <span className={`fill ${m.progress === 0 ? "idle" : ""}`} style={{ width: `${Math.max(2, m.progress * 100)}%` }} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   GATE ITEM
   ════════════════════════════════════════════════════════════════ */
function HomeGateItem({
  m,
  onApprove,
  onDeny,
}: {
  m: { id: string; agent: string; title: string; integration?: string; gate: { verb: string; target: string } };
  onApprove: (id: string, mode: string) => void;
  onDeny: (id: string) => void;
}) {
  const intCfg = m.integration ? INTEGRATIONS[m.integration] : null;
  return (
    <div className="gate-card reveal">
      <div>
        <div className="gate-head-row">
          <Badge status="awaiting" size="sm" />
          {intCfg && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: 999,
                background: intCfg.bg,
                border: `1px solid ${intCfg.border}`,
                color: intCfg.color,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
              }}
            >
              <span style={{ width: 12, height: 12, display: "grid", placeItems: "center" }}>
                {React.cloneElement(intCfg.logo, { width: 10, height: 10 } as any)}
              </span>
              {intCfg.name}
            </span>
          )}
          <span className="gate-id">
            {m.id} · {m.agent}
          </span>
        </div>
        <div className="gate-scope-line">
          <span className="verb">{m.gate!.verb}</span>(<span className="target">{m.gate!.target}</span>)
        </div>
        <div className="gate-mission-line">{m.title}</div>
      </div>
      <div className="gate-actions">
        <Button size="sm" onClick={() => onApprove(m.id, "once")}>
          Approve once
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onApprove(m.id, "mission")}>
          For mission
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDeny(m.id)}>
          Deny
        </Button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ANALYTICS
   ════════════════════════════════════════════════════════════════ */
function HealthDonut({ ok, warn, err, total }: { ok: number; warn: number; err: number; total: number }) {
  const radius = 50;
  const c = 2 * Math.PI * radius;
  const okPct = ok / total;
  const warnPct = warn / total;
  const okLen = c * okPct;
  const warnLen = c * warnPct;
  const errLen = c * (err / total);
  return (
    <div className="health-donut">
      <svg viewBox="0 0 130 130">
        <circle className="track" cx="65" cy="65" r={radius} strokeWidth="10" />
        <g transform="rotate(-90 65 65)">
          <circle cx="65" cy="65" r={radius} strokeWidth="10" stroke="var(--status-ok)" className="seg" strokeDasharray={`${okLen} ${c}`} strokeDashoffset="0" />
          <circle cx="65" cy="65" r={radius} strokeWidth="10" stroke="var(--status-warn)" className="seg" strokeDasharray={`${warnLen} ${c}`} strokeDashoffset={`${-okLen}`} />
          <circle cx="65" cy="65" r={radius} strokeWidth="10" stroke="var(--status-err)" className="seg" strokeDasharray={`${errLen} ${c}`} strokeDashoffset={`${-(okLen + warnLen)}`} />
        </g>
        <text className="center" x="65" y="62" textAnchor="middle">
          {Math.round(okPct * 100)}%
        </text>
        <text className="center-l" x="65" y="78" textAnchor="middle">
          SUCCESS
        </text>
      </svg>
      <div className="health-key">
        <div className="row">
          <span className="d" style={{ background: "var(--status-ok)" }} />
          Completed <span className="v">{ok}</span>
        </div>
        <div className="row">
          <span className="d" style={{ background: "var(--status-warn)" }} />
          Awaiting <span className="v">{warn}</span>
        </div>
        <div className="row">
          <span className="d" style={{ background: "var(--status-err)" }} />
          Failed <span className="v">{err}</span>
        </div>
        <div className="row" style={{ color: "var(--color-fg-4)", borderTop: "1px solid var(--color-border)", paddingTop: 8, marginTop: 4 }}>
          Total <span className="v">{total}</span>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ values, w = 240, h = 56 }: { values: number[]; w?: number; h?: number }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2] as [number, number]);
  const linePath = "M " + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
  const fillPath = linePath + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,106,53,0.25)" />
          <stop offset="100%" stopColor="rgba(255,106,53,0)" />
        </linearGradient>
      </defs>
      <path className="fill" d={fillPath} />
      <path className="line" d={linePath} />
      {pts.slice(-1).map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--accent)" style={{ filter: "drop-shadow(0 0 4px rgba(255,106,53,0.8))" }} />
      ))}
    </svg>
  );
}

function Analytics({ missions }: { missions: Mission[] }) {
  const ok = missions.filter((m) => m.status === "completed").length + 12;
  const warn = missions.filter((m) => m.status === "awaiting").length;
  const err = missions.filter((m) => m.status === "failed").length + 1;
  const total = ok + warn + err;

  const [sparkVals, setSparkVals] = useState<number[]>(() =>
    Array.from({ length: 28 }, (_, i) => 40 + Math.sin(i / 3) * 14 + 4)
  );
  const [hours] = useState<number[]>(() =>
    Array.from({ length: 24 }, (_, i) => (i >= 9 && i <= 18 ? 60 : 20) + ((i * 13) % 30))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSparkVals((prev) => [...prev.slice(1), prev[prev.length - 1] + (Math.random() - 0.5) * 8]);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const latency = useCounter(204, true);
  const memory = useCounter(3247, true);

  const skills = [
    { name: "Code edit", v: 92 },
    { name: "Code search", v: 88 },
    { name: "Test runner", v: 76 },
    { name: "Doc gen", v: 70 },
    { name: "CVE scan", v: 64 },
  ];

  const peakHour = hours.indexOf(Math.max(...hours));

  return (
    <section className="s container" id="analytics">
      <SectionHead num="004" label="Smart analytics" right="LAST 24H · LIVE" title="Runtime, at a <em>glance.</em>" sub="The signals you'd otherwise grep for. Refreshed live from the runtime." />
      <div className="widgets stagger">
        <div className="widget w-tall">
          <div className="widget-h">
            Mission Health
            <span className="badge-mini">7D</span>
            <span className="live-dot" />
          </div>
          <HealthDonut ok={ok} warn={warn} err={err} total={total} />
        </div>

        <div className="widget">
          <div className="widget-h">
            Gateway Latency
            <span className="live-dot" />
          </div>
          <div className="big-num">
            {Math.round(latency)}
            <span className="unit">ms</span>
          </div>
          <div className="big-sub">
            <span className="delta-up">↓ 18ms</span> from yesterday · p95
          </div>
          <Sparkline values={sparkVals} />
        </div>

        <div className="widget">
          <div className="widget-h">
            Memory Store
            <span className="badge-mini acc">3 PINNED</span>
          </div>
          <div className="big-num">
            {Math.round(memory).toLocaleString()}
            <span className="unit">notes</span>
          </div>
          <div className="big-sub">+12 today · 184 MB on disk</div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11 }}>
            <div style={{ padding: "6px 8px", background: "var(--forge-bg-overlay)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
              <div style={{ color: "var(--color-fg-4)", fontSize: 9, letterSpacing: "0.1em" }}>SESSIONS</div>
              <div style={{ color: "var(--color-fg-1)", fontWeight: 600 }}>847</div>
            </div>
            <div style={{ padding: "6px 8px", background: "var(--forge-bg-overlay)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
              <div style={{ color: "var(--color-fg-4)", fontSize: 9, letterSpacing: "0.1em" }}>AREAS</div>
              <div style={{ color: "var(--color-fg-1)", fontWeight: 600 }}>23</div>
            </div>
          </div>
        </div>

        <div className="widget w-wide">
          <div className="widget-h">
            Activity · last 24h
            <span className="badge-mini">PEAK {String(peakHour).padStart(2, "0")}:00</span>
            <span className="live-dot" />
          </div>
          <div className="activity-bars">
            {hours.map((hh, i) => (
              <span key={i} className={`b ${i === peakHour ? "hot" : ""}`} style={{ height: `${(hh / 100) * 100}%` }} title={`${String(i).padStart(2, "0")}:00 — ${Math.round(hh)} runs`} />
            ))}
          </div>
          <div className="activity-x">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>

        <div className="widget">
          <div className="widget-h">
            Skill Benchmarks
            <span className="badge-mini">LIVE</span>
          </div>
          <div className="skill-bars" style={{ marginTop: 4 }}>
            {skills.map((sk) => (
              <div className="sb" key={sk.name}>
                <span className="name">{sk.name}</span>
                <span className="bar">
                  <span className="fill" style={{ width: `${sk.v}%` }} />
                </span>
                <span className="v">{sk.v}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   TOKEN SOURCES / PROVIDERS overview
   ════════════════════════════════════════════════════════════════ */
function ProvidersOverview({ navigate }: { navigate: (k: string) => void }) {
  const providers = Object.values(PROVIDERS);
  const localShare = Math.round((PROVIDERS.ollama.share || 0) * 100);
  const routedM = (ROUTED_TODAY / 1_000_000).toFixed(2);
  return (
    <section className="s container" id="providers">
      <SectionHead
        num="005"
        label="Token sources"
        right={<a href="#/router" onClick={(e) => { e.preventDefault(); navigate("router"); }} style={{ color: "var(--accent)" }}>open Router →</a>}
        title="Every model, <em>one router.</em>"
        sub="AgentOS routes each mission to the cheapest capable provider — local-first, escalating only when the work demands it."
      />
      <div className="prov-summary">
        <div className="ps">
          <div className="psv">
            {routedM}
            <span className="psu">M tok</span>
          </div>
          <div className="psl">Routed today</div>
        </div>
        <div className="ps">
          <div className="psv">{providers.length}</div>
          <div className="psl">Providers wired</div>
        </div>
        <div className="ps">
          <div className="psv">
            {localShare}
            <span className="psu">%</span>
          </div>
          <div className="psl">Stayed local</div>
        </div>
      </div>
      <div className="prov-grid">
        {providers.map((p) => (
          <div
            key={p.slug}
            className="prov-card"
            onClick={() => navigate("router")}
            style={{ "--prov-glow": p.glow, "--prov-border": p.border, "--prov-color": p.color } as React.CSSProperties}
          >
            <div className="prov-head">
              <div className="prov-mark" style={{ width: 40, height: 40, "--prov-bg": p.bg, "--prov-border": p.border, "--prov-color": p.color } as React.CSSProperties}>
                {p.logo}
              </div>
              <div className="prov-id">
                <div className="prov-name">{p.name}</div>
                <div className="prov-plan">{p.plan}</div>
              </div>
              <div className="prov-share">{Math.round(p.share * 100)}%</div>
            </div>

            {p.local || p.windows.length === 0 ? (
              <div className="qlocal">
                <div className="qline">
                  <div className="qline-head">
                    <span className="qline-label">Local engine</span>
                    <span className="q-left">unmetered</span>
                  </div>
                  <div className="qline-foot">
                    <span className="q-detail">{p.models[0]}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="qbars">
                {p.windows.map((w) => (
                  <div className="qline" key={w.id}>
                    <div className="qline-head">
                      <span className="cad-chip fast" style={{ marginRight: 6 }}>{w.cadence}</span>
                      <span className="qline-label">{w.label}</span>
                      <span className="q-left">{w.used}%</span>
                    </div>
                    <div className="qbar">
                      <span className="fill" style={{ width: `${w.used}%`, background: p.color, color: p.color }} />
                    </div>
                    <div className="qline-foot">
                      <span className="q-detail">{w.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="prov-foot">
              <div className="tpm">
                <span className="tpm-dot" style={{ background: p.color, color: p.color }} />
                {p.tpm.toLocaleString()} tok/min
              </div>
              <div className="prov-go">
                routing {I.arrow}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   INTEGRATIONS preview
   ════════════════════════════════════════════════════════════════ */
function IntegrationsPreview({ navigate, missions }: { navigate: (k: string) => void; missions: Mission[] }) {
  const tiles = Object.values(INTEGRATIONS).filter((i) => i.connected).slice(0, 4);
  return (
    <section className="s container" id="integrations">
      <SectionHead num="006" label="Surfaces" right="4 OF 6 CONNECTED" title="Wired into <em>your tools.</em>" sub="Each connected service exposes commands you can wire to agents. Tap a card for the full dashboard." />
      <div className="int-grid stagger" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {tiles.map((it) => (
          <a
            key={it.slug}
            className="int-card"
            href={`#/i/${it.slug}`}
            onClick={(e) => {
              e.preventDefault();
              navigate("i/" + it.slug);
            }}
            style={{ "--int-bg": it.bg, "--int-border": it.border, "--int-color": it.color, "--int-glow": it.glow } as React.CSSProperties}
          >
            <div className="int-card-head">
              <div className="int-card-logo">{it.logo}</div>
              <div className="int-card-info">
                <div className="int-card-name">{it.name}</div>
                <div className="int-card-handle">{it.handle}</div>
              </div>
              <span className="int-card-status">
                <span className="d" />
                LIVE
              </span>
            </div>
            <div className="int-card-desc" style={{ minHeight: 0, marginBottom: 12 }}>
              {it.commands.length} commands · {missions.filter((m) => m.integration === it.slug).length} active missions
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--color-fg-3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                paddingTop: 12,
                borderTop: "1px solid var(--color-border)",
              }}
            >
              Open dashboard {I.arrow}
            </div>
          </a>
        ))}
        <a
          className="int-card"
          href="#/integrations"
          onClick={(e) => {
            e.preventDefault();
            navigate("integrations");
          }}
          style={{ gridColumn: "span 4", textAlign: "center", padding: 18 }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-fg-3)", letterSpacing: "0.06em" }}>
            View all integrations {I.arrow}
          </span>
        </a>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   MARQUEE + FOOTER
   ════════════════════════════════════════════════════════════════ */
function Marquee({ events }: { events: MarqueeEvent[] }) {
  const items = [...events, ...events];
  return (
    <div className="marquee">
      <div className="marquee-track">
        {items.map((ev, i) => (
          <span key={i} className="marquee-item">
            <span className="star">{I.star}</span>
            <span className="ts">{ev.ts}</span>
            <span className={`tag ${ev.tagCls}`}>{ev.tag}</span>
            <span>
              <span className="id">{ev.id}</span> · {ev.body}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Footer({ clock }: { clock: string }) {
  return (
    <>
      <footer>
        <div className="foot-brand">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mark size={28} />
            <span className="wm">
              Agent<i>OS</i>
            </span>
          </div>
          <p>A local-first AI agent command center. Built quietly under the flous.dev studio.</p>
          <div className="badge-row">
            <span className="live">
              <span className="d" />
              v0.1.7 runtime ready
            </span>
            <span style={{ marginLeft: 8 }}>· {clock}</span>
          </div>
        </div>
        <div className="foot-col">
          <h4>Surfaces</h4>
          {FORGE_NAV_PRIMARY.map((item) => (
            <Link key={item.id} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="foot-col">
          <h4>Platform</h4>
          {FORGE_NAV_MORE.map((item) => (
            <Link key={item.id} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="foot-col">
          <h4>Studio</h4>
          <a href="https://github.com/GageDush/AgentOS" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://flous.dev">flous.dev</a>
        </div>
      </footer>
      <div className="foot-bot">
        <span className="copy">© 2026 flous studio · Built locally · Shipped quietly</span>
        <span>⌘K to jump · Esc to dismiss</span>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   HOME (composed)
   ════════════════════════════════════════════════════════════════ */
export default function ForgeHome() {
  const navigate = useNavigate();
  const home = useForgeHomeData();
  const [selected, setSelected] = useState<string | null>(null);
  const [clock, setClock] = useState("--:--");

  useAmbient();
  useReveal([home.missions.length, home.live]);

  // Clock (display only)
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleRun = useCallback(
    (payload: { title: string; agent: string; model: string; sandbox: string }) => {
      void home.runMission(payload);
    },
    [home]
  );

  const handleApprove = useCallback(
    (id: string, mode: string) => {
      void home.approve(id, mode === "mission" ? "mission" : "once");
    },
    [home]
  );

  const handleDeny = useCallback(
    (id: string) => {
      void home.deny(id);
    },
    [home]
  );

  const counts = home.counts;
  const missions = home.missions;
  const marquee = home.marquee;
  const queue = home.counts.queued;
  const awaiting = home.gateItems;
  const homeMissions = missions.slice(0, 6);

  return (
    <div className="forge-home-scope">
      <div className="backdrop">
        <div className="bg-glow" />
        <div className="bg-grid" />
        <div className="bg-noise" />
      </div>

      <ForgeNav
        variant="pill"
        missionCount={home.loading ? 0 : counts.active}
        gateCount={home.loading ? 0 : counts.awaiting}
        onOpenCommandPalette={() => navigate("settings")}
        user="Gage"
      />

      {home.loading ? (
        <div className="home-runtime-loading container" role="status" aria-live="polite">
          <span className="home-runtime-loading-bar" />
          <span className="home-runtime-loading-copy">Connecting to runtime…</span>
        </div>
      ) : null}

      {home.error && (
        <div
          className="container"
          style={{
            marginTop: 96,
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--status-warn)",
            background: "var(--status-warn-bg)",
            border: "1px solid var(--status-warn-border)",
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          {home.error}
        </div>
      )}

      <main className={home.loading ? "home-main-loading" : undefined}>
        <Hero counts={counts} clock={clock} loading={home.loading} />
        <Compose onRun={handleRun} />

        <section className="s container" id="missions-home">
          <SectionHead
            num="002"
            label="Missions"
            right={`${missions.filter((m) => m.status !== "completed").length} active · queue ${queue}`}
            title="Missions, <em>in motion.</em>"
            sub={
              <>
                Live runs across all agents. Open the
                <a
                  href="#/missions"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("missions");
                  }}
                  style={{ color: "var(--accent)", borderBottom: "1px dashed currentColor", margin: "0 4px" }}
                >
                  full Missions inspector
                </a>
                for plans + live log.
              </>
            }
          />
          <div className="miss-grid stagger">
            {home.loading ? (
              <p className="home-section-loading">Loading missions from runtime…</p>
            ) : (
              homeMissions.map((m) => (
                <MissionCard
                  key={m.id}
                  m={m}
                  selected={selected === m.id}
                  onClick={() => {
                    setSelected(m.id);
                    navigate("missions");
                  }}
                />
              ))
            )}
          </div>
        </section>

        <section className="s container" id="gate-home">
          <SectionHead
            num="003"
            label="Control gate"
            right={
              awaiting.length > 0 ? (
                <a
                  href="#/gate"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("gate");
                  }}
                  style={{ color: "var(--accent)" }}
                >
                  {awaiting.length} awaiting · open Gate →
                </a>
              ) : (
                "caught up"
              )
            }
            title="Approve <em>once.</em><br/>Decide with context."
            sub="Any write, push, shell, refund, or send stops here. Approve for this call, for the mission, or deny — without losing the run's context."
          />
          {awaiting.length === 0 ? (
            <div className="gate-empty reveal">
              <div className="ic">{I.check}</div>
              <div className="h">No approvals awaiting.</div>
              <div className="p">You&apos;re caught up. New gates will surface here in real time.</div>
            </div>
          ) : (
            <div className="gate-list">
              {awaiting.slice(0, 2).map((m) => (
                <HomeGateItem key={m.id} m={m} onApprove={handleApprove} onDeny={handleDeny} />
              ))}
            </div>
          )}
        </section>

        <Analytics missions={missions} />
        <ProvidersOverview navigate={navigate} />
        <IntegrationsPreview navigate={navigate} missions={missions} />
      </main>

      <Marquee events={marquee} />
      <Footer clock={clock} />
    </div>
  );
}
