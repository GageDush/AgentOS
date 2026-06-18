# AgentOS — Feature Matrix

**Repository root:** `C:\Users\gaged\Documents\AgenOS`
**Date:** 2026-06-16 · Review-only forensic audit

**Status labels:** Working · Partially Working · Implemented But Broken · Mocked · Planned Only · Missing · Unknown
**Works Now?** = usable end-to-end today on a default checkout. **Mocked?** = output is simulated/templated/static rather than produced by real work.

| Feature | Intended Behavior | Current Status | Evidence / Files | Works Now? | Mocked? | Blockers | Priority | Effort | Next Action |
|---|---|---|---|---|---|---|---|---|---|
| **Agent dashboard** | Live operator view of agents/missions/runs/health | Working | `apps/command-center/.../AgentOSLocalApp.tsx`, `/dashboard` endpoint `apps/api/src/index.ts:193` | Yes | Partial (some widgets) | — | P2 | S | Replace synthetic home analytics with real `/usage` data |
| **Agent profiles** | 21 named agents with roles/tiers | Partially Working | `.agentos/agents/*.md`, `agent-registry.json`, `packages/shared/agent-roster.ts` | Yes (as config) | Yes (not executable) | Agents are markdown + a hardcoded `profileId` switch (`packages/agents/src/executor.ts:103-161`) | P2 | M | Decide: keep as routing roles or make profile-driven |
| **Task / mission creation** | Create mission via UI/API | Working | `POST /missions` `apps/api/src/index.ts:353`; persists real SQL | Yes | No | No request-schema validation | P2 | S | Add Zod/TypeBox schemas |
| **Task queue** | Durable queue of runs | Partially Working | DB-backed poll loop (`apps/worker`, `claimNextQueuedRun`); `packages/queue` Redis = stub | Yes (local) | No | No distributed queue (`packages/queue/src/index.ts:18-23`) | P3 | M | Add BullMQ/Redis adapter |
| **Task execution** | Run produces real work | Partially Working | `processRun` runs templated agents + 1 real allow-listed command (`packages/runtime/src/index.ts:1277,1671`) | Yes (limited) | Yes (intelligence) | Real action = ~11 gateway aliases only | P1 | L | Wire real LLM + broaden sandboxed tools |
| **Multi-agent orchestration** | Conditional agent graph | Partially Working | `packages/orchestrator` route/intent (38 tests pass); pipeline only runs in mock branch | Yes (routing) | Yes (execution) | Pipeline gated by `isMockAgentExecutionEnabled` (`runtime:70-79,1277`) | P1 | L | Run pipeline in non-mock path |
| **Live logs** | Stream run logs to UI | Working (polled) | `appendMissionLog`; UI polls `/runs/:id/logs` 1.2s (`AgentOSLocalApp.tsx:354`) | Yes | No | No true streaming (`stream:false`) | P3 | M | Add SSE/WS log streaming |
| **Terminal / console** | Command output surface | Working (presentational) | `packages/ui` `TerminalWindow` + real gateway stdout/stderr | Yes | No | Buffered, not live | P3 | S | Pipe streamed output |
| **Command approval** | Human approves risky actions | Working | `/approvals/*`, `ForgeControlGateView`; no self-approve (`runtime:1996-2014`) | Yes | No | — | P2 | — | Add authZ to approval routes |
| **Sandboxed execution** | Safe command execution | Partially Working | Gateway `spawn(shell:false)` + allow-list (`apps/gateway/src/index.ts:13-42`, `packages/sandbox`) | Yes | No | Allow-list only (~11 aliases); no container/jail; full env passed | P1 | L | Real sandbox + broader policy |
| **File / repo editing** | Agent edits files via diffs | Partially Working | Real unified-diff writer `packages/agents/src/patch-apply.ts:105-135` | Engine yes | Yes (starved) | Diffs come from prompt-echo LLM by default | P1 | M | Feed real model diffs |
| **Memory / context** | Mission memory + wiki | Working | `packages/memory`, `/memory/wiki/*` (25+ tests); markdown files | Yes | No | Substring search, no embeddings | P3 | M | Add vector search |
| **Scheduling / automations** | Recurring routines | Working | `apps/scheduler` 60s loop → `/routines/:id/run`; routines persisted | Yes | No | No locking/auth on scheduler | P3 | S | Add lock + auth header |
| **Discord control** | Operate via Discord bot/cards | Partially Working | Real bot (`apps/api/src/discord/gateway.ts`), real OAuth (`discord-auth.ts`); 26 tests | Yes (with creds) | No (mock-mode without token) | Needs live `DISCORD_BOT_TOKEN`; not exercised in CI | P3 | M | Live smoke + harden |
| **Mobile control** | Mobile operator surface | Planned Only | No mobile route/component; CSS media-queries only (UI audit §5) | No | — | No dedicated UI | P4 | L | Defer |
| **Notifications** | Alerts to operator | Partially Working | Discord webhooks/outbox (`discord/outbox.ts`, `webhook-post.ts`) | Yes (Discord) | No | No email/push | P4 | M | Defer beyond Discord |
| **Server status** | Service health | Partially Working | `/system`, `/health`; but `worker/gateway:"online"` hardcoded (`index.ts:213-219,1230-1234`) | Yes (partial) | Yes (worker/gateway flags) | No real worker/gateway health probe | P3 | S | Real health checks |
| **Settings** | Runtime mode + router health | Working | `SettingsView`, `/llm/routes`, `/providers/status` | Yes | Partial (policy list static) | — | P3 | S | — |
| **Auth / security** | Operator auth + route protection | Partially Working | Discord OAuth + HMAC session real (`session.ts`); only `/auth/me`,`/auth/success` enforce it | Login yes | No | Most routes UNAUTH incl. `/worker/process`, `/scraper/*`, `/discord/bootstrap` | **P0** | M | Add global auth `preHandler` |
| **Persistence / database** | Durable local state | Working | better-sqlite3 + Drizzle, WAL, 21 tables (`packages/persistence`); 23 tests | Yes | No | FKs OFF, 0 indexes, full-DB-rewrite writes, dual schema | P1 | L | Migrations + FKs + indexes + per-row writes |
| **Deployment** | Host at flous.dev | Partially Working | Cloudflare tunnel scripts + `infra/cloudflared`; `docker-compose.yml`; no deploy step in CI | Yes (host-bound) | No | Host-specific (`C:\Users\gaged\.cloudflared`), manual | P3 | M | Containerize + repeatable deploy |
| **Observability** | Logs/audit/metrics/tracing | Partially Working | Audit events + mission logs persisted; structured Fastify logs | Yes (basic) | No | No metrics/tracing/dashboards; token cost = 0 | P2 | M | Add metrics + real cost |
| **Benchmarking** | Profile/pipeline benchmarks | Working (profile-level) | `agentos:bench-*` scripts, `.agentos/benchmarks/baseline-snapshot.json` | Yes | No | No app-perf/latency benchmarks | P3 | M | Add latency/throughput bench |
| **Test coverage** | Automated tests + CI | Working | 89 files / 278 tests pass; `.github/workflows/ci.yml` | Yes | No | Scraper untested; e2e non-blocking; semgrep gate off in CI | P2 | M | Cover scraper + make gates blocking |
| **UI polish / animations** | Forge design system | Working | `packages/ui/src/motion/*`, reduced-motion honored; Next build ✓ | Yes | Some static garnish | Home reimplements its own components | P3 | S | Unify on `packages/ui` |
| **LLM integration (local Ollama)** | Local model calls | Partially Working | `providers.ts:37-71`, `llm-router callOllama` | Yes (if Ollama up + flags) | Echo without it | `FEATURE_AGENT_LLM=false` default; Ollama not running | P1 | M | Default-on local lane once wired |
| **LLM integration (cloud OpenAI/Anthropic)** | Cloud lanes via LiteLLM | Planned Only | `packages/llm-router` real but **unwired + disabled** (`index.ts:11-13,228`) | No | — | `routeLlmCall` not called by runtime; flags off | P2 | L | Wire router; enable LiteLLM |
| **GitHub integration** | Issues/PRs via `gh` | Working (with `gh` auth) | `apps/api/src/github.ts` `spawnSync("gh",...)` | Yes | No | Needs authenticated `gh`; spawn paths untested | P3 | S | Test + gate autopilot PRs |
| **Cursor bridge** | Drive Cursor agent from Discord | Partially Working | `apps/api/src/cursor-bridge.ts` `@cursor/sdk` | Yes (with key) | No (mock if no key) | Needs `CURSOR_API_KEY`; edits working tree, no sandbox | P3 | M | Sandbox the repo cwd |
| **Web scraper** | Headless capture + gallery | Working | `apps/api/src/scraper/**` Puppeteer; `/scraper/*` + UI | Yes (needs Chrome) | No | UNAUTH + SSRF-capable; `--no-sandbox`; 0 tests | **P0** (security) | M | Auth + SSRF allow-list + tests |
| **Realtime events** | WS snapshots to UI | Working | `/events` WS + poll fallback (`use-agentos-events.ts`) | Yes | No | `/events` unauthenticated | P2 | S | AuthZ on WS |

**Legend for Priority:** P0 = security/correctness blocker · P1 = core-value blocker (make it real) · P2 = important · P3 = nice-to-have · P4 = defer. **Effort:** S/M/L.

### Roll-up
- **Working (usable today):** dashboard, mission create, approval gate, persistence, memory/wiki, scheduler, scraper, GitHub (with `gh`), realtime, settings, tests/CI, build, UI/animations, profile benchmarks. (~14)
- **Partially Working:** task execution, orchestration, sandboxed execution, file editing, Discord, auth, server status, observability, deployment, Cursor, local-LLM. (~11)
- **Planned Only / Missing:** cloud LLM lanes (planned, unwired), mobile control, true streaming, distributed queue, semantic memory.
- **The two P0s are security, not features:** unauthenticated operational API + unauthenticated SSRF-capable scraper.
