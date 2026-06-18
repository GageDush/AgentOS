# AgentOS — Comprehensive Technical Review

**Consolidated from:** `AGENTOS_FULL_REVIEW.md` · `AGENTOS_SMOKE_TEST_REPORT.md` · `AGENTOS_FEATURE_MATRIX.md` · `AGENTOS_ARCHITECTURE_MAP.md` · `AGENTOS_RISK_REGISTER.md` · `AGENTOS_ROADMAP.md`

**Repository root (isolated & confirmed):** `C:\Users\gaged\Documents\AgenOS`  
(folder spelled **AgenOS**; project identifies internally as **AgentOS**)

**Audit type:** Review-only forensic audit. No source code modified.  
**Date:** 2026-06-16  
**Git:** branch `main`, HEAD `9bbbb0f6`  
**Runtime:** Windows 11 Pro · Node `v24.16.0` · pnpm `9.15.4`  
**Declared engines:** Node 22+ (`README`/`CLAUDE.md`); `packageManager: pnpm@9.15.4`

---

## Table of Contents

1. [Audit Methodology & Scope](#1-audit-methodology--scope)
2. [Repository Root Isolation](#2-repository-root-isolation)
3. [Executive Summary](#3-executive-summary)
4. [Grades (A–F)](#4-grades-af)
5. [Repository Inventory](#5-repository-inventory)
6. [Configuration Layer](#6-configuration-layer)
7. [Data & Persistence Layer](#7-data--persistence-layer)
8. [Backend & API Layer](#8-backend--api-layer)
9. [Agent Runtime Layer](#9-agent-runtime-layer)
10. [UI & UX Layer](#10-ui--ux-layer)
11. [Integration Layer](#11-integration-layer)
12. [Testing Layer](#12-testing-layer)
13. [Smoke Test Results](#13-smoke-test-results)
14. [Feature Matrix (30 Features)](#14-feature-matrix-30-features)
15. [Architecture Map](#15-architecture-map)
16. [Mock-Data Map](#16-mock-data-map)
17. [Structural Coupling & Missing Components](#17-structural-coupling--missing-components)
18. [Risk Register (20 Risks)](#18-risk-register-20-risks)
19. [Implementation Roadmap (Phases 0–7)](#19-implementation-roadmap-phases-07)
20. [Product Classification](#20-product-classification)
21. [Benchmark Status](#21-benchmark-status)
22. [Consolidated Recommendations](#22-consolidated-recommendations)
23. [Final Verdicts](#23-final-verdicts)

---

## 1. Audit Methodology & Scope

### 1.1 Approach

- **Isolated** a single live AgentOS repository root under `C:\Users\gaged`.
- **Read-only** forensic review: static analysis, configuration inspection, dependency/build/test gates.
- **No source modifications** outside the original six `docs/AGENTOS_*.md` audit deliverables (this document is a seventh consolidation).
- **Safe/local commands only** — no credentialed live smokes (Discord, LLM, tunnel, `tool:smoke:live`).
- **Live dev stack not started** for UI click-through; UI wiring established via static analysis + clean production build.
- **Background AgentOS stack** was observed running on the audit machine (PIDs mutating `.agentos/state/*` and wiki files); audit did not cause source-file modifications (verified by mtime: latest source change before session start ~01:50; session ~08:31).

### 1.2 Commands Executed

| # | Command | Result | Exit |
|---|---------|--------|------|
| 1 | `pnpm typecheck` | **PASS** — all 14 workspaces `tsc --noEmit` clean | 0 |
| 2 | `pnpm test` | **PASS** — 89 test files, 278 tests, 0 failures | 0 |
| 3 | `pnpm env:check` | **PASS** — "AgentOS env check passed using .env." | 0 |
| 4 | `pnpm sanitize:check` | **PASS** — 858 product-facing files | 0 |
| 5 | `pnpm build` | **PASS** — Next.js compiled in 5.0s; all workspaces build | 0 |

### 1.3 Commands Deliberately NOT Run

- `pnpm dev` / `pnpm stack:background` (long-running; not required for build/test verdict)
- `discord:live-smoke`, `llm:smoke`, `tunnel:repair`, `tool:smoke:live` (require live credentials / external services)
- `pnpm install` ( `node_modules` already present)

### 1.4 Working Tree Integrity

- Working tree was **days-dirty** before audit (uncommitted feature work through ~01:50 on 2026-06-16).
- **No non-doc, non-state source files** modified at/after audit session start.
- Wiki/state mutations attributed to **running AgentOS background stack** (documented memory-wiki auto-sync), not audit activity.

---

## 2. Repository Root Isolation

### 2.1 Search Scope

Searched all of `C:\Users\gaged` for AgentOS-identifying markers.

### 2.2 Candidates

| Path | Classification | Evidence |
|------|----------------|----------|
| **`C:\Users\gaged\Documents\AgenOS\`** | **LIVE REPO (CHOSEN)** | `package.json` (`name: agentos`), `pnpm-workspace.yaml`, `.git`, `node_modules`, `apps/`, `packages/`, `docs/`, `docker-compose.yml` |
| `Documents\AgenOS_WORKING_MVP_CHECKPOINT.zip` | Archive/backup | Not a live root |
| `Downloads\AgentOS_Project_Bundle.zip` | Archive/backup | Not a live root |
| `Documents\AgentOS-Backups\*.zip` | Archive/backup | Not a live root |
| `AppData\Local\Temp\agentos-*` | Runtime temp state | SQLite/JSON runtime artifacts, not source |
| `Desktop\Pokemon_ER_Companion_Codex_Handoff\package.json` | Unrelated project | — |

**Conclusion:** Exactly **one** live AgentOS root exists. Audit fully isolated to `C:\Users\gaged\Documents\AgenOS\`.

---

## 3. Executive Summary

### 3.1 What AgentOS Is Right Now

A **local-first AI dev-operations control plane that is real on the outside and mock on the inside.**

**Real (genuine implementation):**
- Fastify API (~90+ endpoints)
- SQLite persistence (21 tables, repository layer)
- Lease-based worker/queue
- Allow-listed shell-execution gateway
- Real Discord bot + Ed25519-verified OAuth
- Real Puppeteer scraper
- Polished animated Next.js operator dashboard (Forge)
- Real LLM router package (`packages/llm-router`) — **code exists but unwired**

**Mock / simulated (default path):**
- Agent reasoning returns **truncated prompt echo**
- Agent step reports are **templated strings**
- Mission results are `Executed "<cmd>" in <ms>ms` templates
- Token/cost **hardcoded to zero**
- 21 "agents" are **markdown profiles + routing metadata + hardcoded `profileId` switch**, not executable agents
- Agent pipeline runs **only inside mock branch**
- OpenAI/Anthropic **called by no code** (only via disabled LiteLLM path; router unwired)
- Home dashboard analytics/providers/integrations are **`Math.random`/static mislabeled "LIVE"**

**Classification:** NOT a UI mockup. NOT yet an autonomous agent runtime.

### 3.2 What Works Today (Default Checkout)

- Clean `typecheck`, **278 passing tests / 89 files**, clean `env:check`/`sanitize`, clean production `build`
- End-to-end: create mission → deterministic agent routing → human approval gate (no self-approval) → execute **one allow-listed** git/pnpm/semgrep command via real `spawn` → persisted logs/audit/gates → live dashboard via WebSocket+polling
- Real persistence (survives reload)
- Real Discord OAuth, real scraper, real GitHub `gh` issue/PR, real quota/budget gates (fed zeros)

### 3.3 What Does NOT Work / Is Fake or Planned

- Real agent reasoning is mock unless Ollama running **and** ~6 flags flipped across 3 layers
- Pipeline only runs in **mock branch**; non-mock path **skips agents**, shells one command
- Streaming, distributed queue (Redis stub), semantic memory, Postgres adapter planned/stub
- `worker`/`gateway` health hardcoded `"online"`
- No metrics/tracing; semgrep gate disabled in CI; e2e non-blocking

### 3.4 Biggest Blockers

1. **LLM router unwired** — `packages/llm-router` not connected to `packages/agents/src/llm.ts`; pipeline gated to mock (`packages/runtime/src/index.ts:1277`). "Make it real" = **refactor**, not config flag.
2. **Two P0 security holes** — unauthenticated operational API; SSRF-capable unauthenticated Puppeteer scraper.

### 3.5 Fastest Path to Useful MVP

1. Wire `routeLlmCall` into `callAgentLlm`; run pipeline in **non-mock** path
2. Feed real token/cost into usage events
3. Add one Fastify auth `preHandler` over mutating + `/scraper/*` routes

### 3.6 What to Build Next

Phase 3 (real agent runtime), preceded by Phase 0/2 (lint/parity, persistence hardening).

### 3.7 What to Avoid

- Shipping fake "LIVE" analytics
- Enabling cloud LLM keys before real cost-tracking + budget hard-stops verified
- Broadening shell/tool execution before real sandbox + authZ
- Adding mobile/Discord surface area before core executes real work

### 3.8 One-Sentence Recommendation

Wire the already-built LLM router into the agent path and make the pipeline run in the non-mock branch (with real token/cost) **after** adding API/scraper authZ and persistence hardening — converts AgentOS from convincing mock into real, safe MVP control plane without building from scratch.

---

## 4. Grades (A–F)

| Area | Grade | Justification |
|------|:-----:|---------------|
| **Repo Health** | **A−** | Clean typecheck, 278 tests, clean build/sanitize/env — minor hygiene gaps (no `lint` script, allow-list drift) |
| **Architecture** | **B** | Coherent 5-service control-plane; undercut by FKs-off/no-index/full-DB-rewrite persistence and unwired LLM router |
| **UI/UX** | **B+** | Polished, animated, a11y-aware Forge dashboard wired to real endpoints — minus "LIVE"-labeled synthetic home widgets |
| **Backend** | **B** | Large real Fastify/SQLite/gateway/Discord/scraper surface — near-total lack of authZ, ad-hoc validation |
| **Agent Runtime** | **D+** | Real lifecycle/queue/approval/file-writer machinery — intelligence is prompt-echo mock; pipeline mock-only |
| **Testing** | **B** | 278 fast unit/integration tests + CI — heavy mocking, untested scraper, non-blocking e2e, disabled semgrep |
| **Product Clarity** | **C+** | Strong vision/docs — mock-by-default + "LIVE" theater overstates capability |
| **Local Deployment Readiness** | **A−** | `pnpm install → db:migrate → db:seed → dev` works; builds/runs locally in mock mode without credentials |
| **Production Readiness** | **D** | No authZ/rate-limit, secrets at rest, no migrations, host-bound tunnel, unimplemented Postgres, zero cost on live path |

---

## 5. Repository Inventory

### 5.1 Identity

| Field | Value |
|-------|-------|
| Package name | `agentos@0.1.0` (private) |
| Package manager | pnpm 9.15.4 (workspace) |
| Language | TypeScript 5.7 on Node 22+ (audit: Node 24.16.0) |
| Scripts runtime | `tsx`, `vitest` |

### 5.2 Technology Stack

| Concern | Choice |
|---------|--------|
| Frontend | Next.js app-router — `apps/command-center`, port 3000 |
| Backend | Fastify — `apps/api` (8787), `apps/gateway` (8790); `apps/worker`, `apps/scheduler` |
| Persistence | SQLite via `better-sqlite3` + Drizzle ORM, WAL, `.agentos/state/agentos-local.db`; JSON store deprecated; Postgres adapter = throwing scaffold |
| Agent framework | In-house: `orchestrator`, `runtime`, `agents`, `sandbox`, `queue`, `token-manager` + `.agentos/` profiles |
| Task queue | In-process array + DB poll loop; Redis in `packages/queue` = stub |
| Scheduler | `apps/scheduler` — 60s `setInterval` |
| LLM | Ollama (real, local); LiteLLM → OpenAI/Anthropic (real code, **disabled + unwired**); default provider = `mock` |
| Discord | Real bot (hand-rolled Gateway v10 WS) + OAuth; no dedicated mobile UI |
| Auth | Discord OAuth2 + HMAC session cookie — enforced on **2 routes only** |
| Sandbox | Gateway `spawn(shell:false)` + ~11-alias allow-list + `packages/sandbox` policy |
| Observability | Persisted audit + mission logs + Fastify structured logs; no metrics/tracing |
| Tests | Vitest 89 files / 278 tests; Playwright e2e (2 specs, non-blocking CI); many smoke scripts |
| Build/deploy | `pnpm -r build` passes; Docker + `docker-compose.yml`; Cloudflare tunnel → `flous.dev` |
| Env | `.env.example` 146 lines; many `FEATURE_*` flags; **mock/local default, cloud disabled** |
| Local dev | `pnpm install` · `pnpm db:migrate` · `pnpm db:seed` · `pnpm dev` / `stack:background` |
| Prod | Cloudflare tunnel + Windows autostart scripts; **no CI deploy step** |

### 5.3 Major Folder Tree & Classification

```
AgenOS/
├─ apps/
│  ├─ api/             Fastify API + Discord + scraper ............ ACTIVE IMPLEMENTATION
│  ├─ command-center/  Next.js operator dashboard ................. ACTIVE IMPLEMENTATION
│  ├─ gateway/         Allow-listed command exec .................. ACTIVE IMPLEMENTATION
│  ├─ worker/          Run-claim poll loop ........................ ACTIVE IMPLEMENTATION
│  └─ scheduler/       Routine poll loop .......................... ACTIVE (minimal)
├─ packages/
│  ├─ shared/          Domain types + seed data ................... ACTIVE IMPLEMENTATION
│  ├─ persistence/     SQLite/JSON/Postgres adapters ............... ACTIVE (sqlite/json); postgres = SCAFFOLD
│  ├─ runtime/         Mission "spine" ............................ ACTIVE IMPLEMENTATION
│  ├─ orchestrator/    Routing + intent ........................... ACTIVE IMPLEMENTATION
│  ├─ agents/          Pipeline/executor/llm/patch-apply .......... ACTIVE (intelligence MOCK by default)
│  ├─ sandbox/         Command policy ............................. ACTIVE IMPLEMENTATION
│  ├─ queue/           Queue interface ............................ PARTIAL (Redis = STUB)
│  ├─ token-manager/   Quota/budget gates ......................... ACTIVE (fed zeros)
│  ├─ memory/          Markdown wiki/archive ...................... ACTIVE IMPLEMENTATION
│  ├─ llm-router/      Ollama+LiteLLM router ...................... ACTIVE CODE but DEAD/UNWIRED
│  ├─ ui/              Forge design system + motion ............... ACTIVE IMPLEMENTATION
│  └─ app-generator/   Template scaffolder + UI samples ........... ACTIVE (deterministic)
├─ .agentos/           Profiles, registry, state(db), wiki, bench .. CONFIG-TOOLING + live STATE
├─ configs/            agents/tools/models/quota/permissions ....... CONFIG-TOOLING
├─ scripts/            60+ ops/discord/wiki/tunnel/bench/smoke ...... CONFIG-TOOLING (some host-bound)
├─ docker/, infra/     Dockerfiles, cloudflared ................... CONFIG-TOOLING (compose pg/redis UNUSED)
├─ docs/               Architecture, plans, design, audit ......... ASSET/DESIGN + DOCS
├─ prompts/            9 agent role prompts ....................... ASSET/DESIGN
├─ assets/, asset_prompts/  Generated art + manifests ............. ASSET-DESIGN
├─ e2e/                Playwright specs ........................... TEST
└─ test-results/, .tunnel/, .codex-logs/  Runtime artifacts ....... DEAD/UNUSED (regenerated)
```

### 5.4 Duplicates, Abandoned Code, Placeholders, Drift

| Issue | Detail |
|-------|--------|
| **Duplicate schema** | Drizzle objects vs raw DDL, both hand-maintained in `packages/persistence/src/index.ts` |
| **Deprecated JSON store** | `.agentos/state/agentos-local.json` superseded by `.db`; CLAUDE.md priority #4: delete after SQLite stability confirmed |
| **Dead/unwired code** | `packages/llm-router` — header admits callers "intentionally NOT refactored" |
| **Stubs** | `packages/queue` Redis → local array; `adapters/postgres.ts` throws `*NotImplemented`; gateway `task.spawn` = mock acknowledgement |
| **Unused infra** | `docker-compose.yml` Postgres + Redis; CLAUDE.md: SQLite intentional; not used by live stack |
| **Plans vs implementation drift** | README/CLAUDE describe richer agent system than mock path delivers; home UI labels synthetic data "LIVE" |
| **Retired surface** | Phaser "office" demo, `packages/game-schema` removed; docs mark out-of-scope |
| **Local vs cloud tension** | `.env.example` cloud flags + `flous.dev` hosting vs "local-first SQLite-only" doctrine unresolved |

---

## 6. Configuration Layer

### 6.1 Commands (Verified Passing)

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm dev` / `stack:background` | Dev stack |
| `pnpm -r build` | Production build |
| `pnpm -r test` | Vitest suite |
| `pnpm typecheck` | TypeScript check |
| `pnpm env:check` | Env validation |
| `pnpm sanitize:check` | Secret/sanitization scan |

### 6.2 Broken / Missing

| Issue | Evidence | Fix |
|-------|----------|-----|
| **No root `lint` script** | `package.json` has no `lint`; gateway allow-list references `pnpm lint` | Add ESLint + `lint` script, or remove from allow-list |
| **Gateway alias ⇄ sandbox policy drift** | `apps/gateway/src/index.ts:13-26` vs `packages/sandbox/src/index.ts:24-33` — `git log`/`pnpm build` policy-allowed but no alias; `git diff --stat` aliased but not policy-allowed | Reconcile lists; add parity test |

### 6.3 Dependencies

- Lean root devDeps: `@playwright/test`, `typescript`, `tsx`, `vitest`, `@types/node`
- No dependency conflicts surfaced by install/build
- Runtime deps per-package: `better-sqlite3`, `drizzle-orm`, `fastify`, `next`, `puppeteer`, `@cursor/sdk`, `archiver`

### 6.4 Environment (`.env.example` / live `.env`)

- `.env.example` thorough; `env:check` passes against live `.env`
- **Unsafe defaults:**
  - `AGENTOS_AUTOPILOT_RELEASE=true` + `AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL=false` — autopilot can open real PRs
  - 365-day session cookies
  - Permissive CORS
- Cloud providers correctly default OFF
- **Live secrets at rest** in `.env` (see §11, R3)

### 6.5 CI/CD

| Component | Finding |
|-----------|---------|
| `.github/workflows/ci.yml` | sanitize → validate-profiles → bench → env → typecheck → test → smokes → discord:test |
| e2e | **Non-blocking** (`continue-on-error: true`) |
| semgrep gate | **Disabled in CI** (`AGENTOS_SEMGREP_GATE=false`, tier-2 classifier off) — `.github/workflows/ci.yml:34-41` |
| `.gitlab-ci.yml` | Partial mirror |
| `.semgrep.yml` | Thin: block `.env` commit, warn `eval` |
| `.githooks/pre-commit` | Does **not** run tests — only wiki-meta reset |

---

## 7. Data & Persistence Layer

### 7.1 Engine & Adapters

| Component | Status |
|-----------|--------|
| Engine | `better-sqlite3` + Drizzle, WAL |
| Foreign keys | **OFF** (`pragma("foreign_keys = OFF")` at `packages/persistence/src/index.ts:1884`) |
| SQLite adapter | **Active** — `.agentos/state/agentos-local.db` (~1MB + 5MB WAL, Jun 16) |
| JSON adapter | **Deprecated** import path |
| Postgres adapter | **Throwing scaffold** (`*NotImplemented`) |
| Tables | **21** — each `typed columns + payload_json` blob |
| Schema version | `CURRENT_SCHEMA_VERSION=2` — no ALTER/upgrade path |

### 7.2 Write Model (Critical Finding)

**Split write model:**
1. **Partial real per-row SQL** — mission/run/approval/audit hot path, in transactions
2. **Full-DB rewrite** — `mutate()` and every `*Bundle`: load entire DB → mutate → **delete+reinsert all 21 tables** (`saveDatabase` `:3894-3961`)

Three processes (API, worker, scheduler) share one SQLite file → **last-writer-wins clobbering**, write amplification.

### 7.3 Entities (21 Tables)

`workspaces`, `operators`, `agents`, `tasks`, `memories`, `usage_events`, `budgets`, `approval_requests`, `audit_events`, `demo_mission`, `missions`, `mission_runs`, `mission_logs`, `routines`, `loadout`, `sessions`, `agent_routing_decisions`, `chat_threads`, `chat_messages`, `quick_actions`, `meta`

### 7.4 Migrations

- **None** (no framework)
- `scripts/db-migrate.mjs` = JSON→SQLite **importer** (re-running clobbers live SQLite with stale JSON)
- Schema = `CREATE TABLE IF NOT EXISTS` at startup

### 7.5 Integrity Risks

| Risk | Detail |
|------|--------|
| FKs off | Referential integrity not enforced |
| Zero indexes | Full scan + `JSON.parse` per read on every lookup |
| Full-DB rewrite | Write amplification; cross-process clobbering |
| Unbounded append-only | `audit_events`, `mission_logs`, `chat_messages` — no pruning |
| Dual schema drift | Drizzle `:120-412` vs raw DDL `:3819-3843` |
| Copy-pasted column maps | Maintenance hazard |

### 7.6 MVP Gaps

- Real migrations (Drizzle Kit)
- FKs + indexes on hot columns
- Per-row hot writes (kill full-DB rewrite)
- Multi-process claim safety (`busy_timeout` / `BEGIN IMMEDIATE`)
- Retention/pruning
- Real users/credentials model (today: single hardcoded `operator-local`)
- Memory↔DB linkage with real search (currently substring only)

---

## 8. Backend & API Layer

### 8.1 Scale

- **~90+ endpoints** on Fastify
- Mostly real plumbing over SQLite
- "AI" paths default to **mock** provider (`apps/api/src/providers.ts:30`)

### 8.2 Authentication & Authorization (P0 Gap)

**Only 2 routes enforce session:** `/auth/me`, `/auth/success`

**Unauthenticated (reachable without session):**
- `/missions`, `/runs/*`
- `/worker/process`
- `/approvals/*`
- `/scraper/*`
- `/discord/bootstrap|restructure|sync-*`
- `/events` WebSocket

`actingOperatorId` silently defaults to local operator (`apps/api/src/index.ts:155-157`).

### 8.3 Validation & Rate Limiting

- Ad-hoc `if (!x) 400`; no JSON-schema/Zod
- Bodies cast with `as`
- **No rate limiting** anywhere
- **CORS:** `origin:true, credentials:true`

### 8.4 Gateway (`apps/gateway` :8790)

- Real shell exec via `spawn(shell:false)`
- ~11 hardcoded aliases + policy gate
- No container/jail
- **Full `process.env` passed to children** (`apps/gateway/src/index.ts:42`)
- Solid against injection; weak as sandbox
- `FEATURE_TOOL_EXECUTION=false` by default

### 8.5 Scheduler (`apps/scheduler`)

- Real 60s poll loop
- No auth/lock

### 8.6 Confirmed Real Integrations

| Integration | Status | Risk |
|-------------|--------|------|
| Discord interactions | Ed25519-verified | Admin ops env-gated only (any caller can restructure guild) |
| GitHub | `gh` CLI spawn | Spawn paths untested |
| Puppeteer scraper | Real headless Chrome | **SSRF-capable, unauthenticated, `--no-sandbox`, 0 tests** |
| SQLite | Real persistence | See §7 |

### 8.7 Scraper Security Detail (R2)

- `apps/api/src/scraper/routes.ts:34` — only `new URL()` validation
- `downloader.ts:940-944` — `--no-sandbox`
- Registered with no auth (`index.ts:161`)
- Arbitrary URLs incl. internal/loopback; bytes downloadable

---

## 9. Agent Runtime Layer

### 9.1 Verdict

**Real runtime skeleton, mock intelligence.** NOT a UI shell. NOT autonomously "thinking."

### 9.2 Capability Matrix

| Capability | Classification | Evidence |
|------------|----------------|----------|
| Worker loop / lease claiming | **Implemented & working** | `apps/worker/src/index.ts:6`; `persistence:2116-2218` atomic lease |
| Task lifecycle | **Implemented & working** | `runtime:1059-1068`, state machine + audit |
| Queue / scheduling | **Working (local) / stub (distributed)** | DB poll real; `queue/src/index.ts:18-23` Redis stub |
| LLM adapter | **Implemented, gated off** | `agents/src/llm.ts:69-98` Ollama if flags else **prompt-echo**; no OpenAI/Anthropic in path |
| Tool / shell exec | **Implemented, allow-listed, flag-off** | `gateway/src/index.ts:13-42`; `FEATURE_TOOL_EXECUTION=false` |
| File editing | **Engine real, starved** | `agents/src/patch-apply.ts:105-135` real diff write — diffs from prompt-echo by default |
| Approval gates | **Implemented & working** | `runtime:1508-1586`, no self-approval `:1996-2014` |
| Memory / context | **Implemented (deterministic)** | context-minimizer, memory-curator; no embeddings |
| Retries/timeouts/cancel | **Implemented & working** | lease/attempt + `AbortSignal.timeout` |
| Streaming logs | **Mocked/missing** | `stream:false` everywhere; UI polls |
| Cost / token tracking | **Implemented, fed zeros** | usage events hardcoded 0; real numbers only in unwired router |
| 21 "Pokemon agents" | **Markdown + routing + hardcoded switch** | `.agentos/agents/*.md` + `executor.ts:103-161` |

### 9.3 Decisive Tell

Entire agent pipeline runs only inside:

```text
if (isMockAgentExecutionEnabled(route) ...)  // packages/runtime/src/index.ts:1277
```

Non-mock path **skips agents**, shells one allow-listed command.

Mission results: templated `Executed "<cmd>" in <ms>ms`.

To get real end-to-end agents: flip ~6 flags across 3 layers, run Ollama, and cloud router still unwired.

### 9.4 Mock LLM Implementation

`packages/agents/src/llm.ts:78-97` — returns `prompt.slice(0,600)` echo tagged `provider:"mock"`

`apps/api/src/providers.ts:16-30` — `Mock AgentOS response for: <prompt>`

### 9.5 Architecture Drift (R7)

**Turning off mock reduces agent behavior** — impressive pipeline exists mainly to render in mock. Non-mock path skips agents entirely.

### 9.6 Task Lifecycle State Machine

```
queued ──claim(lease)──▶ planning ──▶ running ──┬──▶ awaiting_approval ──approve──▶ running
   ▲                                            │                       └──deny──▶ denied
   │ retry (attemptCount<maxAttempts)           ├──▶ paused ──resume──▶ running
   └────────────────────────────────────────────┤
                                                 ├──▶ completed
                                                 └──▶ failed (lease expiry → reclaim)
```

Enforced: lease claiming with expiry/reclaim, attempt counting/retries, pause/resume, AbortSignal timeouts, approval gates with no self-approval, audit events tagged `mock: true/false`.

Evidence: `packages/runtime/src/index.ts:1059-1068, 1277, 1508-1586, 1853-1867`; `packages/persistence/src/index.ts:796-826, 2116-2218`.

### 9.7 Default Mission Run Flow (9 Steps)

1. **Create:** `POST /missions` (`apps/api/src/index.ts:353`) → real SQL transaction
2. **Enqueue:** `POST /missions/:id/run` (`:531`) → queued `mission_run`
3. **Claim:** worker polls 4s → `claimNextQueuedRun` (lease-based)
4. **Route:** `determineMissionRoute` (orchestrator) picks agents + `providerLane`
5. **Execute (mock):** `providerLane==="mock_local"` → `isMockAgentExecutionEnabled` true → `executeAgentPipelineStep` → templated summaries
6. **Approve:** if policy requires → `approval_request`; run waits (`AGENTOS_REQUIRE_HUMAN_APPROVAL=true`)
7. **Real action:** `executeGatewayCommand` → gateway `POST /execute` → one allow-listed command
8. **Persist:** logs, audit, templated summary, **hardcoded-zero** token/cost
9. **Surface:** UI polls logs 1.2s; `/events` WS broadcasts snapshots

---

## 10. UI & UX Layer

### 10.1 Routes

`/`, `/missions`, `/routines`, `/operators`, `/control-gate`, `/blackbox`, `/archive`, `/wiki`, `/loadout`, `/settings`, `/scraper`, `/docs/*`, `/preview/forge` (`/dashboard` → redirect `/`)

### 10.2 Client Wiring

- API client over Next proxy `/agentos-api/*` (`next.config.mjs:91-104`)
- WebSocket-first realtime (`/events`) with 5s `/dashboard` poll fallback (`use-agentos-events.ts:52-91`)
- Seed-data fallback when API down: home shows "API offline — showing placeholder data" (`useForgeHomeData.ts:168-186`)

### 10.3 UI → Backend Wiring Map

| UI Route | Backend | Real Data? |
|----------|---------|------------|
| Home `/` (missions/gate/marquee) | `/dashboard` (poll 8s) | **Real** |
| Home Analytics/Providers/Integrations | none | **MOCK** — Math.random/static, mislabeled "LIVE" |
| `/missions` | `/missions`, `/missions/:id/run`, questionnaire | **Real** |
| `/operators` | `/dashboard` | **Real** (confidences synthetic) |
| `/control-gate` | `/approvals/*`, `/control-gate` | **Real** |
| `/blackbox` | `/runs/:id/logs`, `/runs/:id/gates`, `/audit` | **Real** |
| `/wiki` | `/memory/wiki/*` | **Real** |
| `/settings` | `/system`, `/usage`, `/llm/routes`, `/providers/status` | **Real** (policy list hardcoded) |
| chat dock | `/chat/threads/:id/messages`, `/rich-actions/execute` | **Real** |
| `/scraper` | `/scraper/*` | **Real** |
| realtime | `/events` WS | **Real** (unauthenticated) |
| Discord auth | `/auth/discord`, `/auth/me`, `/auth/logout` | **Real OAuth** |
| `/preview/forge`, `/docs/*` | none | **Static** |

### 10.4 Build Output

- Next.js compiled in **5.0s**
- 103 kB shared First Load JS
- `/preview/forge` 1.91 kB; `/scraper` 6.52 kB
- Operational routes 175–187 B shells hydrating `AgentOSLocalApp` (176 kB)

### 10.5 Polish & Accessibility

- High polish on home: custom SVG charts, magnetic buttons, scroll-reveal
- `prefers-reduced-motion` honored
- Loading/empty/error states present
- Responsive via CSS only; **no dedicated mobile surface**
- Moderate a11y
- **Two UI vocabularies:** home reimplements Button/Badge inline vs `packages/ui`

### 10.6 Synthetic UI Findings (R8, R13)

- `ForgeHome.tsx:706-829,741` — synthetic widgets badged "LIVE / Refreshed live from the runtime"
- `forge-home-data.tsx:450-452` — `ROUTED_TODAY=4_720_000` static constant
- `dashboard-adapters.ts` — synthetic progress %/confidences
- Home polls separately from WS

---

## 11. Integration Layer

| Integration | Status | Notes |
|-------------|--------|-------|
| **Ollama** | Real, local, safe | Needs daemon + `FEATURE_OLLAMA` + `FEATURE_AGENT_LLM` |
| **OpenAI/Anthropic** | Keys present, **uncalled by code** | Only via disabled LiteLLM; no `openai`/`@anthropic-ai`/`api.openai.com` in source |
| **LiteLLM** | Real scaffold, off, never auto-started | `packages/llm-router` unwired |
| **GitHub** | Real via `gh` | Autopilot can open PRs; spawn paths untested |
| **Discord** | Real bot + OAuth + Ed25519 verify | Needs `DISCORD_BOT_TOKEN`; 26 test files; not exercised in CI live |
| **Cursor** | Real `@cursor/sdk` bridge | Edits working tree, no sandbox; needs `CURSOR_API_KEY` |
| **Cloudflare tunnel** | Real, Windows-host-bound | Hardcoded `C:\Users\gaged\.cloudflared` |
| **Scraper** | Real Puppeteer | Unauth + SSRF; `--no-sandbox` |
| **IcePanel** | Key in `.env` | — |
| **MCP** | None in AgentOS itself | — |

### 11.1 Secrets at Rest (R3)

Live `.env` contains non-empty: OpenAI, Anthropic, `GH_TOKEN`, Discord bot token, Cursor key, IcePanel, `SESSION_SECRET`.

- Gitignored; `.semgrep.yml` blocks commit
- Risk in backup zips: `Documents/AgentOS-Backups/*.zip`, `Downloads/AgentOS_Project_Bundle.zip`
- OpenAI/Anthropic keys **unused by code** — remove or wire to reduce blast radius

---

## 12. Testing Layer

### 12.1 Vitest Breakdown (278 tests / 89 files — all passing)

| Workspace | Files | Tests | Notes |
|-----------|------:|------:|-------|
| `apps/api` | 34 | 88 | 26 Discord files, providers, session, store, memory-wiki |
| `packages/agents` | 15 | 33 | Pipeline, tool-broker, implementer, patch-apply, golden-path |
| `packages/orchestrator` | 9 | 38 | Lane router, planner, intake, context-minimizer |
| `packages/memory` | 7 | 25 | Wiki sync, chatgpt-planning, redact |
| `packages/shared` | 6 | 18 | Domain types, feature flags |
| `packages/runtime` | 4 | 28 | Gates, app-generation, mission-execution-smoke |
| `apps/gateway` | 3 | 7 | Tools, repo-root, index |
| `packages/ui` | 4 | 5 | Component smoke |
| `packages/persistence` | 1 | 23 | Adapter behavior |
| `packages/llm-router` | 1 | 5 | Router logic (mocked fetch) |
| `packages/sandbox` / `queue` / `token-manager` / `app-generator` / `apps/worker` | 1 each | 2/2/2/1/1 | Policy, queue, budget, scaffold, worker |

**Character:** predominantly unit/integration with **heavy mocking** (fetch/SDKs stubbed).

### 12.2 Playwright E2E

- 2 specs; boots real mock-mode stack
- **Non-blocking in CI**
- `e2e/acceptance.spec.ts:28,34,53` — text-match selectors that `skip` on missing data (silent pass)

### 12.3 Smoke Scripts (exist, not all run in audit)

`mission:smoke`, `tool:smoke[:live]`, `spine:*`, `discord:smoke*`, `llm:smoke`, `agentos:bench-*`

### 12.4 Untested Critical Paths

| Path | Risk |
|------|------|
| Entire **scraper** | 0 tests, highest-risk |
| Discord gateway WS reconnect | — |
| `gh` spawn paths | — |
| Cursor real SDK | — |
| LiteLLM cloud lane | — |
| Route authZ coverage | — |

### 12.5 CI Gaps

- semgrep gate disabled
- e2e non-blocking
- pre-commit runs no tests

### 12.6 Recommended Test Hierarchy

1. Keep fast mocked unit core
2. Add scraper auth/SSRF tests
3. Real-lane runtime integration test (post Phase 3)
4. Persistence concurrency tests
5. Make e2e + semgrep blocking

---

## 13. Smoke Test Results

### 13.1 Headline

**Repo is green.** Typecheck, full test suite, env validation, sanitization, production build — all pass on clean checkout with no code changes.

### 13.2 Blocks Local Dev / Prod?

| Command | Blocks local dev? | Blocks prod? |
|---------|-------------------|--------------|
| All 5 run commands | No | No |

### 13.3 Additional Smoke Observations

| Observation | Severity | Evidence | Recommended Fix |
|-------------|----------|----------|-----------------|
| Live secrets in on-disk `.env` | **High** | Integrations audit; real-length keys | Rotate; secret manager; exclude from backup zips |
| OpenAI/Anthropic keys unused | Medium | No provider SDK references in source | Remove or wire |
| Gateway allow-list ⇄ alias drift | Low | gateway `:13-26` vs sandbox `:24-33` | Reconcile; parity test |
| `pnpm lint` allow-listed, no script | Low | `package.json` | Add lint or remove from allow-list |
| CI semgrep gate off | Low | `.github/workflows/ci.yml:34-41` | Make blocking once stable |

### 13.4 Recommended Follow-Up Smokes (Not Run)

1. `pnpm dev` → health checks → click-through `/missions`, `/control-gate`, `/blackbox`, `/wiki`, `/scraper` — verify live data (no seed banner)
2. `pnpm mission:smoke`, `pnpm tool:smoke` (in CI; re-confirm locally)
3. `pnpm test:e2e` (Playwright)
4. With Ollama: `pnpm llm:smoke`

### 13.5 Local Development Readiness Verdict

**Strong.** No broken scripts, dependency conflicts, or build failures in read-only smoke set. Material findings are operational/security hygiene, not correctness blockers.

---

## 14. Feature Matrix (30 Features)

**Status labels:** Working · Partially Working · Implemented But Broken · Mocked · Planned Only · Missing · Unknown

| # | Feature | Intended Behavior | Current Status | Evidence / Files | Works Now? | Mocked? | Blockers | Priority | Effort | Next Action |
|---|---------|-------------------|----------------|------------------|------------|---------|----------|----------|--------|-------------|
| 1 | **Agent dashboard** | Live operator view | Working | `AgentOSLocalApp.tsx`, `/dashboard` `index.ts:193` | Yes | Partial widgets | — | P2 | S | Replace synthetic home analytics with `/usage` |
| 2 | **Agent profiles** | 21 named agents | Partially Working | `.agentos/agents/*.md`, `agent-registry.json`, `agent-roster.ts` | Yes (config) | Yes (not executable) | Hardcoded `profileId` switch `executor.ts:103-161` | P2 | M | Profile-driven vs routing roles |
| 3 | **Task / mission creation** | Create via UI/API | Working | `POST /missions` `index.ts:353` | Yes | No | No schema validation | P2 | S | Add Zod/TypeBox |
| 4 | **Task queue** | Durable queue | Partially Working | DB poll `apps/worker`; Redis stub `queue:18-23` | Yes (local) | No | No distributed queue | P3 | M | BullMQ/Redis adapter |
| 5 | **Task execution** | Real work | Partially Working | `processRun` `runtime:1277,1671` | Yes (limited) | Yes (intelligence) | ~11 gateway aliases only | P1 | L | Wire LLM + broaden sandbox |
| 6 | **Multi-agent orchestration** | Conditional graph | Partially Working | `orchestrator` 38 tests; mock branch only | Yes (routing) | Yes (execution) | `isMockAgentExecutionEnabled` `runtime:70-79,1277` | P1 | L | Run pipeline in non-mock path |
| 7 | **Live logs** | Stream to UI | Working (polled) | `appendMissionLog`; poll 1.2s `AgentOSLocalApp.tsx:354` | Yes | No | No streaming | P3 | M | SSE/WS log streaming |
| 8 | **Terminal / console** | Command output | Working (presentational) | `TerminalWindow` + gateway stdout/stderr | Yes | No | Buffered not live | P3 | S | Pipe streamed output |
| 9 | **Command approval** | Human approves | Working | `/approvals/*`, `ForgeControlGateView`; no self-approve `runtime:1996-2014` | Yes | No | — | P2 | — | AuthZ on approval routes |
| 10 | **Sandboxed execution** | Safe commands | Partially Working | Gateway `spawn(shell:false)` `gateway:13-42`, `sandbox` | Yes | No | ~11 aliases; no jail; full env | P1 | L | Real sandbox + broader policy |
| 11 | **File / repo editing** | Diffs | Partially Working | `patch-apply.ts:105-135` | Engine yes | Yes (starved) | Diffs from prompt-echo | P1 | M | Feed real model diffs |
| 12 | **Memory / context** | Mission memory + wiki | Working | `packages/memory`, `/memory/wiki/*` 25+ tests | Yes | No | Substring search only | P3 | M | Vector search |
| 13 | **Scheduling / automations** | Recurring routines | Working | `scheduler` 60s → `/routines/:id/run` | Yes | No | No lock/auth on scheduler | P3 | S | Lock + auth header |
| 14 | **Discord control** | Bot/cards | Partially Working | Real bot `gateway.ts`, OAuth `discord-auth.ts`; 26 tests | Yes (creds) | No (mock w/o token) | Needs live token; not in CI | P3 | M | Live smoke + harden |
| 15 | **Mobile control** | Mobile surface | Planned Only | CSS media-queries only | No | — | No dedicated UI | P4 | L | Defer |
| 16 | **Notifications** | Alerts | Partially Working | Discord webhooks/outbox | Yes (Discord) | No | No email/push | P4 | M | Defer beyond Discord |
| 17 | **Server status** | Health | Partially Working | `/system`, `/health`; worker/gateway hardcoded `index.ts:213-219,1230-1234` | Partial | Yes (flags) | No real probe | P3 | S | Real health checks |
| 18 | **Settings** | Runtime mode | Working | `SettingsView`, `/llm/routes`, `/providers/status` | Yes | Partial (policy static) | — | P3 | S | — |
| 19 | **Auth / security** | Route protection | Partially Working | Discord OAuth + HMAC session; only 2 routes enforce | Login yes | No | Most routes UNAUTH | **P0** | M | Global auth `preHandler` |
| 20 | **Persistence / database** | Durable state | Working | better-sqlite3 + Drizzle 21 tables; 23 tests | Yes | No | FKs OFF, 0 indexes, full-rewrite | P1 | L | Migrations + FKs + indexes |
| 21 | **Deployment** | Host flous.dev | Partially Working | Cloudflare tunnel; compose; no CI deploy | Yes (host-bound) | No | Host-specific paths | P3 | M | Containerize + repeatable deploy |
| 22 | **Observability** | Logs/audit/metrics | Partially Working | Audit + mission logs; Fastify logs | Yes (basic) | No | No metrics/tracing; cost=0 | P2 | M | Metrics + real cost |
| 23 | **Benchmarking** | Profile/pipeline bench | Working | `agentos:bench-*`, `baseline-snapshot.json` | Yes | No | No app-perf bench | P3 | M | Latency/throughput bench |
| 24 | **Test coverage** | Automated + CI | Working | 89/278 pass; `ci.yml` | Yes | No | Scraper untested; e2e non-blocking; semgrep off | P2 | M | Cover scraper; blocking gates |
| 25 | **UI polish / animations** | Forge DS | Working | `packages/ui/motion/*`, reduced-motion; build ✓ | Yes | Some static garnish | Home reimplements components | P3 | S | Unify on `packages/ui` |
| 26 | **LLM (Ollama)** | Local models | Partially Working | `providers.ts:37-71`, `llm-router callOllama` | Yes (Ollama+flags) | Echo without | `FEATURE_AGENT_LLM=false` default | P1 | M | Default-on once wired |
| 27 | **LLM (cloud)** | LiteLLM OpenAI/Anthropic | Planned Only | `llm-router` unwired+disabled `index.ts:11-13,228` | No | — | `routeLlmCall` not called | P2 | L | Wire router; enable LiteLLM |
| 28 | **GitHub** | Issues/PRs via `gh` | Working | `github.ts` `spawnSync("gh",...)` | Yes | No | Needs `gh` auth; untested spawn | P3 | S | Test + gate autopilot PRs |
| 29 | **Cursor bridge** | Drive Cursor from Discord | Partially Working | `cursor-bridge.ts` `@cursor/sdk` | Yes (key) | No (mock w/o key) | Edits working tree, no sandbox | P3 | M | Sandbox repo cwd |
| 30 | **Web scraper** | Headless capture | Working | `scraper/**` Puppeteer; `/scraper/*` + UI | Yes (Chrome) | No | UNAUTH + SSRF; `--no-sandbox`; 0 tests | **P0** | M | Auth + SSRF allow-list + tests |
| — | **Realtime events** | WS snapshots | Working | `/events` WS + poll `use-agentos-events.ts` | Yes | No | `/events` unauthenticated | P2 | S | AuthZ on WS |

### 14.1 Roll-Up

- **Working (~14):** dashboard, mission create, approval gate, persistence, memory/wiki, scheduler, scraper, GitHub, realtime, settings, tests/CI, build, UI/animations, profile benchmarks
- **Partially Working (~11):** task execution, orchestration, sandbox, file editing, Discord, auth, server status, observability, deployment, Cursor, local-LLM
- **Planned Only / Missing:** cloud LLM (unwired), mobile, true streaming, distributed queue, semantic memory
- **Two P0s are security:** unauthenticated API + unauthenticated SSRF scraper

---

## 15. Architecture Map

### 15.1 One-Line Answer

> AgentOS is a real, structurally-complete control-plane skeleton with genuine execution backbone whose agent intelligence is mock/templated by default. NOT a UI mockup. NOT yet an autonomous agent runtime. **Backend-real, intelligence-mock orchestration shell.**

**Maturity:** advanced prototype / pre-MVP control plane (~60–70% plumbing; missing 30–40% = real model-driven execution wired through front door).

### 15.2 Current Architecture (Text Diagram)

```
                         ┌──────────────────────────────────────────┐
                         │  Operator (browser / Discord / mobile-web) │
                         └───────────────┬───────────────┬───────────┘
                                         │               │
                       HTTPS (Cloudflare │ Tunnel)       │ Discord Gateway WS + OAuth
                       flous.dev / api.*  │               │
                                         ▼               ▼
   ┌───────────────────────────┐   ┌───────────────────────────────────────────┐
   │ apps/command-center        │   │ apps/api  (Fastify :8787)                  │
   │ Next.js :3000              │──▶│  REST, /events WS, Discord, providers    │
   │  /agentos-api proxy        │◀──│  scraper/* (Puppeteer)                     │
   │  WS-first + poll fallback  │   └───┬──────────────┬────────────────┬────────┘
   │  seed-data fallback        │       │              │                │
   └───────────────────────────┘       ▼              ▼                ▼
                     ┌───────────────────────┐  ┌──────────────┐  ┌───────────────────────┐
                     │ packages/persistence   │  │ apps/worker  │  │ apps/gateway :8790    │
                     │ SQLite WAL 21 tables   │◀─┤ 4s poll loop │  │ spawn(shell:false)    │
                     └───────────────────────┘  └──────┬───────┘  │ ALLOW-LIST (~11)      │
                                                        │          └───────────────────────┘
                          ┌─────────────────────────────┘
                          ▼
          ┌────────────────────────────────────────────────────────────┐
          │ packages/runtime (spine)                                      │
          │  IF isMockAgentExecutionEnabled: ◀── DEFAULT                  │
          │      executeAgentPipelineStep (TEMPLATED)                     │
          │  approval gate (no self-approve)                              │
          │  executeGatewayCommand ◀── one real action                    │
          └───────┬───────────────────────────┬───────────────┬─────────┘
                  ▼                           ▼               ▼
   ┌──────────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐
   │ packages/agents          │  │ packages/orchestr. │  │ packages/sandbox       │
   │  callAgentLlm: echo/mock │  │ route + intent     │  │ assessCommandPolicy    │
   │  patch-apply (REAL write)│  └────────────────────┘  └────────────────────────┘
   └──────────────────────────┘   ┌────────────────────┐  ┌────────────────────────┐
                                   │ packages/llm-router │  │ packages/token-manager │
                                   │ DEAD/UNWIRED        │  │ real gates, fed 0s     │
   ┌──────────────────────────┐   └────────────────────┘  └────────────────────────┘
   │ apps/scheduler 60s loop   │
   └──────────────────────────┘
   External: Ollama :11434 · LiteLLM :4000 (off) · gh · GitHub · Cursor · cloudflared
```

### 15.3 Intended Architecture (from plans)

Same five-service topology with mock boxes made real:

- Replace prompt-echo `callAgentLlm` with `routeLlmCall`
- Flip flags: `FEATURE_AGENT_LLM`, `FEATURE_TOOL_EXECUTION`, `FEATURE_LLM_TOOL_LOOP`, `AGENTOS_IMPLEMENTER_MODE=gateway`
- Postgres adapter for hosted multi-machine; SQLite stays local-first
- Redis/BullMQ replaces in-process queue
- Discord first-class control surface (cards + emoji quick-actions exist)
- Public hosting via Cloudflare Tunnel to `flous.dev`

**Target:** agent control plane (local-first, host-ready).

### 15.4 Minimum Working Product Hiding in Repo

**Local-first, human-approved command runner with polished operator dashboard and Discord control:**

create mission → route → approve → run allow-listed git/pnpm/semgrep command → see logs/audit/gates. **Works today end-to-end.**

### 15.5 What Must Exist Before Agent Control Plane

1. Real LLM wiring through front door
2. Model-driven file edits
3. Broader sandboxed tool execution
4. Persistence hardening (migrations/FKs/indexes/no full-rewrite)
5. AuthZ on API

### 15.6 What to Cut or Delay

Cloud provider lanes, Discord/mobile expansion, Postgres/Redis scale-out, static "analytics" theater — until local real path proven.

---

## 16. Mock-Data Map

| Mock Surface | Location | Nature |
|--------------|----------|--------|
| LLM output (default) | `packages/agents/src/llm.ts:78-97` | `prompt.slice(0,600)` echo, `provider:"mock"` |
| API "AI" provider (default) | `apps/api/src/providers.ts:16-30` | `Mock AgentOS response for: <prompt>` |
| Agent step summaries | `packages/agents/src/executor.ts`, `synthesizer.ts` | Templated strings |
| Mission result summary | `packages/runtime/src/index.ts:~1737` | `Executed "<cmd>" in <ms>ms` |
| Token/cost usage | `packages/runtime` complete/fail bundles | Hardcoded `0` |
| Implementer dispatch (default) | `packages/agents/src/implementer-dispatch.ts:289-303` | "Mock implementer prepared plan…" |
| `task.spawn` tool | `apps/gateway/src/tools.ts:165-187` | Mock acknowledgement |
| Redis queue | `packages/queue/src/index.ts:18-23` | Stub mirrors local array |
| Home analytics/providers/integrations | `ForgeHome.tsx:706-829`, `forge-home-data.tsx:450-452` | Synthetic/static, "LIVE" label |
| `worker:"online"`, `gateway:"online"` | `apps/api/src/index.ts:213-219, 1230-1234` | Hardcoded |
| Seed DB | `packages/shared/src/index.ts`, `agent-roster.ts` | Default mock-first records |
| Postgres adapter | `packages/persistence/src/adapters/postgres.ts` | Throws `*NotImplemented` |
| LiteLLM cloud router | `packages/llm-router/src/index.ts` | Real code, disabled + unwired |

---

## 17. Structural Coupling & Missing Components

### 17.1 Missing Runtime Components (9)

1. Wire `routeLlmCall` into `callAgentLlm` (`llm-router/src/index.ts:11-13` admits unwired)
2. Real model-driven implementer — actual unified diffs (writer real, starved)
3. Real tool/shell breadth beyond ~11 aliases
4. Streaming — `stream:false` everywhere; UI polls
5. Distributed queue — Redis/BullMQ for multi-worker
6. Migrations + FKs + indexes
7. Semantic memory — substring only; `memory.search` unimplemented in gateway
8. AuthZ on operational API
9. Real cost/token accounting in live path

### 17.2 Biggest Coupling / Structural Problems (6)

1. **Schema defined twice by hand** — Drizzle `:120-412` + raw DDL `:3819-3843`
2. **JSON blob write pattern** — `mutate()` + `*Bundle` → delete+reinsert all 21 tables; 3 processes share DB
3. **FKs OFF + zero indexes** — O(n) full scan + JSON.parse; unbounded append-only tables
4. **Two UI vocabularies** — home inline components vs `packages/ui`
5. **Feature-flag maze** — ~6 flags across 3 layers + Ollama/LiteLLM to get "real"
6. **Mock-mode load-bearing** — pipeline only in mock branch; turning off mock *reduces* behavior

### 17.3 Recommended Architecture Direction (5 Steps)

1. Wire `routeLlmCall` → `callAgentLlm`; pipeline in real path; real token/cost
2. Harden persistence: Drizzle Kit, FKs, indexes, per-row writes, retention; single schema source
3. Auth gate (`preHandler`) on mutating + scraper; SSRF allow-list
4. Scale out: Redis/BullMQ, Postgres adapter (interfaces exist)
5. Defer Discord/mobile/cloud until local real path proven

---

## 18. Risk Register (20 Risks)

| # | Risk | Severity | Likelihood | Impacted Area | Evidence | Mitigation | Owner |
|---|------|----------|-----------|---------------|----------|------------|-------|
| **R1** | Unauthenticated operational API — only `/auth/me` & `/auth/success` enforce session; `/missions`, `/runs/*`, `/worker/process`, `/approvals/*`, `/discord/bootstrap`, `/events` open | **Critical** | High | Backend/Security | No global auth; `actingOperatorId` defaults `index.ts:155-157` | Fastify `preHandler` on mutating + sensitive routes | Sec/Eng |
| **R2** | Unauthenticated SSRF-capable scraper — headless Chrome `--no-sandbox`; arbitrary URLs; bytes downloadable | **Critical** | High | Backend/Security | `scraper/routes.ts:34`; `downloader.ts:940-944`; no auth `index.ts:161`; **0 tests** | Auth; SSRF allow-list; drop/isolate `--no-sandbox`; tests | Sec/Eng |
| **R3** | Live secrets at rest in `.env` (OpenAI, Anthropic, GH_TOKEN, Discord, Cursor, IcePanel, SESSION_SECRET); backup zip risk | **High** | Medium | Security/Ops | `.env` read; backup zips | Secret manager; rotate; exclude from backups; remove unused keys | Sec/Ops |
| **R4** | Intelligence mock by default; cloud router unwired — "make it real" is refactor not flag | **High** | High | Agent runtime/Product | `runtime:70-79,1277`; `llm.ts:78-97`; `llm-router:11-13` | Wire `routeLlmCall`; non-mock pipeline; label mock in UI | Eng/Prod |
| **R5** | Persistence concurrency / full-DB-rewrite — 3 processes → last-writer-wins | **High** | Medium | Persistence | `saveDatabase :3894-3961`; bundles via `mutate()` | Per-row SQL; `busy_timeout`/`BEGIN IMMEDIATE`; kill blob rewrites | Eng |
| **R6** | No migrations; FKs OFF; zero indexes; unbounded append-only tables | **High** | High | Persistence | `pragma FK OFF :1884`; no indexes; `db-migrate.mjs` importer not migrator; dual schema | Drizzle Kit; FKs; indexes; retention; single schema | Eng |
| **R7** | Mock-mode load-bearing — turning off mock reduces behavior | Medium | High | Architecture | `isMockAgentExecutionEnabled` gates pipeline `runtime:1277` | Invert: non-mock = rich path; mock = test double | Eng |
| **R8** | Mock UI mislabeled "LIVE" — Math.random/static on home | Medium | High | UI/Product | `ForgeHome.tsx:706-829`; `forge-home-data.tsx:450-452` | Wire `/usage` or relabel "sample" | Prod/Eng |
| **R9** | Unsafe exec if flags flipped — full `process.env` to children; allow-list drift | Medium | Medium | Sandbox/Security | `gateway/index.ts:42`; alias vs policy mismatch | Minimal child env; parity test; real sandbox before broaden | Sec/Eng |
| **R10** | Missing tests on highest-risk surfaces — scraper 0 tests; WS reconnect; gh; Cursor; LiteLLM; e2e non-blocking; semgrep off | Medium | Medium | Testing | `ci.yml:34-41` | Scraper + WS tests; blocking gates | Eng |
| **R11** | Cost/token blow-ups — hardcoded 0 on live path; paid keys present | **High** | Medium | Token-manager/Cost | `completeRunBundle` tokens/cost=0 | Wire real cost from `routeLlmCall`; verify budget hard-stop | Eng/Ops |
| **R12** | Unbounded scope / feature creep — many surfaces, thin core depth | Medium | High | Product | 60+ scripts; many integrations vs mock core | Freeze surfaces until real execution proven | Prod |
| **R13** | Fragile UI/backend wiring — synthetic progress; separate polls; e2e skip-on-missing | Low | Medium | UI/Testing | `dashboard-adapters.ts`; `e2e/acceptance.spec.ts:28,34,53` | Real metrics; `data-testid`; fail not skip | Eng |
| **R14** | Dependency/config hazards — no lint script; Node 22 vs 24; unused compose pg/redis | Low | Low | Config | `package.json`; `docker-compose.yml`; CLAUDE.md | Add lint or remove; pin engines; document/prune compose | Eng |
| **R15** | Auth gaps beyond R1 — 365-day sessions; permissive CORS; Discord admin env-gated only | Medium | Medium | Security | `session.ts:14`; `index.ts:159`; `index.ts:1299-1301` | Shorter sessions; restrict CORS; gate Discord admin on operator | Sec |
| **R16** | Poor observability — no metrics/tracing; hardcoded health | Medium | Medium | Ops | `index.ts:213-219,1230-1234` | Real probes; metrics + alerting | Ops/Eng |
| **R17** | Local vs cloud confusion — SQLite doctrine vs flous.dev/Postgres URL; adapter throws | Medium | Medium | Architecture/Ops | `.env.example`; `adapters/postgres.ts` | Clear local→host story; finish adapter before prod | Prod/Eng |
| **R18** | Weak deployment — host-bound PowerShell/tunnel; no containerized deploy; no CI deploy | Medium | Medium | Deployment/Ops | `repair-cloudflare-tunnel.ps1`; `infra/cloudflared` | Containerize; parameterize paths; deploy pipeline | Ops |
| **R19** | Performance uncertainty — no app-perf bench; concurrent runs untested vs full-rewrite | Medium | Medium | Performance | No latency bench; R5 | Benchmark plan §21; load-test before multi-worker | Eng |
| **R20** | Discord/mobile creep vs no mobile surface | Low | Medium | Product | UI audit — no mobile route | Defer mobile until core real | Prod |

### 18.1 Top 5 Risks to Act On First

1. **R1 + R2** — authZ + scraper lockdown
2. **R3 / R11** — secret hygiene + real cost before cloud keys
3. **R5 / R6** — persistence hardening before hosting/multi-worker
4. **R4 / R7** — wire LLM router; non-mock = rich path
5. **R8** — stop labeling synthetic widgets "LIVE"

---

## 19. Implementation Roadmap (Phases 0–7)

### Phase 0 — Stabilize the Repo

**Goal:** Lock green state; remove footguns.

| Item | Detail |
|------|--------|
| Deliverables | Root `lint` + ESLint (or remove from allow-list); reconcile gateway⇄sandbox lists + parity test; pin Node `>=22`; secret hygiene; blocking semgrep + e2e in CI |
| Files | `package.json`, `.eslintrc*`, `apps/gateway/src/index.ts`, `packages/sandbox/src/index.ts`, `.github/workflows/ci.yml`, `.semgrep.yml`, `.env(.example)` |
| Exit criteria | typecheck+test+build+sanitize+env green; lint runs; parity test passes; CI gates blocking |
| Risks | Blocking gates may surface latent failures — fix, don't re-disable |
| Tests | Allow-list parity; lint in CI |
| Performance | Baselines: install time, build wall-clock (Next 5.0s), stack startup to all `/health` 200 |
| Must-build | lint + parity + blocking CI |

### Phase 1 — Make the Shell Real

**Goal:** Dashboard shows only real data; no "LIVE" lies.

| Item | Detail |
|------|--------|
| Deliverables | Replace home synthetic widgets with `/usage`, `/llm/routes`, `/providers/status` or relabel; real worker/gateway health probes; derive progress/confidences from run state; unify on `packages/ui` |
| Files | `ForgeHome.tsx`, `forge-home-data.tsx`, `dashboard-adapters.ts`, `apps/api/src/index.ts` |
| Exit criteria | Every "LIVE" badge backed by endpoint; health reflects probes |
| Risks | Less impressive home — acceptable |
| Tests | UI tests for API-backed widgets; health-probe unit test |
| Performance | `/dashboard` p95 < 150ms local; `/` interactive < 2s |
| Must-build | Real health + de-faked widgets |

### Phase 2 — Real Task Queue + State

**Goal:** Persistence safe for concurrent multi-process operation.

| Item | Detail |
|------|--------|
| Deliverables | Drizzle Kit migrations; single schema source; enable FKs; indexes on hot columns; port `mutate()`/`*Bundle` off full-rewrite; `busy_timeout`/`BEGIN IMMEDIATE`; retention/pruning; optional Redis/BullMQ |
| Files | `packages/persistence/src/index.ts`, `adapters/*.ts`, `scripts/db-migrate.mjs`, `packages/queue/src/index.ts` |
| Exit criteria | Concurrent writes don't clobber; schema migrates; indexed reads; load test N parallel runs holds integrity |
| Risks | Data migration of existing `.db`; many copy-pasted column maps |
| Tests | Concurrency race for `claimNextQueuedRun`; migration up/down; integrity after parallel runs |
| Performance | enqueue→claim < 4s (poll) or < 200ms (Redis); no full-table scans on hot reads |
| Must-build | migrations + FKs + indexes + per-row writes + pruning |
| Delay | Postgres adapter (Phase 7) |

### Phase 3 — Real Agent Runtime

**Goal:** Agents do real model-driven work — **single highest-value change.**

| Item | Detail |
|------|--------|
| Deliverables | Wire `routeLlmCall` → `callAgentLlm`; pipeline in **non-mock** path; real diffs → `patch-apply`; real token/cost → usage events |
| Files | `packages/agents/src/llm.ts`, `packages/runtime/src/index.ts:70-79,1277`, `packages/llm-router/src/index.ts`, `executor.ts`, `synthesizer.ts`, `token-manager` |
| Exit criteria | Mission with `FEATURE_OLLAMA=true` produces real model response, real diff, non-zero cost — `pnpm llm:smoke` + runtime test |
| Risks | Local model quality/latency; prompt-echo masks failures |
| Tests | Real-lane runtime test; cost-accounting test; llm-smoke in CI with Ollama service |
| Performance | Agent-execution latency baseline per lane; budget hard-stop before daily cap |
| Must-build | Router wiring + non-mock pipeline + real cost |
| Blockers | Phase 2 (don't run real load on fragile store) |
| Success criterion | "Turn off mock" **upgrades** behavior |

### Phase 4 — Human Approval + Sandboxed Execution

**Goal:** Broader real actions safely.

| Item | Detail |
|------|--------|
| Deliverables | Real sandbox (container/constrained child); minimal child env; broaden tools behind policy; auth `preHandler` (R1/R2); SSRF allow-list; drop/isolate `--no-sandbox`; wire `FEATURE_TOOL_EXECUTION`/`FEATURE_LLM_TOOL_LOOP`/`AGENTOS_IMPLEMENTER_MODE=gateway` with guardrails |
| Files | `apps/gateway/src/*`, `packages/sandbox/src/index.ts`, `apps/api/src/index.ts`, `apps/api/src/scraper/*`, `implementer-dispatch.ts`, `tool-broker.ts` |
| Exit criteria | Agent edits real repo file via approved sandboxed tools; no unauthenticated mutation; scraper rejects private ranges |
| Risks | Genuinely powerful and dangerous — approval + audit must hold |
| Tests | authZ per route class; SSRF block; sandbox escape; approval-required-for-write |
| Blockers | Phase 3 |

### Phase 5 — Observability + Benchmarks

**Goal:** See what system does and how fast.

| Item | Detail |
|------|--------|
| Deliverables | Metrics endpoint; trace IDs end-to-end; app-perf benchmark suite (§21); SSE/WS live logs; budget/run alerting |
| Files | `apps/api/src/*`, new `scripts/bench-*`, `token-manager` |
| Exit criteria | Dashboard shows real latency + cost; committed baseline; logs stream |
| Blockers | Phases 2/3 |

### Phase 6 — Discord / Mobile Control

**Goal:** Discord + responsive web as first-class surfaces.

| Item | Detail |
|------|--------|
| Deliverables | Rich agent cards + emoji quick-actions; Discord live-smoke; gateway WS reconnect tests; responsive mobile web |
| Files | `apps/api/src/discord/*`, `scripts/*discord*`, command-center responsive |
| Exit criteria | Approve/deny/run/inspect mission entirely from Discord; WS reconnect tested |
| Blockers | Phases 3–4 |
| Delay | Native mobile app |

### Phase 7 — Production Hardening

**Goal:** Host reliably at `flous.dev`.

| Item | Detail |
|------|--------|
| Deliverables | Finish Postgres adapter (`FOR UPDATE SKIP LOCKED` claim sketched); containerize stack; secret manager; shorter sessions; restricted CORS; `@fastify/rate-limit`; deploy pipeline; backup/restore; tunnel watchdog |
| Files | `adapters/postgres.ts`, `docker/*`, `docker-compose.yml`, `infra/cloudflared/*`, `scripts/*tunnel*`, `apps/api/src/index.ts` |
| Exit criteria | Cold-deploy clean host; multi-worker Postgres; rate-limited, CORS-restricted, secrets externalized |
| Blockers | Phases 2–5 |

### 19.1 Cross-Cutting Blockers

- Prompt-echo masks failures until Phase 3
- Full-DB-rewrite + FKs-off fights concurrency/scale (Phases 2/3/5/7) — fix early
- Secrets + authZ must precede cloud-key or hosted exposure (Phases 0/4/7)

### 19.2 Overall Success Definition

Operator (web or Discord) creates mission → real model plans and edits real repo through sandbox → human approves risky steps → real logs stream and real cost tracked under enforced budgets → hardened multi-process store → **no mock on critical path, no unauthenticated mutation surface.**

---

## 20. Product Classification

### 20.1 Current Implementation

**Agent Operations Dashboard / local-first AI command center** — real operator console + control/approval layer + audit over mission/run model; "agents" are routing roles; execution = human-approved allow-listed command runner with mock reasoning.

### 20.2 Intended Product

**Agent control plane** (local-first, host-ready) — create missions, supervise real safe agent execution, approve risky actions, observe cost/audit.

### 20.3 Supported vs Unsupported Claims

| Claim | Supported? |
|-------|------------|
| Local-first operator dashboard + approval/audit + safe command execution + Discord control + persistence | **Yes** |
| Multi-agent system that plans and edits code with real models | **No** (scaffolding exists, not on critical path) |

### 20.4 Comparison to Adjacent Categories

| Category | AgentOS Position |
|----------|------------------|
| **Factory-style agent-native dev** | Has operator/control-plane + approval gates; lacks real autonomous code-editing agents (editor real, diffs mock by default) |
| **OpenHands-style coding agents** | Has loop scaffolding + narrow sandbox; runs mock mode by default vs OpenHands real LLM tool loops |
| **CrewAI / LangGraph** | AgentOS is an *application* with bespoke conditional graph + UI — more product, less framework; graph executes templated steps today |
| **n8n / Zapier** | Routines/scheduler far thinner; automation not strength |
| **LangSmith / AgentOps** | Persists audit/logs + budget gates; lacks metrics/tracing/cost dashboards |
| **Normal admin dashboard** | Well beyond CRUD — real execution backbone, approval gates, queue/worker, Discord/scraper; not yet autonomous agent platform README implies |

### 20.5 Grounded Conclusion

Today: **polished local-first agent operations dashboard with real but narrow execution backbone and mock intelligence**, on credible path to **agent control plane** once real LLM/router/tool pieces wired onto critical path and persistence + auth hardened.

### 20.6 Direct Architecture Answers

| Question | Answer |
|----------|--------|
| UI prototype, backend prototype, agent runtime, or complete system? | **Backend prototype with partially-real, partially-mock front end** — orchestration control-plane skeleton |
| Real maturity level? | Advanced prototype / pre-MVP. Green on gates; headline capability gated off |
| Minimum working product in repo? | Local-first human-approved command runner + polished dashboard + Discord control |
| What before agent control plane? | LLM wiring, model-driven edits, broader sandbox, persistence hardening, authZ |
| What to cut/delay? | Cloud lanes, Discord/mobile expansion, Postgres/Redis scale-out, analytics theater |
| What to build next? | Wire `routeLlmCall` → `callAgentLlm`; pipeline in non-mock path |

---

## 21. Benchmark Status

### 21.1 Existing Harness (Profile/Pipeline — Not App Performance)

| Script | Purpose |
|--------|---------|
| `pnpm agentos:bench-profiles` | Profile benchmarks |
| `pnpm agentos:bench-pipeline` | Pipeline routing/gates |
| `pnpm agentos:bench-report` | Writes `.agentos/state/bench-report.json` |
| `pnpm agentos:bench-baseline` | Regression vs `.agentos/benchmarks/baseline-snapshot.json` |
| `pnpm wiki:benchmark` | Wiki benchmark |

Measures routing/gate/profile behavior — **not** latency/throughput/resource usage.

### 21.2 Proposed Metrics Table

| Metric | Status | How to Measure |
|--------|--------|----------------|
| Install time | measurable, not implemented | Cold install in CI |
| App startup (5 services) | measurable, not implemented | `stack:background` → all `/health` 200 |
| Build time | **measured** (Next 5.0s; full build exit 0) | `pnpm build` wall-clock |
| Page load time | measurable, not implemented | Playwright/Lighthouse on `/`, `/missions` |
| API latency | measurable, not implemented | k6/autocannon on `/dashboard`, `/missions` |
| Task creation latency | measurable, not implemented | `POST /missions` round-trip |
| Queue processing latency | measurable, not implemented | enqueue→claim (≤4s poll bound today) |
| Agent execution latency | measurable (mock fast; real Ollama-bound) | `processRun` per lane |
| Shell command latency | measurable, not implemented | gateway `/execute` timing |
| LLM call latency | **blocked** (needs Ollama/LiteLLM) | `pnpm llm:smoke` timing |
| Streaming/log latency | not applicable | no streaming |
| Memory/CPU usage | measurable, not implemented | OS counters per service |
| Concurrent agent runs | measurable but **risky** | parallel runs stress full-rewrite path |
| Failure/retry rate | measurable | `attemptCount`/audit |
| Token/cost tracking | **blocked / fed zeros** | real numbers via `routeLlmCall` once wired |
| UI responsiveness | measurable, not implemented | Lighthouse / React profiler |

**Summary:** 1 measured (build), ~10 measurable-not-implemented, 2 blocked (LLM latency, real token cost), 1 N/A (streaming).

**Recommended first benchmarks:** build time, stack startup, API/`/dashboard` latency, enqueue→claim latency.

---

## 22. Consolidated Recommendations

### 22.1 Immediate (P0 — Security)

1. Add **one Fastify `preHandler`** requiring valid Discord session on all mutating + sensitive routes (`/missions`, `/runs/*`, `/worker/process`, `/approvals/*`, `/scraper/*`, `/discord/bootstrap|restructure|sync-*`, `/events` WS). Allow-list public routes explicitly.
2. **Scraper hardening:** require auth; SSRF allow-list blocking private/loopback ranges; drop `--no-sandbox` or isolate Chrome in container; add test coverage (currently **0 tests**).

### 22.2 Core Value (P1 — Make It Real)

3. Wire **`routeLlmCall`** (`packages/llm-router`) into **`callAgentLlm`** (`packages/agents/src/llm.ts`).
4. Run **21-agent pipeline in non-mock path** — invert `isMockAgentExecutionEnabled` so mock is test double, not only execution mode (`packages/runtime/src/index.ts:70-79,1277`).
5. Feed **real model-generated unified diffs** to existing `patch-apply.ts` writer.
6. Feed **real token/cost** from `routeLlmCall` into usage events — replace hardcoded zeros so budget gates work (`R11`).

### 22.3 Persistence (P1 — Before Scale/Hosting)

7. Adopt **Drizzle Kit migrations**; single schema source (eliminate dual Drizzle + raw DDL).
8. Enable **foreign keys**; add indexes on: `mission_runs.status`, `mission_runs.mission_id`, `*.workspace_id`, `mission_logs.run_id`, `chat_messages.thread_id`, `audit_events.created_at`.
9. Port **`mutate()`/`*Bundle`** off full-DB delete+reinsert to per-row SQL in transactions; add `busy_timeout`/`BEGIN IMMEDIATE`.
10. Add **retention/pruning** for append-only tables.

### 22.4 Honesty & Hygiene (P2)

11. Replace home **Analytics/Providers/Integrations** synthetic data with `/usage`, `/llm/routes`, `/providers/status` — or relabel "sample" (`R8`).
12. Implement **real worker/gateway health probes** — stop hardcoding `"online"`.
13. Add root **`lint` script** or remove `pnpm lint` from gateway allow-list.
14. **Reconcile gateway alias map ⇄ sandbox policy**; add parity test.
15. Make **semgrep gate + e2e blocking** in CI once stable.
16. Add **scraper + Discord WS reconnect + authZ route** tests.

### 22.5 Sandbox & Execution (Phase 4)

17. **Minimal child env** for gateway spawn — stop passing full `process.env` with secrets.
18. Real **sandbox** (container/constrained child) before broadening beyond ~11 aliases.
19. Wire `FEATURE_TOOL_EXECUTION`, `FEATURE_LLM_TOOL_LOOP`, `AGENTOS_IMPLEMENTER_MODE=gateway` as supported real config with guardrails.

### 22.6 Secrets & Config

20. Move secrets to **secret manager**; rotate keys; verify `.env` excluded from all backup zips.
21. **Remove unused OpenAI/Anthropic keys** or wire and justify.
22. Review unsafe defaults: `AGENTOS_AUTOPILOT_RELEASE=true` + `AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL=false`; 365-day sessions; permissive CORS.
23. Pin Node **`engines: {"node": ">=22"}`**; document/prune unused compose Postgres/Redis.

### 22.7 Observability & Performance (Phase 5)

24. Metrics endpoint (latency, queue depth, outcomes, token/cost).
25. App-performance benchmark suite per §21.
26. **SSE/WS log streaming** replacing 1.2s polling.
27. Alerting on budget thresholds + failed runs.

### 22.8 Production (Phase 7 — Defer Until 2–5 Solid)

28. Finish **Postgres adapter** with `FOR UPDATE SKIP LOCKED` claim path.
29. **Containerize** stack; parameterize host paths (remove `C:\Users\gaged\.cloudflared` hardcode).
30. `@fastify/rate-limit`; restricted CORS; shorter rotating sessions.
31. Repeatable **deploy pipeline**; backup/restore; tunnel watchdog.

### 22.9 Explicitly Defer

- Cloud provider lanes until local real path proven + benchmarked
- Discord/mobile feature expansion beyond thin control surface
- Native mobile app
- Postgres/Redis scale-out until Phase 2 complete
- Shipping fake "LIVE" analytics
- Enabling cloud LLM keys before cost hard-stops verified
- Broadening shell/tools before sandbox + authZ

### 22.10 Feature-Flag Maze (To Get "Real" Today — Still Incomplete)

Requires flipping approximately:
- `FEATURE_OLLAMA`
- `FEATURE_AGENT_LLM`
- `FEATURE_TOOL_EXECUTION`
- `FEATURE_LLM_TOOL_LOOP`
- `AGENTOS_IMPLEMENTER_MODE=gateway`
- Running Ollama daemon
- Even then: **cloud router still unwired**

---

## 23. Final Verdicts

### 23.1 Is the App Runnable?

| Context | Verdict |
|---------|---------|
| **Locally** | **Yes.** typecheck/test/build/env/sanitize pass. `pnpm install → db:migrate → db:seed → dev` documented and working; background stack observed running on audit machine. |
| **Production** | **Not yet.** No authZ/rate-limit, secrets at rest, host-bound tunnel, unimplemented Postgres adapter, zero cost-tracking on live path. |

### 23.2 Real / Mocked / Mixed?

**Mixed — real backend skeleton, mock intelligence.**

- NOT a UI mockup (API/persistence/queue/gateway/Discord/scraper are real)
- NOT yet autonomous agent runtime (model-driven execution gated off and unwired)
- Best label: **local-first agent operations dashboard / control-plane skeleton**
- Intended: **agent control plane**

### 23.3 Biggest Wins

1. Genuinely real backend: Fastify API (~90 endpoints), SQLite+Drizzle (21 tables, survives reload), lease-based worker/queue, real Discord bot + Ed25519 OAuth, real `gh` GitHub, real Puppeteer scraper
2. Repo green end-to-end on fresh checkout; 278 tests; clean production build
3. Polished, animated, accessibility-aware Forge dashboard wired to real endpoints over WS+polling client

### 23.4 Biggest Failures

1. **Agent intelligence mock by default** — `callAgentLlm` prompt-echo; 21 agents = markdown + hardcoded switch; pipeline mock-only; OpenAI/Anthropic uncalled; `llm-router` unwired
2. **Two unauthenticated internet-facing holes** — operational API (2 routes check auth); SSRF-capable `--no-sandbox` Puppeteer scraper (0 tests)
3. **Persistence hazards** — FKs OFF, zero indexes, full-DB delete+reinsert on hot writes across 3 processes, no migration framework
4. **Cost/token tracking hardcoded to 0** on live path; home "LIVE" analytics are `Math.random`/static

### 23.5 Top 5 Next Actions (Ordered)

1. Add Fastify auth `preHandler` over mutating + `/scraper/*`; SSRF allow-list (closes P0 security holes)
2. Wire `routeLlmCall` into `callAgentLlm`; run pipeline in non-mock path (flips mock → real)
3. Feed real token/cost into usage events before any cloud key exercised; verify budget hard-stop
4. Persistence: Drizzle migrations, enable FKs, index hot columns, kill full-DB-rewrite write path
5. Stop labeling synthetic home widgets "LIVE"; reconcile gateway⇄sandbox drift; add `lint` script

### 23.6 Audit Caveat

**Live UI click-through was not performed.** UI behavior established by static analysis + clean build. Recommend follow-up `pnpm dev` walkthrough to confirm WebSocket polling, approval gates, and mission flows at runtime.

---

*End of comprehensive technical review. Source audits dated 2026-06-16. Repository: `C:\Users\gaged\Documents\AgenOS`. No source code modified by this consolidation.*
