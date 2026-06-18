# AgentOS — Architecture Map

**Repository root:** `C:\Users\gaged\Documents\AgenOS`
**Audit type:** Review-only forensic (no source changes)
**Date:** 2026-06-16

---

## 0. One-line answer

> **AgentOS is a real, structurally-complete control-plane skeleton with a genuine execution backbone (Fastify API + SQLite + worker/lease queue + allow-listed shell gateway + real Discord/OAuth + real Puppeteer scraper) whose "agent intelligence" is mock/templated by default. It is NOT a UI mockup, and NOT yet an autonomous agent runtime. It is a backend-real, intelligence-mock orchestration shell.**

Maturity level: **advanced prototype / pre-MVP control plane** (≈ 60–70% of an MVP's plumbing exists; the missing 30–40% is real model-driven execution wired through the front door).

---

## 1. Current Architecture (text diagram — what actually exists)

```
                         ┌──────────────────────────────────────────┐
                         │  Operator (browser / Discord / mobile-web) │
                         └───────────────┬───────────────┬───────────┘
                                         │               │
                       HTTPS (Cloudflare │ Tunnel)       │ Discord Gateway WS + OAuth
                       flous.dev / api.*  │               │  (real bot, real OAuth)
                                         ▼               ▼
   ┌───────────────────────────┐   ┌───────────────────────────────────────────┐
   │ apps/command-center        │   │ apps/api  (Fastify :8787)                  │
   │ Next.js :3000              │──▶│  • REST: missions/runs/approvals/chat/...  │
   │  • /agentos-api proxy      │   │  • /events WebSocket (2.5s snapshots)      │
   │  • WS-first + poll fallback│◀──│  • Discord bot+OAuth, /discord/interactions│
   │  • seed-data fallback      │   │  • providers.ts (mock | ollama)            │
   └───────────────────────────┘   │  • scraper/* (Puppeteer, headless Chrome)  │
                                    └───┬──────────────┬────────────────┬────────┘
                                        │              │                │
                          repository    │   enqueue/   │   exec request │
                          calls (SQL)    │   poll       │   (HTTP)       │
                                        ▼              ▼                ▼
                     ┌───────────────────────┐  ┌──────────────┐  ┌───────────────────────┐
                     │ packages/persistence   │  │ apps/worker  │  │ apps/gateway :8790    │
                     │ better-sqlite3 + Drizzle│ │ 4s poll loop │  │ spawn(shell:false)    │
                     │ .agentos/state/*.db (WAL)│◀┤ claim lease  │  │ ALLOW-LIST ONLY:      │
                     │ 21 tables, payload_json │  │ processRun   │─▶│ git status/diff,      │
                     └───────────────────────┘  └──────┬───────┘  │ pnpm test/typecheck,  │
                                                        │          │ semgrep (~11 aliases) │
                          ┌─────────────────────────────┘          └───────────────────────┘
                          ▼
          ┌────────────────────────────────────────────────────────────┐
          │ packages/runtime  (the "spine")                             │
          │  determineMissionRoute → orchestrator                       │
          │  IF isMockAgentExecutionEnabled(route):  ◀── default path    │
          │      executeAgentPipelineStep (21 agents, TEMPLATED output)  │
          │  approval gate (human-required, no self-approve)            │
          │  executeGatewayCommand(cmd)  ◀── the one real action        │
          └───────┬───────────────────────────┬───────────────┬─────────┘
                  │                           │               │
                  ▼                           ▼               ▼
   ┌──────────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐
   │ packages/agents          │  │ packages/orchestr. │  │ packages/sandbox       │
   │  llm.ts callAgentLlm:     │  │ deterministic route│  │ assessCommandPolicy    │
   │   Ollama IF flags on,     │  │ + intent parsing   │  │ (allow/deny/approval)  │
   │   else PROMPT-ECHO mock   │  └────────────────────┘  └────────────────────────┘
   │  patch-apply.ts (REAL     │
   │   unified-diff file write)│   ┌────────────────────┐  ┌────────────────────────┐
   └──────────────────────────┘   │ packages/llm-router │  │ packages/token-manager │
                                   │ Ollama + LiteLLM    │  │ quota steward + budgets│
   ┌──────────────────────────┐   │ (cloud) — DEAD CODE: │  │ (real gates, fed 0s)   │
   │ apps/scheduler           │   │ NOT wired to callers │  └────────────────────────┘
   │ 60s setInterval → POST    │   └────────────────────┘
   │ /routines/:id/run         │
   └──────────────────────────┘   External: Ollama :11434 (opt) · LiteLLM :4000 (opt,off) ·
                                   gh CLI · GitHub · Cursor SDK · IcePanel · cloudflared
```

---

## 2. Intended Architecture (inferred from plans, README, CLAUDE.md, .env)

The same five-service topology, but with the dashed/mock boxes made real:

- **Replace the prompt-echo `callAgentLlm`** with `routeLlmCall` (the already-built but unwired router in `packages/llm-router`) so agents call **Ollama locally** and **OpenAI/Anthropic via LiteLLM** under quota/budget gates.
- **Flip the feature flags on** for genuine execution: `FEATURE_AGENT_LLM`, `FEATURE_TOOL_EXECUTION`, `FEATURE_LLM_TOOL_LOOP`, `AGENTOS_IMPLEMENTER_MODE=gateway`.
- **Postgres adapter** (`packages/persistence/src/adapters/postgres.ts`, currently a throwing scaffold) becomes the hosted multi-machine store; SQLite stays local-first.
- **Redis/BullMQ** replaces the in-process queue + DB poll loop (`packages/queue` is a stub that mirrors to a local array).
- **Discord becomes a first-class control surface** (rich agent cards + emoji quick-actions) — the data model and card renderers already exist.
- Public hosting via Cloudflare Tunnel to `flous.dev` / `api.flous.dev` (infra + scripts already present).

So the **target is an agent control plane** (local-first, host-ready). The repo is built *toward* that; it is not there yet because the intelligence layer is gated off and the cloud router is unwired.

---

## 3. Actual Data Flow (a mission run, default config)

1. **Create:** `POST /missions` (`apps/api/src/index.ts:353`) → `createMission` persists a mission row (real SQL transaction).
2. **Enqueue:** `POST /missions/:id/run` (`:531`) creates a queued `mission_run`.
3. **Claim:** `apps/worker` polls every 4s → `processPendingMissionRuns` → `claimNextQueuedRun` (lease-based, `packages/persistence/src/index.ts:2116`).
4. **Route:** `determineMissionRoute` (orchestrator) picks primary/supporting agents + a `providerLane`.
5. **"Execute" (mock):** because `providerLane==="mock_local"` by default, `isMockAgentExecutionEnabled` is true (`packages/runtime/src/index.ts:70-79`), so `executeAgentPipelineStep` runs and produces **templated** reviewer/security/specialist summaries (`packages/agents/src/executor.ts`, `synthesizer.ts`). Any LLM rewrite returns a **prompt-echo** unless `FEATURE_OLLAMA`+`FEATURE_AGENT_LLM` are on.
6. **Approve:** if the command policy / risk requires it, an `approval_request` is created and the run waits (`AGENTOS_REQUIRE_HUMAN_APPROVAL=true`, implementer cannot self-approve).
7. **Real action:** `executeGatewayCommand(mission.command)` → gateway `POST /execute` → `spawn(file,args,{shell:false})` of one **allow-listed** command (git/pnpm/semgrep). This is the single genuinely-executed step.
8. **Persist + report:** logs appended, audit events written, run completed with a templated `Executed "<cmd>" in <ms>ms, exit <n>` summary and **hardcoded-zero** token/cost usage.
9. **Surface:** UI polls `/runs/:id/logs` (1.2s) + `/runs/:id/gates`; `/events` WS broadcasts snapshots.

---

## 4. Actual Agent / Task Lifecycle

```
queued ──claim(lease)──▶ planning ──▶ running ──┬──▶ awaiting_approval ──approve──▶ running
   ▲                                            │                       └──deny──▶ denied
   │ retry (attemptCount<maxAttempts)           ├──▶ paused ──resume──▶ running
   └────────────────────────────────────────────┤
                                                 ├──▶ completed
                                                 └──▶ failed (lease expiry → reclaim)
```

Real and enforced: lease claiming with expiry/reclaim, attempt counting/retries, pause/resume, AbortSignal timeouts, approval gates with no self-approval, audit events tagged `mock: true/false`. Evidence: `packages/runtime/src/index.ts:1059-1068, 1277, 1508-1586, 1853-1867`; `packages/persistence/src/index.ts:796-826, 2116-2218`.

---

## 5. UI → Backend Wiring Map

| UI surface (route) | Backend endpoint(s) | Real data? |
|--------------------|---------------------|-----------|
| Home `/` (missions/gate/marquee) | `/dashboard` (poll 8s) | **Real** |
| Home `/` Analytics/Providers/Integrations widgets | none | **MOCK** (Math.random/Math.sin + static constants), mislabeled "LIVE" |
| `/missions` | `/missions`, `/missions/:id/run`, questionnaire/generated-app | Real |
| `/operators` | `/dashboard` (agents, sessions) | Real (confidences synthetic) |
| `/control-gate` | `/approvals/*`, `/control-gate` | Real |
| `/blackbox` | `/runs/:id/logs` (1.2s), `/runs/:id/gates`, `/audit` | Real |
| `/wiki` | `/memory/wiki/*` | Real |
| `/settings` | `/system`, `/usage`, `/llm/routes`, `/providers/status` | Real (policy list hardcoded) |
| chat dock | `/chat/threads/:id/messages`, `/rich-actions/execute` | Real |
| `/scraper` | `/scraper/*` (Puppeteer) | Real |
| realtime | `/events` WS → poll `/dashboard` fallback | Real |
| Discord auth card | `/auth/discord`, `/auth/me`, `/auth/logout` | Real OAuth |
| `/preview/forge`, `/docs/*` | none | **Static** |

Client: `apps/command-center/src/lib/agentos-api.ts` over Next proxy `/agentos-api/*` (`next.config.mjs:91-104`).

---

## 6. Mock-Data Map (where "fake" lives)

| Mock surface | Location | Nature |
|--------------|----------|--------|
| LLM output (default) | `packages/agents/src/llm.ts:78-97` | `prompt.slice(0,600)` echo tagged `provider:"mock"` |
| API "AI" provider (default) | `apps/api/src/providers.ts:16-30` | `Mock AgentOS response for: <prompt>` |
| Agent step summaries | `packages/agents/src/executor.ts`, `synthesizer.ts` | Templated strings concatenated |
| Mission result summary | `packages/runtime/src/index.ts:~1737` | `Executed "<cmd>" in <ms>ms` template |
| Token/cost usage | `packages/runtime` complete/fail bundles | Hardcoded `0` |
| Implementer dispatch (default) | `packages/agents/src/implementer-dispatch.ts:289-303` | "Mock implementer prepared plan…" |
| `task.spawn` tool | `apps/gateway/src/tools.ts:165-187` | "Spawn queued to worker lane (mock acknowledgement)" |
| Redis queue | `packages/queue/src/index.ts:18-23` | Stub mirrors to local array |
| Home analytics/providers/integrations | `apps/command-center/.../ForgeHome.tsx:706-829`, `forge-home-data.tsx:450-452` | Synthetic / static constants |
| `worker:"online"`, `gateway:"online"` | `apps/api/src/index.ts:213-219, 1230-1234` | Hardcoded, not health-checked |
| Seed DB (agents/missions/routines) | `packages/shared/src/index.ts`, `agent-roster.ts` | Default mock-first records |
| Postgres adapter | `packages/persistence/src/adapters/postgres.ts` | Throws `*NotImplemented` |
| LiteLLM cloud router | `packages/llm-router/src/index.ts` | Real code, **disabled + unwired** |

---

## 7. Missing Runtime Components (for a real agent control plane)

1. **Wire the real LLM router into the agent path** — replace prompt-echo `callAgentLlm` with `routeLlmCall`. (Today the good router is dead code by its own header comment, `packages/llm-router/src/index.ts:11-13`.)
2. **Real model-driven implementer** — generate actual unified diffs (the file-writer is real but starved of real diffs by default).
3. **Real tool/shell breadth** — the gateway only runs ~11 hardcoded aliases; an agent that edits arbitrary repos needs a broader, still-sandboxed execution surface.
4. **Streaming** — no token/log streaming anywhere (`stream:false` everywhere); UI uses polling.
5. **Distributed queue** — replace in-process array + DB poll with Redis/BullMQ for multi-worker.
6. **Migrations + FKs + indexes** — no migration framework, FKs disabled, zero indexes (see §8).
7. **Semantic memory** — wiki is substring search; no embeddings/vector store; `memory.search` tool unimplemented in gateway.
8. **AuthZ on the operational API** — only 2 routes check the session; the rest (incl. `/worker/process`, `/scraper/*`, `/discord/bootstrap`) are open.
9. **Real cost/token accounting** in the live path (currently zeros).

---

## 8. Biggest Coupling / Structural Problems

1. **Schema defined twice, by hand** — Drizzle table objects (`packages/persistence/src/index.ts:120-412`) **and** raw `CREATE TABLE` DDL (`:3819-3843`). Drift risk; nothing enforces parity.
2. **"JSON blob in SQLite" write pattern** — many writes (`mutate()` + every `*Bundle`) do load-entire-DB → mutate JS object → **delete+reinsert all 21 tables** (`saveDatabase` `:3894-3961`). Write amplification + last-writer-wins clobbering across the 3 processes (API/worker/scheduler) sharing one DB.
3. **FKs OFF + zero indexes** — `pragma("foreign_keys = OFF")` (`:1884`), no `CREATE INDEX` anywhere. Every lookup is a full scan + `JSON.parse` of `payload_json`. O(n) and degrading as `audit_events`/`mission_logs`/`chat_messages` grow unboundedly (no pruning).
4. **Two UI vocabularies** — the marketing home reimplements its own Button/Badge inline instead of using `packages/ui`; operational shell and home don't share components.
5. **Feature-flag maze** — genuine execution requires ~6 flags flipped across 3 layers + external Ollama/LiteLLM; easy to misconfigure, hard to reason about "is it real right now?".
6. **Mock-mode is load-bearing** — the entire 21-agent pipeline only runs *inside the mock branch* (`isMockAgentExecutionEnabled`). The non-mock path skips the agents and just shells one command. So "turning off mock" today *reduces* visible agent behavior rather than upgrading it — a real wiring gap.

---

## 9. Biggest Architecture Risks

(See `AGENTOS_RISK_REGISTER.md` for the full register.) Top architectural risks: persistence concurrency/full-rewrite hazard under the 3-process stack; no authZ on operational + scraper endpoints (SSRF-capable Puppeteer); the unwired cloud router meaning "make it real" is a non-trivial refactor, not a flag flip; unbounded append-only tables; secrets at rest in `.env`.

---

## 10. Recommended Architecture Direction

1. **Make the spine honest first (no new features):** wire `routeLlmCall` into `callAgentLlm`; make the agent pipeline run in the *real* path (not only mock); feed real token/cost numbers. This converts "intelligence-mock" → "intelligence-real" with the infra already built.
2. **Harden persistence before hosting:** add a migration tool (Drizzle Kit), turn FKs on, add indexes on hot columns, port `*Bundle` writes off the full-DB-rewrite path to per-row SQL, add retention/pruning. Single source of schema truth.
3. **Add an auth gate** (one Fastify `preHandler`) over all mutating + scraper routes, reusing the existing Discord session; add an SSRF allow-list to the scraper.
4. **Then scale out:** Redis/BullMQ queue, Postgres adapter, multi-worker — the interfaces already exist.
5. **Defer** Discord/mobile feature-creep and the cloud-provider lanes until the local real path is proven and benchmarked.

---

## 11. Benchmark Status (Phase 5)

The repo already ships a **profile/pipeline benchmark harness** (not app-performance benchmarks): `pnpm agentos:bench-profiles`, `agentos:bench-pipeline`, `agentos:bench-report` (writes `.agentos/state/bench-report.json`), `agentos:bench-baseline` (regression vs `.agentos/benchmarks/baseline-snapshot.json`), and `wiki:benchmark`. These measure routing/gate/profile behavior, **not** latency/throughput/resource usage. No app-runtime performance benchmark exists. **Do not fabricate numbers** — the table below is a plan.

| Metric | Status | How to measure (proposed) |
|--------|--------|---------------------------|
| Install time (`pnpm install`) | measurable, not implemented | time a cold install in CI |
| App startup time (5 services) | measurable, not implemented | timestamp from `stack:background` to all `/health` 200 |
| Build time | **measured** (this audit: Next ✓ in 5.0s; full `pnpm build` exit 0) | `pnpm build` wall-clock |
| Page load time | measurable, not implemented | Playwright/Lighthouse on `/`, `/missions` |
| API latency | measurable, not implemented | k6/autocannon against `/dashboard`, `/missions` |
| Task creation latency | measurable, not implemented | time `POST /missions` round-trip |
| Queue processing latency | measurable, not implemented | enqueue→claim delta (≤4s poll bound today) |
| Agent execution latency | measurable (mock fast; real = Ollama-bound) | time `processRun` per lane |
| Shell command latency | measurable, not implemented | gateway `/execute` timing |
| LLM call latency | **blocked** (needs Ollama/LiteLLM running) | `pnpm llm:smoke` timing |
| Streaming/log latency | not applicable yet | no streaming implemented |
| Memory/CPU usage | measurable, not implemented | OS counters per service |
| Concurrent agent runs | measurable but **risky** | parallel runs stress the full-DB-rewrite path — measure before relying on it |
| Failure/retry rate | measurable | already tracked via `attemptCount`/audit |
| Token/cost tracking | **blocked / fed zeros** | real numbers only via `routeLlmCall` once wired |
| UI responsiveness | measurable, not implemented | Lighthouse / React profiler |

**Classification summary:** 1 measured (build), ~10 measurable-but-not-implemented, 2 blocked (LLM latency, real token cost), 1 not-applicable (streaming). Recommended first benchmarks: build time, stack startup, API/`/dashboard` latency, enqueue→claim latency.

---

## 12. Direct Answers

- **Is AgentOS a UI prototype, backend prototype, agent runtime, or complete system?** A **backend prototype with a partially-real, partially-mock front end** — specifically an *orchestration control-plane skeleton*. The backend (API, persistence, queue, gateway, Discord, scraper) is real; the agent-intelligence runtime is mock-by-default.
- **Real maturity level?** Advanced prototype / pre-MVP. Green on typecheck/test/build, but the headline capability (agents doing real work) is gated off and not wired to the cloud router.
- **Minimum working product hiding inside the repo?** A **local-first, human-approved command runner with a polished operator dashboard and Discord control**: create mission → route → approve → run an allow-listed git/pnpm/semgrep command → see logs/audit/gates. That works today end-to-end.
- **What must exist before it's an agent control plane?** Real LLM wiring through the front door, model-driven file edits, broader sandboxed tool execution, persistence hardening (migrations/FKs/indexes/no full-rewrite), and authZ on the API.
- **What to cut or delay?** Cloud provider lanes, Discord/mobile feature expansion, Postgres/Redis scale-out, and the static "analytics" theater on the home — until the local real path is proven.
- **What to build next?** Wire `routeLlmCall` into `callAgentLlm` and make the agent pipeline run in the non-mock path. That single change flips the product from "mock" to "real" using infrastructure that already exists.
