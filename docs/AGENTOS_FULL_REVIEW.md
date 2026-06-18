# AgentOS — Full Forensic Review

**Repository root (the single AgentOS root, isolated and confirmed):** `C:\Users\gaged\Documents\AgenOS`
(folder is spelled "AgenOS"; the project identifies internally as "AgentOS")
**Audit type:** Review-only forensic. The only repository changes made are these six files under `docs/`. No source was modified.
**Date:** 2026-06-16 · **Branch:** `main` (HEAD `9bbbb0f6`) · Node `v24.16.0` · pnpm `9.15.4`

**Companion documents:** `AGENTOS_SMOKE_TEST_REPORT.md` · `AGENTOS_FEATURE_MATRIX.md` · `AGENTOS_ARCHITECTURE_MAP.md` · `AGENTOS_RISK_REGISTER.md` · `AGENTOS_ROADMAP.md`

### Start-point isolation (how the root was chosen)
Searched all of `C:\Users\gaged`. Candidates found:
- **`Documents\AgenOS\`** — the only **live, extracted** repo: has `package.json` (`name: agentos`), `pnpm-workspace.yaml`, `.git` (branch `main`), installed `node_modules`, `apps/`, `packages/`, `docs/`, `docker-compose.yml`. **← CHOSEN.**
- `Documents\AgenOS_WORKING_MVP_CHECKPOINT.zip`, `Downloads\AgentOS_Project_Bundle.zip`, `Documents\AgentOS-Backups\*.zip` — archives/backups, not live roots.
- `AppData\Local\Temp\agentos-*` — runtime temp state (sqlite/json), not source.
- `Desktop\Pokemon_ER_Companion_Codex_Handoff\package.json` — unrelated project.

Exactly one live AgentOS root exists; the audit is fully isolated to it.

---

# PHASE 10 — Executive Summary (blunt)

**What is AgentOS right now?** A **local-first AI dev-operations control plane that is real on the outside and mock on the inside.** The backend plumbing is genuine and well-built: a Fastify API (90+ endpoints), SQLite persistence behind a repository layer (21 tables), a lease-based worker/queue, an allow-listed shell-execution gateway, a real Discord bot + OAuth, a real Puppeteer scraper, a polished animated Next.js operator dashboard, and a real LLM router. The **agent "intelligence," however, is simulated by default** — agent reasoning returns a truncated echo of its own prompt, agent step reports are templated strings, mission results are `Executed "<cmd>" in <ms>ms` templates, and token/cost is hardcoded to zero. It is **not a UI mockup** (the backend is real) and **not yet an autonomous agent runtime** (the model-driven path is gated off and the cloud router isn't wired to its callers).

**What works (today, default checkout):** Clean `typecheck`, **278 passing tests across 89 files**, clean `env:check`/`sanitize`, and a clean production `build` (Next.js compiles in 5.0s). End-to-end: create a mission → deterministic agent routing → human approval gate (no self-approval) → execute **one allow-listed** git/pnpm/semgrep command via a real `spawn` → persisted logs/audit/gates → live dashboard via WebSocket+polling. Real persistence (survives reload), real Discord OAuth, real scraper, real GitHub `gh` issue/PR, real quota/budget gates.

**What does NOT work / is fake or planned:** Real agent reasoning is mock (prompt-echo) unless Ollama is running **and** several flags are flipped; the **21 "agents" are markdown profiles + routing metadata + a hardcoded `profileId` switch**, not executable agents; OpenAI/Anthropic are **not called by any code** (only reachable through the disabled LiteLLM path, and the router that would call them is **unwired** by its own admission); the agent pipeline only runs inside the **mock branch**; token/cost is zero; streaming, distributed queue (Redis stub), semantic memory, and the Postgres adapter are planned/stub. The home dashboard's most impressive widgets (analytics/providers/integrations) are **`Math.random`/static constants mislabeled "LIVE."**

**Biggest blocker:** The real LLM router (`packages/llm-router`) is **not wired into the agent execution path** (`packages/agents/src/llm.ts`), and the whole agent pipeline runs only in mock mode (`packages/runtime/src/index.ts:1277`). So "make it real" is a deliberate refactor, not a config flag. Closely behind: **two unauthenticated, internet-facing security holes** (the operational API and an SSRF-capable Puppeteer scraper).

**Fastest path to a useful MVP:** (1) Wire `routeLlmCall` into `callAgentLlm` and run the pipeline in the non-mock path; (2) feed real token/cost; (3) add one auth `preHandler` over mutating + scraper routes. That converts the existing skeleton from "intelligence-mock" to "intelligence-real" using infrastructure already built and tested.

**What to build next:** Phase 3 of the roadmap — real agent runtime — preceded by Phase 0/2 stabilization (lint/parity, then persistence migrations/FKs/indexes and killing the full-DB-rewrite write path).

**What to avoid:** Shipping the fake "LIVE" analytics; enabling cloud LLM keys before real cost-tracking + budget hard-stops are verified; broadening shell/tool execution before a real sandbox + authZ exist; adding mobile/Discord surface area before the core executes real work.

## Grades (A–F)

| Area | Grade | One-sentence justification |
|------|:-----:|----------------------------|
| **Repo Health** | **A−** | Clean typecheck, 278 passing tests, clean build/sanitize/env on a fresh checkout — only minor hygiene gaps (no `lint` script, allow-list drift). |
| **Architecture** | **B** | Coherent 5-service control-plane design with real seams, undercut by FKs-off/no-index/full-DB-rewrite persistence and an unwired LLM router. |
| **UI/UX** | **B+** | Genuinely polished, animated, accessibility-aware Forge dashboard wired to real endpoints — minus "LIVE"-labeled synthetic widgets on the home. |
| **Backend** | **B** | Large, real, well-tested Fastify/SQLite/gateway/Discord/scraper surface, held back by near-total lack of authZ and ad-hoc input validation. |
| **Agent Runtime** | **D+** | Real lifecycle/queue/approval/file-writer machinery, but the actual "intelligence" is prompt-echo mock and the pipeline only runs in mock mode. |
| **Testing** | **B** | 278 fast unit/integration tests + CI, but heavy mocking, an untested scraper, non-blocking e2e, and a disabled semgrep gate. |
| **Product Clarity** | **C+** | Strong vision and docs, but mock-by-default + "LIVE" theater make it easy to overstate what the product currently does. |
| **Local Deployment Readiness** | **A−** | `pnpm install → db:migrate → db:seed → dev` works; everything builds and runs locally in mock mode without credentials. |
| **Production Readiness** | **D** | No authZ/rate-limit, secrets at rest, no migrations, host-bound tunnel scripts, unimplemented Postgres adapter, zero cost-tracking on the live path. |

---

# PHASE 1 — Repository Inventory

**Identity:** pnpm monorepo `agentos@0.1.0` (`private`), `packageManager: pnpm@9.15.4`. Workspaces: `apps/*`, `packages/*`.

| Concern | Choice |
|---------|--------|
| Package manager | pnpm 9.15.4 (workspace) |
| Language / runtime | TypeScript 5.7 on Node 22+ (ran on 24.16.0); `tsx`/`vitest` for scripts/tests |
| Frontend | Next.js (app-router) — `apps/command-center`, port 3000 |
| Backend | Fastify — `apps/api` (8787), `apps/gateway` (8790); plus `apps/worker`, `apps/scheduler` |
| Persistence | **SQLite** via `better-sqlite3` + Drizzle ORM, WAL, at `.agentos/state/agentos-local.db`; legacy JSON store deprecated; Postgres adapter is a throwing scaffold |
| Agent framework | In-house: `packages/{orchestrator,runtime,agents,sandbox,queue,token-manager}` + `.agentos/` profiles |
| Task queue / scheduler | In-process array + DB poll loop (`packages/queue` Redis = stub); `apps/scheduler` 60s `setInterval` |
| LLM providers | Ollama (real, local), LiteLLM sidecar → OpenAI/Anthropic (real code, **disabled + unwired**); default provider = `mock` |
| Discord / mobile | Real Discord bot (hand-rolled Gateway v10 WS) + OAuth; no dedicated mobile UI (CSS-responsive only) |
| Auth / security | Discord OAuth2 + HMAC-signed session cookie (real), but enforced on only 2 routes; command policy/approval gates real |
| Sandbox / exec | Gateway `spawn(shell:false)` + ~11-alias allow-list + `packages/sandbox` policy (allow/deny/approval) |
| Observability | Persisted audit events + mission logs + Fastify structured logs; no metrics/tracing; `worker/gateway` health hardcoded |
| Tests | Vitest (89 files / 278 tests) + Playwright e2e (2 specs, non-blocking in CI) + many smoke scripts |
| Build / deploy | `pnpm -r build` (passes); Docker files + `docker-compose.yml`; Cloudflare tunnel scripts → `flous.dev` |
| Env | `.env.example` (146 lines) — many `FEATURE_*` flags; **mock/local by default, cloud disabled** |
| Local dev | `pnpm install` · `pnpm db:migrate` · `pnpm db:seed` · `pnpm dev` (or `stack:background`) |
| Prod | Cloudflare tunnel + autostart scripts (Windows-host-specific); no CI deploy step |

### Major-folder tree + classification

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
├─ docs/               Architecture, plans, design, this audit ..... ASSET/DESIGN + DOCS
├─ prompts/            9 agent role prompts ....................... ASSET/DESIGN
├─ assets/, asset_prompts/  Generated art + manifests ............. ASSET-DESIGN
├─ e2e/                Playwright specs ........................... TEST
└─ test-results/, .tunnel/, .codex-logs/  Runtime artifacts ....... DEAD/UNUSED (regenerated)
```

### Call-outs (duplicates, abandoned, placeholders, drift)
- **Duplicate schema definition** — Drizzle objects vs raw DDL, both hand-maintained in `packages/persistence/src/index.ts`.
- **Deprecated JSON store** — `.agentos/state/agentos-local.json` (Jun 8) superseded by `.db` (Jun 16); CLAUDE.md priority #4 is "delete it after confirming SQLite stability."
- **Dead/unwired code** — `packages/llm-router` is real but its header admits callers were "intentionally NOT refactored," so it never runs in the live path.
- **Stubs** — `packages/queue` Redis adapter mirrors to a local array; `adapters/postgres.ts` throws `*NotImplemented`; gateway `task.spawn` returns a "mock acknowledgement."
- **Unused infra** — `docker-compose.yml` defines Postgres + Redis, but CLAUDE.md says "don't switch to Postgres — SQLite is intentional"; these services aren't used by the live stack.
- **Plans vs implementation drift** — README/CLAUDE describe a richer agent system than the default mock path delivers; the home UI labels synthetic data "LIVE."
- **Retired surface** — the Phaser "office" demo and `packages/game-schema` were removed; docs still reference them as out-of-scope.
- **Two roadmaps of caution:** `.env.example` cloud flags + `flous.dev` hosting target vs "local-first SQLite-only" doctrine — a local-vs-cloud story that isn't fully resolved.

---

# PHASE 2 — Bottom-Up Technical Review

## 2.1 Configuration layer
- **Commands:** install `pnpm install`; dev `pnpm dev`/`stack:background`; build `pnpm -r build`; test `pnpm -r test`; checks `typecheck`/`env:check`/`sanitize:check`. All verified passing (see smoke report).
- **Broken/missing:** no root `lint` script although `pnpm lint` is allow-listed in the gateway (mismatch). Gateway alias map ⇄ sandbox policy allow-list drift (`git log`/`pnpm build` policy-allowed but no alias; `git diff --stat` aliased but not policy-allowed).
- **Deps:** lean root devDeps (`@playwright/test`, `typescript`, `tsx`, `vitest`, `@types/node`); no dependency conflicts surfaced by install/build. Real runtime deps live per-package (`better-sqlite3`, `drizzle-orm`, `fastify`, `next`, `puppeteer`, `@cursor/sdk`, `archiver`).
- **Env:** `.env.example` is thorough; `env:check` passes against the live `.env`. **Unsafe defaults of note:** `AGENTOS_AUTOPILOT_RELEASE=true` + `AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL=false` (autopilot can open real PRs); 365-day sessions; permissive CORS. Cloud providers correctly default OFF.
- **CI/CD:** `.github/workflows/ci.yml` (sanitize→validate-profiles→bench→env→typecheck→test→smokes→discord:test), e2e **non-blocking**, semgrep gate **disabled in CI**; `.gitlab-ci.yml` partial mirror; `.semgrep.yml` thin (block `.env` commit, warn `eval`); `.githooks/pre-commit` does **not** run tests (only wiki-meta reset).

## 2.2 Data / persistence layer
- **Engine:** `better-sqlite3` + Drizzle, WAL, FKs **OFF**. Three adapters (SQLite=active, JSON=deprecated import path, Postgres=throwing scaffold). 21 tables, each `typed columns + payload_json` blob.
- **Persistence is real** (survives reload; `.db` is 1MB + 5MB WAL, Jun 16). **But** the write model is split: a partial real per-row SQL layer (mission/run/approval/audit hot path, in transactions) alongside a **load-entire-DB → mutate → delete+reinsert-all-21-tables** pattern for `mutate()` and every `*Bundle` (the busiest runtime mutations).
- **Entities:** workspaces, operators, agents, tasks, memories, usage_events, budgets, approval_requests, audit_events, demo_mission, missions, mission_runs, mission_logs, routines, loadout, sessions, agent_routing_decisions, chat_threads, chat_messages, quick_actions, meta.
- **Migrations:** none (no framework); `db-migrate.mjs` is a JSON→SQLite **importer** (re-running it clobbers live SQLite with stale JSON). Schema is `CREATE TABLE IF NOT EXISTS` at startup; no ALTER/upgrade path despite `CURRENT_SCHEMA_VERSION=2`.
- **Integrity risks:** FKs off, **zero indexes** (full scan + `JSON.parse` per read), full-DB-rewrite write amplification + cross-process clobbering, unbounded append-only tables (no pruning), dual schema drift, copy-pasted column maps.
- **MVP gaps:** real migrations, FKs+indexes, per-row hot writes, multi-process claim safety, retention, a real users/credentials model (today a single hardcoded `operator-local`), and memory↔DB linkage with real search (currently substring).

## 2.3 Backend / API layer
- **~90+ endpoints** on Fastify (full enumeration in the API audit, summarized in the feature matrix and architecture map). Mostly **real plumbing over SQLite**; "AI" paths default to the **mock** provider (`apps/api/src/providers.ts:30`).
- **AuthZ is the glaring gap:** only `/auth/me` and `/auth/success` enforce the session. Everything else — `/missions`, `/runs/*`, `/worker/process`, `/approvals/*`, `/scraper/*`, `/discord/bootstrap|restructure|sync-*`, `/events` WS — is reachable unauthenticated. `actingOperatorId` silently defaults to the local operator.
- **Validation:** ad-hoc `if (!x) 400`; no JSON-schema/Zod; bodies cast with `as`. **Rate limiting:** none anywhere. **CORS:** `origin:true, credentials:true`.
- **Gateway:** genuinely real shell exec via `spawn(shell:false)` constrained to ~11 hardcoded aliases + policy gate; no container/jail; full `process.env` passed to children. Solid against injection, weak as a sandbox.
- **Scheduler:** real but bare 60s poll loop, no auth/lock.
- **Real integrations confirmed:** Discord interactions (Ed25519-verified), GitHub via `gh`, Puppeteer scraper, SQLite — all real. The scraper is **SSRF-capable and unauthenticated** (security finding).

## 2.4 Agent runtime layer — *Is there a real runtime, or a UI shell?*
**Verdict: real runtime *skeleton*, mock *intelligence*. It is NOT just a UI shell — but it is not autonomously "thinking" either.**

| Capability | Classification | Evidence |
|------------|----------------|----------|
| Worker loop / lease claiming | Implemented & working | `apps/worker/src/index.ts:6`; `persistence:2116-2218` atomic lease |
| Task lifecycle | Implemented & working | `runtime:1059-1068`, state machine + audit |
| Queue / scheduling | Working (local) / stub (distributed) | DB poll loop real; `queue/src/index.ts:18-23` Redis stub |
| LLM adapter | Implemented but **gated off by default** | `agents/src/llm.ts:69-98` Ollama if flags else **prompt-echo**; no OpenAI/Anthropic call in path |
| Tool / shell exec | Implemented, allow-listed, **flag-off** | `gateway/src/index.ts:13-42`; `FEATURE_TOOL_EXECUTION=false` |
| File editing | Implemented & working (engine) | `agents/src/patch-apply.ts:105-135` real diff write — but starved of real diffs by default |
| Approval gates | Implemented & working | `runtime:1508-1586`, no self-approval `:1996-2014` |
| Memory / context | Implemented (deterministic) | `context-minimizer`, `memory-curator`; no embeddings |
| Retries/timeouts/cancel | Implemented & working | lease/attempt + `AbortSignal.timeout` |
| Streaming logs | **Mocked/missing** | `stream:false` everywhere; UI polls |
| Cost / token tracking | Implemented but **zeros** | usage events hardcoded 0; real numbers only in unwired router |
| 21 "Pokemon agents" | Markdown + routing + hardcoded switch | `.agentos/agents/*.md` + `executor.ts:103-161` |

**Decisive tell:** the entire agent pipeline runs only inside `if (isMockAgentExecutionEnabled(route) ...)` (`runtime:1277`); the non-mock path skips the agents and shells one allow-listed command. Mission "results" are templated (`Executed "<cmd>" in <ms>ms`). To get real end-to-end agents you must flip ~6 flags across 3 layers, run Ollama, and even then the cloud router isn't wired in.

## 2.5 UI / UX layer
- **Routes:** `/` (Forge home), `/missions`, `/routines`, `/operators`, `/control-gate`, `/blackbox`, `/archive`, `/wiki`, `/loadout`, `/settings`, `/scraper`, `/docs/*`, `/preview/forge` (`/dashboard` → redirect to `/`).
- **Wiring:** real API client over Next proxy `/agentos-api/*`; WebSocket-first realtime (`/events`) with poll fallback; documented seed-data fallback when the API is down.
- **Connected to real data:** missions, runs, approvals/control-gate, logs, audit, chat, wiki, settings/router-health, scraper, Discord auth, realtime. **Mock/static:** home Analytics/Providers/Integrations widgets (synthetic, mislabeled "LIVE"), `/preview/forge` (samples), `/docs` (static markdown), some synthetic confidences/progress.
- **Polish:** genuinely high on the home (custom SVG charts, magnetic buttons, scroll-reveal, `prefers-reduced-motion` honored) and competent-but-utilitarian on the operational shell. Loading/empty/error states present throughout. Responsive via CSS only; **no dedicated mobile surface**; moderate a11y.

## 2.6 Integration layer
- **Ollama** (real, local, safe; needs daemon + flags). **OpenAI/Anthropic** (keys present but **uncalled by code**; only via disabled LiteLLM). **LiteLLM** (real scaffold, off, never auto-started). **GitHub** (real via `gh`; autopilot can open PRs). **Discord** (real bot + OAuth + interaction signature verify; fully credentialed). **Cursor** (real `@cursor/sdk` bridge; edits the working tree, no sandbox). **Cloudflare tunnel** (real, Windows-host-bound). **Scraper** (real Puppeteer; unauth + SSRF). **MCP:** none in AgentOS itself.
- **Secrets:** the live `.env` holds **real** OpenAI/Anthropic/GitHub/Discord/Cursor/IcePanel/SESSION keys (gitignored, but at rest on disk and at risk in backup zips). Security finding R3.

## 2.7 Testing layer
- **Vitest** 89 files / **278 tests, all passing**; **Playwright** e2e (2 specs, boots a real mock-mode stack, **non-blocking in CI**). Heavy mocking of fetch/SDKs. Many manual smoke scripts (`mission:smoke`, `tool:smoke[:live]`, `spine:*`, `discord:smoke*`, `llm:smoke`).
- **Untested critical paths:** the entire **scraper** (0 tests, highest-risk), Discord gateway WS reconnect, `gh` spawn paths, Cursor real SDK, LiteLLM cloud lane, and route authZ coverage.
- **CI gaps:** semgrep gate disabled, e2e non-blocking, pre-commit hook runs no tests.
- **Recommended hierarchy:** keep the fast mocked unit core; add (a) scraper auth/SSRF tests, (b) a real-lane runtime integration test once Phase 3 lands, (c) persistence concurrency tests, (d) make e2e + semgrep blocking.

---

# PHASE 7 — Product Classification

**Best term for the *current* implementation:** **Agent Operations Dashboard / local-first AI command center** — a real operator console + control/approval layer + audit over a mission/run model, where the "agents" are routing roles and the execution is a human-approved allow-listed command runner with mock reasoning.

**Best term for the *intended* product:** **Agent control plane** (local-first, host-ready) — the place you create missions, supervise *real* safe agent execution, approve risky actions, and observe cost/audit. The repo is clearly built toward this; it doesn't yet support the "agents do real work autonomously" claim because the model path is mock-by-default and the cloud router is unwired.

**Why the repo does / doesn't support the claim:** It *does* support "local-first operator dashboard + approval/audit + safe command execution + Discord control + persistence." It *doesn't yet* support "multi-agent system that plans and edits code with real models" — that capability exists as scaffolding (real file-writer, real router, real lifecycle) but is not connected on the critical path.

**Comparison to adjacent categories:**
- **vs Factory-style agent-native dev:** AgentOS has the operator/control-plane framing and approval gates, but not the real autonomous code-editing agents Factory centers on (its editor is real, its diffs are mock by default).
- **vs OpenHands-style coding agents:** OpenHands runs real LLM-driven tool loops in a sandbox; AgentOS has the loop scaffolding and a real (narrow) sandbox but runs it in mock mode by default.
- **vs CrewAI / LangGraph frameworks:** Those are libraries for composing real agent graphs; AgentOS is an *application* with a bespoke conditional graph + a UI/control plane around it — more product, less framework, but its graph executes templated steps today.
- **vs n8n / Zapier automation:** AgentOS routines/scheduler are far thinner than n8n; automation is not its strength.
- **vs LangSmith / AgentOps observability:** AgentOS persists audit/logs and has budget gates but lacks metrics/tracing/cost dashboards — weaker observability, but it's an operator *and* observer, not pure observability.
- **vs a normal admin dashboard:** AgentOS is well beyond a CRUD admin — it has a real execution backbone, approval gates, queue/worker, and Discord/scraper integrations; it's just not yet the autonomous agent platform its README implies.

**Grounded conclusion:** Today AgentOS is a **polished local-first agent *operations* dashboard with a real but narrow execution backbone and mock intelligence**, on a credible path to becoming an **agent control plane** once the (already-built) real LLM/router/tool pieces are wired onto the critical path and the persistence + auth are hardened.

---

*End of full review. See companion docs for the smoke report, feature matrix, architecture map, risk register, and roadmap. This audit modified nothing outside `docs/`.*
