# AgentOS — Roadmap

**Repository root:** `C:\Users\gaged\Documents\AgenOS`
**Date:** 2026-06-16 · Review-only forensic audit

This roadmap is grounded in what the audit found: a **green-building, well-tested control-plane skeleton with real backend plumbing and mock-by-default intelligence**. The throughline is: *harden what exists, then make the agent path real, then make it safe to run autonomously, then scale.* Do not add new surfaces until Phase 3 lands.

Legend — Effort S/M/L; "must-build" = required for the phase's exit criteria.

---

## Phase 0 — Stabilize the Repo
**Goal:** Lock in the current green state and remove footguns before changing behavior.
**Deliverables:**
- Add a root `lint` script + ESLint config (or remove `pnpm lint` from the gateway allow-list) — resolve the mismatch.
- Reconcile gateway alias map ⇄ sandbox policy allow-list; add a parity test.
- Pin Node engines (`"engines": {"node": ">=22"}`); CI already uses 22, audit ran 24 cleanly.
- Secret hygiene: confirm `.env` is excluded from every backup/zip; document rotation; remove the unused OpenAI/Anthropic keys or wire them.
- Make the semgrep gate + e2e job blocking in CI once confirmed stable.
**Files likely involved:** `package.json`, `.eslintrc*` (new), `apps/gateway/src/index.ts`, `packages/sandbox/src/index.ts`, `.github/workflows/ci.yml`, `.semgrep.yml`, `.env(.example)`.
**Exit criteria:** `typecheck`+`test`+`build`+`sanitize`+`env:check` green (already true); lint runs; allow-list parity test passes; CI gates blocking.
**Risks:** Turning gates blocking may surface latent failures — fix, don't re-disable.
**Tests required:** allow-list parity test; lint in CI.
**Performance targets:** capture baselines — install time, `pnpm build` wall-clock (Next ✓ 5.0s today), stack startup to all `/health` 200.
- **Must-build:** lint+parity+blocking CI. **Nice-to-have:** Node pin. **Delay:** none. **Blockers:** none. **Success:** repo green with gates that actually gate.

---

## Phase 1 — Make the Shell Real
**Goal:** The operator dashboard shows only real data; no widget lies about being "LIVE."
**Deliverables:**
- Replace home Analytics/Providers/Integrations synthetic data with `/usage`, `/llm/routes`, `/providers/status`; or relabel as "sample."
- Real `worker`/`gateway` health probes behind `/system` (stop hardcoding `"online"`).
- Derive progress %/confidences from real run state, not constants.
- Unify on `packages/ui` (home stops reimplementing Button/Badge).
**Files:** `apps/command-center/.../forge-home/ForgeHome.tsx`, `forge-home-data.tsx`, `dashboard-adapters.ts`, `apps/api/src/index.ts` (`/system`, `/dashboard`).
**Exit criteria:** Every "LIVE"-badged element is backed by an endpoint; health reflects real probes.
**Risks:** Less impressive-looking home; acceptable — honesty over theater.
**Tests required:** UI tests asserting widgets read API data; health-probe unit test.
**Performance targets:** `/dashboard` p95 < 150ms locally; page load (`/`) interactive < 2s.
- **Must-build:** real health + de-faked widgets. **Nice-to-have:** UI unification. **Delay:** new visualizations. **Blockers:** none. **Success:** a screenshot can't mislead a stakeholder.

---

## Phase 2 — Real Task Queue + State
**Goal:** Persistence and queueing safe for concurrent, long-running, multi-process operation.
**Deliverables:**
- Migration framework (Drizzle Kit); single source of schema truth (drop the dual definition).
- Enable foreign keys; add indexes on hot columns (`mission_runs.status`/`mission_id`, `*.workspace_id`, `mission_logs.run_id`, `chat_messages.thread_id`, `audit_events.created_at`).
- Port `mutate()`/`*Bundle` writes off the full-DB delete+reinsert to per-row SQL in transactions; add `busy_timeout`/`BEGIN IMMEDIATE`.
- Retention/pruning for append-only tables.
- Optional: real Redis/BullMQ queue adapter behind the existing `packages/queue` interface.
**Files:** `packages/persistence/src/index.ts`, `adapters/*.ts`, `scripts/db-migrate.mjs`, `packages/queue/src/index.ts`.
**Exit criteria:** Concurrent API+worker+scheduler writes don't clobber; schema migrates forward; reads are indexed; a load test of N parallel runs holds integrity.
**Risks:** Data migration of existing `.db`; the full-rewrite removal touches many copy-pasted column maps.
**Tests required:** concurrency/race test for `claimNextQueuedRun`; migration up/down test; integrity test after parallel runs.
**Performance targets:** enqueue→claim < 4s (poll bound) or < 200ms (Redis); no full-table scans on hot reads.
- **Must-build:** migrations+FKs+indexes+per-row writes+pruning. **Nice-to-have:** Redis. **Delay:** Postgres adapter (do in Phase 7). **Blockers:** none. **Success:** the persistence layer stops being "JSON blob in SQLite."

