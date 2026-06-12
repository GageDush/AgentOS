# AgentOS — Scoping Response (Gage · 2026-06-12)

Derived from web form export. **"defer"** resolved to recommended defaults below.

---

## Executive summary

**Your north star:** Orchestrate agents to do real tasks for you, plus use downtime for agents to improve AgentOS (training, feature generation).

**Locked execution order** (priority + dependencies):

| Wave | Projects | Why |
|------|----------|-----|
| **Wave 1** | P4, P7 (foundation UX + memory) | Priority 1; unblocks operator visibility and context |
| **Wave 2** | P1 → P2 → P3 | Developer spine: implement → gate → ship |
| **Wave 3** | P5 | Discord/CI hardening in parallel with Wave 2 tail |
| **Wave 4** | P6 | Scale design; SQLite stays until Wave 4 cutover |
| **Wave 5** | P8 | Tag `agentos-V1` |
| **Wave 6** | P9 | Phased — not full visual editor v1 |

**Resolved globals**

| Field | Your answer | Locked decision |
|-------|-------------|-----------------|
| Implementer | both | Cursor for multi-file edits; gateway for verify (test/typecheck/git) |
| Hosting | defer | **SQLite + local queue until P6 cutover** |
| CI | both | GitLab + GitHub Actions jobs (same scripts) |
| Cross-cutting | defer | Mock-safe CI; Ollama default; cloud opt-in; strict sanitization |

---

## P1 — Tool catalog (your question)

**Already in scope (you selected):** Read, Grep, Shell, Write/Edit (patch apply)

**Recommended additions for v1 implementer broker**

| Tool | Purpose | Gate | Notes |
|------|---------|------|-------|
| `glob.list` | Find files by pattern | No | Safer than shell find |
| `git.diff` | View changes | No | Feeds review gates |
| `git.status` | Working tree state | No | Pre-commit checks |
| `git.add` / `git.commit` | Stage & commit | **Control Gate** | P3 release path |
| `git.push` | Push to origin | **Control Gate** | You chose origin only |
| `pnpm.test` | Run tests (scoped) | No | Via gateway alias |
| `pnpm.typecheck` | Typecheck | No | Via gateway alias |
| `memory.search` | Pull approved memories | No | Ties to P7 |
| `task.spawn` | Dispatch subagent (bounded) | **Control Gate** | For "agent training" loops later |
| `patch.apply` | Unified diff apply | Yes if outside sandbox | Already partial in codebase |

**Defer to v2 (powerful / risky)**

| Tool | Why defer |
|------|-----------|
| `web.fetch` | SSRF / secret leak risk |
| `deploy.*` | Production blast radius |
| Arbitrary `curl` / `npm install` | Supply chain + network |
| Full `git push --force` | Destructive |

**configs/default-tools.yaml** already lists: `memory.search`, `usage.record`, `file.write`, `terminal.run`, `deploy.production` — wire these IDs in P1 step 3–5.

---

## Revised scope by project

### P4 — Live dev UX (Priority 1) — START HERE

| Field | Locked |
|-------|--------|
| Poll fallback | **5s** when WS down |
| Success demo | Start platform demo; Blackbox updates live without refresh |
| Polish | Full Forge routes get connection indicator + live run state |

### P7 — Memory curator (Priority 1)

| Field | Locked |
|-------|--------|
| Backend | **Phase A:** keyword + queue (now). **Phase B:** pgvector when P6 Postgres lands |
| Approve | Curator proposes; **no auto-write** (curator only per your answer) |
| Success demo | Post-mission memory proposal → approve in Forge → next mission envelope cites it |

### P1 — Implementer realism (Priority 2)

| Field | Locked |
|-------|--------|
| Gate commands | **git push, rm -rf, chmod, deploy, docker push, npm publish** |
| Success demo | Mission fixes intentional failing test in `packages/shared` and passes `pnpm test` |
| Modes | Cursor implements; gateway runs test/typecheck after each fix-verify attempt |

### P2 — Quality gates (Priority 2)

| Field | Locked |
|-------|--------|
| Semgrep path | `.semgrep.yml` at repo root (create minimal ruleset if missing) |
| Min diff for review | **20 lines OR 2 files** |
| Success demo | Failing semgrep blocks run; operator waives with audit from Control Gate |

### P3 — Release execution (Priority 2)

| Field | Locked |
|-------|--------|
| GitHub repo | **GageDush/AgentOS** (from `.env.example`) |
| PR template | Mission id, agents run, gate summary, test output excerpt |
| Success demo | Approved mission → commit on current branch → push origin → PR opened |
| Note | Human approve **NO** + autopilot **yes** — release runs when upstream gates pass |

### P5 — Discord CI (Priority 2)

| Field | Locked |
|-------|--------|
| discord:smoke:full | **Nightly** with protected secrets |
| DISCORD_LIVE_SMOKE | Optional manual workflow_dispatch |
| Success demo | MR fails if `pnpm discord:test` regresses |

### P6 — Hosted scale (Priority 2, cutover deferred)

| Field | Locked |
|-------|--------|
| Now | SQLite; worker poll; design Postgres + 4-worker claim logic |
| Cutover trigger | P8 docker compose green + migration script tested |
| Success demo | Two workers process different runs without double-claim (integration test) |

### P8 — Ship (Priority 2)

| Field | Locked |
|-------|--------|
| Tag | **agentos-V1** |
| Merge checks | typecheck, test, discord:test, validate-profiles, E2E |
| Registry | GitHub Container Registry `ghcr.io` when ready |
| Release | Discord post + brief `docs/RELEASE agentos-V1.md` |

### P9 — App intake (Priority 4) — REVISED

You selected **full visual editor** — that is **not realistic for v1**. Locked phased plan:

| Phase | Deliverable |
|-------|-------------|
| P9a | iframe preview + feedback form → regen (step 123) |
| P9b | Click-to-select component (postMessage) |
| P9c | Full visual editor — **out of agentos-V1** |

---

## 10-step gameplans (adjusted)

### P4 — Live dev UX

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | Type `/events` payload; add `AgentOSEvent` client types | Types in command-center `lib/` |
| 2 | `useAgentOSEvents` hook with reconnect + backoff | Unit test with mock WS |
| 3 | Mount hook in `ForgeDashboardShell` | Connection state: live / polling / offline |
| 4 | Dashboard live run progress | Demo run updates without manual refresh |
| 5 | Blackbox streams logs + audit | New lines &lt; 2s latency on local stack |
| 6 | Control gate approvals via WS | Approval card without poll-only |
| 7 | Poll fallback **5s** when WS unhealthy | Network tab shows reduced polling when live |
| 8 | Offline + tunnel banners | Clear message when API or flous.dev unreachable |
| 9 | MAX polish pass on all Forge routes | Consistent loading/error/empty states |
| 10 | Playwright: mission start → UI update | E2E passes with stack up |

### P7 — Memory curator

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | Document curator flow API → queue → UI | Matches code in `memory-curator.ts` |
| 2 | Memory schema: type, sourceRunId, status | Persistence migration tested |
| 3 | Keyword search (Phase A) | `searchMemories` returns ranked results |
| 4 | Curator proposes post-mission entries | Queue item with preview |
| 5 | Approve/dismiss durable | Approved memory on next mission |
| 6 | Context minimizer injects top-k refs | Envelope compact, not dump |
| 7 | Forge queue panel complete | Approve/dismiss without API calls raw |
| 8 | Discord pending-memory button | Optional notify on queue |
| 9 | pgvector adapter interface (Phase B stub) | Swappable when P6 lands |
| 10 | Decay policy test | `AGENTOS_MEMORY_DECAY` deprioritizes stale |

### P1 — Implementer realism

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | Gap note: mock vs real per dispatch mode | Written in `docs/demo/` |
| 2 | `ToolRequest`/`ToolResult` in `shared` | Serialization test |
| 3 | Read, Grep, glob.list via gateway | Out-of-root fails audited |
| 4 | Shell + pnpm.test/typecheck + git.diff/status | Policy + lease in audit |
| 5 | Wire behind `FEATURE_TOOL_EXECUTION` | Flag off = unchanged behavior |
| 6 | LLM loop: max **32** calls, **30** min cap | Run stops gracefully at cap |
| 7 | Fix-verify: **3** retries on test fail | Exceeded → `needs_attention` |
| 8 | Cursor dispatch + gateway verify split | Blackbox shows both lanes |
| 9 | Integration test: fix `packages/shared` test | `pnpm test` green |
| 10 | Demo docs + default-tools.yaml wired | `acceptance:gate` green |

### P2 — Quality gates

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | Gate flow doc from runtime | Accurate sequence |
| 2 | `GateResult` type + persistence | Queryable per run |
| 3 | QA gate via gateway test/typecheck | Fail includes log excerpt |
| 4 | Semgrep gate (`.semgrep.yml`) | Deterministic pass/fail |
| 5 | Code review gate ≥20 lines or 2 files | Skip below threshold |
| 6 | `GET /runs/:id/gates` complete | All gates listed |
| 7 | Timeline chips | Component test |
| 8 | Blackbox gate artifacts | Operator-readable |
| 9 | Discord fail card + waive → Control Gate | embeds.test.ts |
| 10 | `docs/GATES.md` | Linked from brief |