---

## Phase 3 — Real Agent Runtime
**Goal:** Agents do real model-driven work through the front door — the single highest-value change.
**Deliverables:**
- Wire `routeLlmCall` (`packages/llm-router`) into `callAgentLlm` (`packages/agents/src/llm.ts`) so the agent path uses real Ollama (and, gated, LiteLLM cloud) instead of prompt-echo.
- Make the 21-agent pipeline run in the **non-mock** path (invert `isMockAgentExecutionEnabled` so mock is a test double, not the only place agents run).
- Real model-generated unified diffs feeding the (already real) `patch-apply` writer.
- Real token/cost numbers from `routeLlmCall` into usage events (replaces hardcoded 0s) so budget gates actually see spend.
**Files:** `packages/agents/src/llm.ts`, `packages/runtime/src/index.ts` (`:70-79,1277`), `packages/llm-router/src/index.ts`, `packages/agents/src/executor.ts`/`synthesizer.ts`, `packages/token-manager`.
**Exit criteria:** A mission with `FEATURE_OLLAMA=true` produces a real model response, a real diff applied to a scratch file, and non-zero accurate token/cost — verified by `pnpm llm:smoke` + a new runtime test.
**Risks:** Quality/latency of local models; prompt-echo currently masks real failures.
**Tests required:** runtime test for real-lane execution; cost-accounting test (non-zero); llm-smoke in CI behind an Ollama service.
**Performance targets:** define agent-execution latency baseline per lane; ensure budget hard-stop triggers before the daily cap.
- **Must-build:** router wiring + non-mock pipeline + real cost. **Nice-to-have:** cloud lane. **Delay:** broad tool execution (Phase 4). **Blockers:** Phase 2 (don't run real load on the fragile store). **Success:** "turn off mock" *upgrades* behavior instead of removing it.

---

## Phase 4 — Human Approval + Sandboxed Execution
**Goal:** Let agents take real, broader actions safely.
**Deliverables:**
- Real sandbox (container or constrained child) replacing the ~11-alias allow-list; minimal child env (stop passing full `process.env`).
- Broaden the tool surface (file edit beyond scratch, more git/pnpm, search) behind policy + approval.
- AuthZ `preHandler` on all mutating + scraper routes (also closes R1/R2); SSRF allow-list on the scraper; drop `--no-sandbox` or isolate Chrome.
- Wire `FEATURE_TOOL_EXECUTION`/`FEATURE_LLM_TOOL_LOOP`/`AGENTOS_IMPLEMENTER_MODE=gateway` as the supported real config with guardrails.
**Files:** `apps/gateway/src/*`, `packages/sandbox/src/index.ts`, `apps/api/src/index.ts` (auth hook), `apps/api/src/scraper/*`, `packages/agents/src/implementer-dispatch.ts`, `tool-broker.ts`.
**Exit criteria:** An agent edits a real repo file via approved tool calls inside a sandbox; no route mutates state unauthenticated; scraper rejects private-range URLs.
**Risks:** This is where AgentOS becomes genuinely powerful and genuinely dangerous — approval gates and audit must hold.
**Tests required:** authZ tests per route class; SSRF block test; sandbox escape test; approval-required-for-write test.
**Performance targets:** sandbox spin-up overhead budget; command latency baseline.
- **Must-build:** authZ + sandbox + SSRF guard. **Nice-to-have:** broad tools. **Delay:** none. **Blockers:** Phase 3. **Success:** safe to run a real autonomous edit with a human in the loop.

---

## Phase 5 — Observability + Benchmarks
**Goal:** You can see what the system is doing and how fast.
**Deliverables:**
- Metrics endpoint (latency, queue depth, run outcomes, token/cost), structured trace IDs end-to-end (correlation IDs already exist in the schema).
- App-performance benchmark suite (see `AGENTOS_ARCHITECTURE_MAP.md §11`): install/startup/build/API/queue/agent/LLM latency, concurrent runs, retry rate, cost.
- Real live-log streaming (SSE/WS) replacing 1.2s polling.
- Alerting on budget thresholds + failed runs.
**Files:** `apps/api/src/*` (metrics/SSE), new `scripts/bench-*` for perf, `packages/token-manager`.
**Exit criteria:** A dashboard shows real latency + cost; benchmarks produce a committed baseline; logs stream.
**Risks:** Benchmark numbers may expose the full-rewrite/scan costs — that's the point.
**Tests required:** metrics smoke; benchmark regression baseline.
**Performance targets:** establish and commit the first real baselines.
- **Must-build:** metrics + perf benchmarks. **Nice-to-have:** tracing UI. **Delay:** none. **Blockers:** Phase 2/3. **Success:** decisions are data-driven, not vibes.

---

## Phase 6 — Discord / Mobile Control
**Goal:** Operate AgentOS from Discord (and responsive web) as first-class surfaces.
**Deliverables:**
- Promote the existing rich agent cards + emoji quick-actions to the primary Discord control flow; live-smoke the bot in CI-adjacent staging.
- Harden the Discord gateway WS (reconnect/resume) with tests.
- Responsive-web operator surface for mobile (defer a native app).
**Files:** `apps/api/src/discord/*`, `scripts/*discord*`, command-center responsive layers.
**Exit criteria:** Approve/deny/run/inspect a real mission entirely from Discord; gateway WS reconnect tested.
**Risks:** Feature creep — keep this thin until Phases 3–4 are real.
**Tests required:** gateway WS reconnect test; interaction authZ tests.
**Performance targets:** interaction round-trip < 1s.
- **Must-build:** Discord control of a real mission. **Nice-to-have:** mobile web. **Delay:** native mobile app. **Blockers:** Phases 3–4. **Success:** Discord is a real control plane, not a notifier.

---

## Phase 7 — Production Hardening
**Goal:** Host AgentOS reliably at `flous.dev`.
**Deliverables:**
- Finish the Postgres adapter (`packages/persistence/src/adapters/postgres.ts`) with the `FOR UPDATE SKIP LOCKED` claim path already sketched; multi-worker.
- Containerize the full stack (compose exists); parameterize host paths (remove hardcoded `C:\Users\gaged\.cloudflared`).
- Secret manager; shorter rotating sessions; restricted CORS; rate limiting (`@fastify/rate-limit`).
- Repeatable deploy pipeline; backup/restore; tunnel watchdog as a managed service.
**Files:** `adapters/postgres.ts`, `docker/*`, `docker-compose.yml`, `infra/cloudflared/*`, `scripts/*tunnel*`, `apps/api/src/index.ts` (CORS/rate-limit/session).
**Exit criteria:** Cold-deploy to a clean host; multi-worker on Postgres; rate-limited, CORS-restricted, secrets externalized.
**Risks:** This is the largest lift; don't start before Phases 2–4 are solid.
**Tests required:** Postgres adapter parity tests vs SQLite; deploy smoke; rate-limit test.
**Performance targets:** hosted API p95 SLOs; multi-worker throughput.
- **Must-build:** Postgres + containerized deploy + rate-limit + secrets. **Nice-to-have:** autoscaling. **Delay:** nothing here is optional for hosting. **Blockers:** Phases 2–5. **Success:** a second machine can run the stack from scratch.

---

## Likely cross-cutting blockers
- The **prompt-echo masks failures** — until Phase 3, real errors look like "successful" mock output.
- The **full-DB-rewrite + FKs-off** persistence will fight every concurrency/scale effort (Phases 2/3/5/7) — fix it early.
- **Secrets + authZ** must precede any cloud-key or hosted exposure (Phases 0/4/7).

## Success definition (overall)
AgentOS is "done as an MVP control plane" when: an operator (web or Discord) creates a mission, a real model plans and edits a real repo through a sandbox, a human approves risky steps, real logs stream and real cost is tracked under enforced budgets, all on a hardened multi-process store — with no mock on the critical path and no unauthenticated mutation surface.