### P3 — Release execution

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | `RELEASE_FLOW.md` with env matrix | Documents no human approve path |
| 2 | Gateway git add/commit/push allowlist | push gated |
| 3 | Commit as AgentOS bot identity | Audit `release.commit` + sha |
| 4 | Push origin on current branch | Fail surfaces on run |
| 5 | Autopilot PR to GageDush/AgentOS | PR URL on run record |
| 6 | API release block on run | branch, sha, prUrl |
| 7 | Release panel in Forge | prepare → ship states |
| 8 | Discord release card | PR link on success |
| 9 | Mocked GitHub integration test | CI safe |
| 10 | End-to-end with gates mocked | One path green locally |

### P5 — Discord CI

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | Gap list D-04–D-17 | Matches brief |
| 2 | D-04 rich-action-buttons.test.ts | Pass |
| 3 | D-08 outbox.test.ts | Pass |
| 4 | D-09 rest 429 test | Pass |
| 5 | D-10 registry + D-11 snapshots | Pass |
| 6 | D-13 interactions integration | Pass |
| 7 | D-16 live-smoke.mjs | Documented env flag |
| 8 | GitLab CI: discord:test + acceptance | MR gate |
| 9 | GitHub Actions: same jobs | Parity |
| 10 | Nightly smoke:full workflow | Secrets protected |

### P6 — Hosted scale

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | Postgres adapter write gap checklist | All mutations listed |
| 2 | Implement write path for mission/run bundles | Integration test |
| 3 | SKIP LOCKED claim for 4 workers | No double-claim test |
| 4 | Redis/BullMQ producer stub | Job on enqueue when redis |
| 5 | Consumer replaces poll when configured | Worker processes job |
| 6 | Scheduler minute cron + nextRunAt | Routine fires once |
| 7 | SQLite → Postgres migration script | Test on copy of db |
| 8 | docker compose full stack | health checks pass |
| 9 | Run acceptance in compose | green |
| 10 | Cutover runbook (execute when ready) | doc only until you flip |

### P8 — Ship

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | Release checklist for agentos-V1 | Signed criteria |
| 2 | CI typecheck + test both platforms | green on main |
| 3 | CI discord:test + profiles | green |
| 4 | CI E2E every MR | Playwright job |
| 5 | Docker builds all 4 images | local build ok |
| 6 | Compose smoke | one-command |
| 7 | Dress-rehearsal clean machine | checklist done |
| 8 | Fix rehearsal blockers | closed |
| 9 | Release notes + Discord post draft | ready |
| 10 | Tag **agentos-V1** | acceptance green on tag |

### P9 — App intake (phased)

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | Confirm app_creation still in demo path | yes/no doc |
| 2 | Stable preview URL from API | loads in browser |
| 3 | GeneratedAppFrame iframe + sandbox | no XSS |
| 4 | Feedback → regen API wired | new preview version |
| 5 | postMessage inspect (P9b) | typed protocol test |
| 6 | Mission history shows generations | UI visible |
| 7 | Error when output dir missing | clear message |
| 8 | Optional E2E path | or skip doc |
| 9 | **Stop** — full visual editor → backlog | not in V1 |
| 10 | One paragraph in PRODUCT_SUMMARY | secondary lane |

---

## Sign-off alignment

**Your success metric** maps to:

1. **P1 + P2 + P3** — agents actually change code, pass gates, ship PRs  
2. **P4 + P7** — you see what they did and they remember context  
3. **P5 + P8** — regressions caught; repeatable releases  
4. **Future "downtime training"** — use **routines + scheduler** (P6) + `task.spawn` tool (P1 v2) for self-improvement missions with Control Gate on write tools  

**Biggest risk (recommended):** Shipping with P1 still mock-heavy — you'd have orchestration theater, not a software developer. **Do not tag agentos-V1 until P1 step 9 is green.**

---

## P10 — Integration & V1 readiness

| Step | Action | Success parameters |
|------|--------|-------------------|
| 1 | Run `pnpm acceptance:gate` | Green or documented failures |
| 2 | Cross-check P1–P9 success params vs repo | Gap table in `docs/demo/` |
| 3 | Update this file with completion status per project | Dated section |
| 4 | Verify agentos-V1 blockers list | P1 step 9 called out if red |
| 5 | Demo script dry-run | typecheck mission works |
| 6 | Discord smoke status | smoke:full result recorded |
| 7 | E2E status | playwright result recorded |
| 8 | Open issues list for post-V1 | Prioritized backlog |
| 9 | Release readiness verdict | ship / ship-with-gaps / no-ship |
| 10 | Operator sign-off note | Gage approval line |

---

## Project wave runner

Automated P1→P10 prompt chain: `docs/demo/PROJECT_WAVE_RUNNER.md`

```powershell
pnpm project:wave        # P1 kickoff (clipboard)
pnpm project:wave:next   # chain: "Great, Start PN and give me a summary..."
```

## Next action

Start **P1** via `pnpm project:wave` or say **"Start P1"** in chat.
