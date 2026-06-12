# AgentOS — Project Worksheets

Last updated: 2026-06-12

Nine individual projects derived from the developer-first work clusters. Each project includes discussion, a scope worksheet (copy/paste replies), a revised gameplan slot, and a **10-step plan with gate criteria** — do not advance to the next step until the current step’s success parameters are met.

**How to use**

1. **All projects at once:** fill out `PROJECT_SCOPING_FORM.md` and paste the form body back.
2. **One project:** copy that project’s **Scope worksheet** block below.
3. Revise the **Revised scope** and **10-step gameplan** sections with your answers applied.
4. Execute step-by-step; check off success parameters before advancing.

**Recommended order:** P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8. P9 only if you want the greenfield demo lane.

---

# P1 — Implementer Realism

**Program refs:** Steps 141–150 · `FEATURE_TOOL_EXECUTION` · `packages/agents`, `packages/runtime`, `packages/sandbox`, gateway, Cursor bridge

## Discussion

This is the spine project. AgentOS already routes missions, dispatches implementer work (gateway / Cursor / mock), and applies patches — but the **tool loop** (Read → Grep → edit → test → fix) is mostly mocked. Without this project, AgentOS narrates development instead of performing it.

Key tensions to resolve upfront:

- **Gateway vs Cursor vs both:** Gateway is sandboxed and local; Cursor is powerful but external and billed.
- **Autonomy level:** Single-shot patch vs multi-iteration fix-verify loop.
- **Safety:** Every shell invocation must respect sandbox policy and Control Gate.

**Touches:** `packages/agents/src/implementer-dispatch.ts`, `patch-apply.ts`, `executor.ts`, `packages/runtime/src/index.ts`, `apps/gateway`, `apps/api/src/cursor-bridge.ts`, `configs/default-tools.yaml`, `configs/permissions.yaml`.

## Suggested course of action (default)

1. Enable tool broker behind `FEATURE_TOOL_EXECUTION` (off by default).
2. Implement Read/Grep/Shell as gateway-mediated tools with leases and audit events.
3. Wire tool results back into `executeAgentPipelineStep` / implementer dispatch.
4. Add fix-verify loop: on test failure, one bounded retry with envelope update.
5. Ship tests + one end-to-end mission that changes a file and passes `pnpm test` on a scoped package.

## Scope worksheet — copy/paste

```text
=== P1 IMPLEMENTER REALISM — SCOPE WORKSHEET ===

PROJECT PRIORITY (1=now, 9=later): 
TARGET COMPLETION (date or sprint): 

IMPLEMENTER MODES (check all that must work):
[ ] gateway only
[ ] cursor only  
[ ] gateway + cursor (cursor for code, gateway for verify)
[ ] mock must remain for CI/demo without credentials

TOOLS IN SCOPE (check all):
[ ] Read (file read within repo root)
[ ] Grep (ripgrep-style search)
[ ] Shell (allowlisted via gateway policy)
[ ] Write/Edit (patch apply — already partial)
[ ] Other: ___________

AUTONOMY:
Max tool-call iterations per run: ___
Max wall-clock minutes per implementer phase: ___
Fix-verify on test failure: [ ] yes, N retries: ___  [ ] no, human retry only

SAFETY:
Commands requiring Control Gate approval: ___________
Paths never writable (globs): ___________
Allowed repo roots: [ ] monorepo only  [ ] AGENTOS_OUTPUT_DIR too  [ ] other: ___

LLM FOR IMPLEMENTER:
[ ] Ollama local only
[ ] Cloud providers when FEATURE_CLOUD_PROVIDERS=true
[ ] Mock-only acceptable for merge gate

SUCCESS DEMO (one sentence — what must work in a live demo):
___________________________________________

OUT OF SCOPE (explicitly not doing in P1):
___________________________________________

BLOCKERS / DEPENDENCIES:
___________________________________________
```

## Revised scope (fill after worksheet)

| Field | Your answer | Plan impact |
|-------|-------------|-------------|
| Implementer modes | _[paste]_ | _[e.g. gateway primary, Cursor opt-in via env]_ |
| Tools | _[paste]_ | _[e.g. Read/Grep/Shell only; no network curl]_ |
| Autonomy | _[paste]_ | _[e.g. max 8 tool calls, 2 fix-verify retries]_ |
| Safety | _[paste]_ | _[e.g. gate on git push, chmod, rm]_ |
| Demo success | _[paste]_ | _[e.g. mission fixes failing test in packages/shared]_ |

## 10-step gameplan

| Step | Action | Success parameters (all required to advance) |
|------|--------|-----------------------------------------------|
| **1** | Audit current implementer path; document mock vs real gaps in a short note | Note exists; lists dispatch modes, patch-apply behavior, and `FEATURE_TOOL_EXECUTION` touchpoints |
| **2** | Define tool contract (`ToolRequest` / `ToolResult`) in `packages/shared` | Types exported; unit test for serialization; no runtime wiring yet |
| **3** | Implement Read + Grep via gateway (or dedicated tools endpoint) with repo-root guard | Tests pass; attempt to read outside repo root fails with audited error |
| **4** | Implement Shell broker through gateway `assessCommandPolicy` + lease ID in audit | Denied command blocked; allowed command returns stdout/stderr in audit event |
| **5** | Wire tools into implementer dispatch behind `FEATURE_TOOL_EXECUTION` | With flag off, behavior unchanged; with flag on, implementer step invokes at least one tool |
| **6** | Connect tool outputs to LLM loop (envelope update, compact summaries) | Run log shows tool calls; no full transcript dumped to memory |
| **7** | Add bounded fix-verify loop (test command → fail → retry) | Configurable max retries; exceeding max marks run `needs_attention` not silent pass |
| **8** | Cursor path parity (if in scope): tool results or dispatch metadata visible in Blackbox | Cursor mission shows dispatch id / status; errors surface in UI |
| **9** | Integration test: mission changes file + `pnpm test` passes on scoped package | Test in `packages/runtime` or `e2e`; runs in `pnpm test` |
| **10** | Update `PRODUCT_SUMMARY.md` + env example; demo script uses repo-fix mission | `pnpm acceptance:gate` green; demo mission documented |

---

# P2 — Quality Gates

**Program refs:** Steps 151–160 · QA, security-auditor, code-reviewer agents · Forge timeline · Discord embeds

## Discussion

Gates exist as runtime steps and mock reports, but operators cannot **see** gate outcomes clearly on the timeline or in Discord when something fails. This project makes the policy model tangible: QA ran, security flagged, review blocked — with evidence.

Semgrep and diff-based review are the main automation candidates; both should remain **read-only** per agent policy.

**Touches:** `packages/agents` (review-schedule, executor), `packages/runtime`, `apps/command-center` MissionTimeline, `apps/api/src/discord/embeds.ts`, `notify.ts`.

## Suggested course of action (default)

1. Define gate result schema (pass / warn / fail + artifacts).
2. Run semgrep (or `pnpm` lint/test as deterministic stand-in if semgrep not installed).
3. Add diff reviewer step using `git diff` output + profile-aware summary.
4. Render gate chips on MissionTimeline and Blackbox.
5. Post Discord card on gate failure with approve/waive/deny actions.

## Scope worksheet — copy/paste

```text
=== P2 QUALITY GATES — SCOPE WORKSHEET ===

PROJECT PRIORITY (1-9): 
TARGET COMPLETION: 

GATES IN SCOPE (check all):
[ ] QA (test/typecheck via gateway)
[ ] Security (semgrep or custom scanner)
[ ] Code review (diff reviewer)
[ ] All three

DETERMINISTIC TOOLS:
Semgrep: [ ] required  [ ] optional  [ ] skip (use pnpm test/lint only)
Semgrep rules path: ___________
Minimum diff size to trigger code review: ___ lines / ___ files

UI SURFACES (check all):
[ ] MissionTimeline gate chips
[ ] Blackbox gate detail panel
[ ] Discord failure card with actions
[ ] Control Gate integration for waive

FAILURE BEHAVIOR:
On gate fail: [ ] block run  [ ] warn and continue  [ ] operator choice per gate type
Waive allowed: [ ] never  [ ] with audit + human approve  [ ] Discord button only

OUT OF SCOPE:
___________________________________________

SUCCESS DEMO (one sentence):
___________________________________________
```

## Revised scope (fill after worksheet)

| Field | Your answer | Plan impact |
|-------|-------------|-------------|
| Gates | _[paste]_ | |
| Semgrep | _[paste]_ | |
| UI | _[paste]_ | |
| Failure behavior | _[paste]_ | |

## 10-step gameplan

| Step | Action | Success parameters |
|------|--------|-------------------|
| **1** | Document current gate flow in runtime (`executeReleaseGateCheck`, QA/security/review steps) | Sequence diagram or bullet flow matches code |
| **2** | Add `GateResult` type to `packages/shared` (status, gateId, summary, artifacts[]) | Type + test; runtime emits shape |
| **3** | Implement QA gate: run configured check via gateway; parse pass/fail | Failing test produces `fail` GateResult with log excerpt |
| **4** | Implement security gate (semgrep or agreed substitute) | Scanner output attached as artifact; pass/fail deterministic |
| **5** | Implement code-review gate on meaningful diff threshold | Below threshold skips; above runs reviewer agent + diff stats |
| **6** | Persist gate results on `mission_runs` or audit_events queryable by run id | `GET /runs/:id/gates` returns all gate results |
| **7** | MissionTimeline: render chips (pass/warn/fail) per gate | Storybook or component test; visible on demo run |
| **8** | Blackbox: expandable gate detail with artifacts | Operator can read failure reason without raw logs hunt |
| **9** | Discord: embed on gate fail with link to Blackbox + optional waive button | Test in `embeds.test.ts`; manual smoke optional |
| **10** | Write `docs/GATES.md`; add gate checks to acceptance gate or demo script | Doc merged; merge gate mentions gate API |

---

# P3 — Release Execution

**Program refs:** Steps 161–170 · release-manager · `packages/agents/src/release.ts` · `apps/api/src/github.ts` · Forge Release UI

## Discussion

Prepare/approve release gates and GitHub PR **API** exist; the loop often stops before **git commit, push, and PR creation** as default mission completion. This project closes the “software developer” outcome: merged-quality diff → approved → shipped.

Must respect `AGENTOS_AUTOPILOT_RELEASE`, `AGENTOS_REQUIRE_HUMAN_APPROVAL`, and no self-approval.

**Touches:** `packages/agents/release.ts`, `packages/runtime`, `apps/api/github.ts`, `apps/api/discord/mission-briefing.ts`, Forge dashboard/blackbox.

## Suggested course of action (default)

1. Document release flow (`RELEASE_FLOW.md`) aligned with env flags.
2. Implement `git commit` + `git push` via gateway on approve (branch policy enforced).
3. Call existing `createGitHubPullRequest` after push when autopilot enabled.
4. Add dedicated Release panel (or Blackbox section) showing branch, commits, PR URL.
5. Discord release card on success/failure.

## Scope worksheet — copy/paste

```text
=== P3 RELEASE EXECUTION — SCOPE WORKSHEET ===

PROJECT PRIORITY (1-9): 
TARGET COMPLETION: 

GIT BEHAVIOR:
Branch strategy: [ ] feature branch per mission  [ ] commit on current branch  [ ] other: ___
Commit author: [ ] operator git config  [ ] AgentOS bot identity  [ ] env AGENTOS_GIT_*
Push target: [ ] origin only  [ ] fork  [ ] no push (PR from local only — unlikely)

HUMAN GATES:
Release requires human approve: [ ] always  [ ] when AGENTOS_RELEASE_REQUIRE_HUMAN_APPROVAL  [ ] never
Autopilot PR (AGENTOS_AUTOPILOT_RELEASE): [ ] yes  [ ] no  [ ] dry-run only

GITHUB:
Repo: ___________  (default AGENTOS_GITHUB_REPO)
PR template sections needed: ___________
Create issue on mission start: [ ] yes  [ ] no

UI:
[ ] Release panel (new route or Blackbox tab)
[ ] Discord release card
[ ] Quick action "release" (exists — extend?)

OUT OF SCOPE:
___________________________________________

SUCCESS DEMO (one sentence):
___________________________________________
```

## Revised scope (fill after worksheet)

| Field | Your answer | Plan impact |
|-------|-------------|-------------|
| Branch strategy | _[paste]_ | |
| Human gates | _[paste]_ | |
| GitHub | _[paste]_ | |
| UI | _[paste]_ | |

## 10-step gameplan

| Step | Action | Success parameters |
|------|--------|-------------------|
| **1** | Map env flags to release behavior matrix | Table in `RELEASE_FLOW.md` draft |
| **2** | Gateway: allowlisted `git status`, `git add`, `git commit`, `git push` with policy tests | Destructive git commands still blocked or gated |
| **3** | Runtime: on `approve_release`, invoke commit with mission-derived message | Audit event `release.commit` with sha |
| **4** | Runtime: push to configured remote/branch | Failed push surfaces error on run; no silent success |
| **5** | Wire `createGitHubPullRequest` post-push when autopilot on | PR URL stored on run/mission record |
| **6** | API: expose release status endpoint fields (branch, sha, prUrl) | `GET /runs/:id/gates` or `/runs/:id` includes release block |
| **7** | Forge Release panel or Blackbox section | Operator sees prepare → approve → commit → PR states |
| **8** | Discord: release success/failure embed with PR link | Embed test; optional live smoke |
| **9** | E2E or integration test with mocked GitHub | No real push in CI; mock verifies call sequence |
| **10** | Finalize `RELEASE_FLOW.md` + `GATES.md` cross-links | Docs in `docs/`; linked from IMPLEMENTATION_BRIEF |

---

# P4 — Live Dev UX

**Program refs:** Steps 21–22, 185–186 · `GET /events` WebSocket · Command Center polling replacement

## Discussion

The API already streams snapshots on `/events`; the Command Center still polls. Operators perceive lag during active missions. This project makes Blackbox and timeline feel **live** — “what the dev team is doing right now.”

Secondary polish: error surfaces when API/tunnel offline, route consistency (MAX polish).

**Touches:** `apps/api/src/index.ts` (`/events`), `apps/command-center/src/lib/agentos-api.ts`, Forge components, `ForgeDashboardShell`.

## Suggested course of action (default)

1. Add WebSocket client hook with reconnect and backoff.
2. Subscribe on dashboard, missions, blackbox routes.
3. Merge events into existing store/adapters (fallback to poll if WS down).
4. Show connection indicator (live / polling / offline).
5. Reduce poll interval when WS connected; document behavior.

## Scope worksheet — copy/paste

```text
=== P4 LIVE DEV UX — SCOPE WORKSHEET ===

PROJECT PRIORITY (1-9): 
TARGET COMPLETION: 

ROUTES THAT MUST BE LIVE (check all):
[ ] /dashboard
[ ] /missions
[ ] /blackbox
[ ] /control-gate
[ ] all Forge routes

EVENT TYPES TO HANDLE:
[ ] run status changes
[ ] mission log lines
[ ] approval requests
[ ] gate results
[ ] quota warnings
[ ] other: ___________

FALLBACK:
If WebSocket fails: [ ] poll every ___s  [ ] show offline only  [ ] both

OFFLINE / TUNNEL:
Show banner when API unreachable: [ ] yes  [ ] no
flous.dev tunnel required for demo: [ ] yes  [ ] no

POLISH SCOPE (185-186):
[ ] full MAX polish all routes
[ ] live events only, polish later

OUT OF SCOPE:
___________________________________________

SUCCESS DEMO (one sentence):
___________________________________________
```

## Revised scope (fill after worksheet)

| Field | Your answer | Plan impact |
|-------|-------------|-------------|
| Routes | _[paste]_ | |
| Events | _[paste]_ | |
| Fallback | _[paste]_ | |

## 10-step gameplan

| Step | Action | Success parameters |
|------|--------|-------------------|
| **1** | Document `/events` payload shape from API source | Markdown or typed client interface |
| **2** | Create `useAgentOSEvents` hook (connect, reconnect, parse) | Unit test with mock WS server |
| **3** | Integrate hook in `ForgeDashboardShell` or top layout | Connection state available app-wide |
| **4** | Dashboard: apply run/mission updates from WS | Demo run progress updates without manual refresh |
| **5** | Blackbox: stream log/audit events | New log lines appear within 2s of emission |
| **6** | Control gate: approval cards appear on WS | Approval test does not require poll |
| **7** | Connection indicator + degraded mode banner | UI shows Live / Polling / Offline accurately |
| **8** | Disable or slow polling when WS healthy | Network tab shows reduced poll traffic |
| **9** | Playwright test: start mission, assert UI updates | E2E passes locally with stack up |
| **10** | Update DEMO_PREREQUISITES / acceptance notes | Docs mention WS requirement optional |

---

# P5 — Discord Test Parity + CI

**Program refs:** D-04–D-17 · `apps/api/src/discord/` · GitLab CI merge gate

## Discussion

Discord is a first-class control plane but test coverage is uneven — rich actions, outbox, registry, integration, and CI are gaps. This project hardens the operator plane so Discord changes do not regress silently.

**Touches:** `apps/api/src/discord/*.test.ts`, `.gitlab-ci.yml` (or repo CI config), `scripts/acceptance-gate.ps1`.

## Suggested course of action (default)

1. Add missing unit test files (D-04, D-08–D-11, D-09).
2. Add interactions integration test (D-13) with fixture payloads.
3. Add `discord-live-smoke.mjs` behind `DISCORD_LIVE_SMOKE=1` (D-16).
4. Wire `pnpm discord:test` into CI merge gate (D-17).
5. Optional: rich-actions E2E (D-14) if guild test harness exists.

## Scope worksheet — copy/paste

```text
=== P5 DISCORD TEST PARITY + CI — SCOPE WORKSHEET ===

PROJECT PRIORITY (1-9): 
TARGET COMPLETION: 

CI PLATFORM:
[ ] GitLab CI  [ ] GitHub Actions  [ ] both  [ ] local only for now

CI JOBS TO ADD (check all):
[ ] pnpm discord:test (unit)
[ ] pnpm discord:smoke:full (needs secrets — manual/nightly only)
[ ] DISCORD_LIVE_SMOKE optional job
[ ] full pnpm acceptance:gate

TEST WORK PACKAGES (check all missing WPs):
[ ] D-04 rich-action-buttons
[ ] D-08 outbox
[ ] D-09 rest 429 retry
[ ] D-10 registry/bootstrap
[ ] D-11 round-table/guides snapshots
[ ] D-13 interactions integration
[ ] D-14 rich-actions E2E
[ ] D-16 live-smoke script

SECRETS IN CI:
Discord token in CI: [ ] yes (protected)  [ ] no — mock only in CI

OUT OF SCOPE:
___________________________________________

SUCCESS DEMO (one sentence):
___________________________________________
```

## Revised scope (fill after worksheet)

| Field | Your answer | Plan impact |
|-------|-------------|-------------|
| CI platform | _[paste]_ | |
| Jobs | _[paste]_ | |
| WPs | _[paste]_ | |

## 10-step gameplan

| Step | Action | Success parameters |
|------|--------|-------------------|
| **1** | Inventory existing discord tests vs D-01–D-17 table | Gap list matches IMPLEMENTATION_BRIEF |
| **2** | Add `rich-action-buttons.test.ts` (D-04) | Tests pass; covers primary button types |
| **3** | Add `outbox.test.ts` (D-08) | Retry/drain behavior tested |
| **4** | Add `rest.test.ts` with 429 mock (D-09) | Backoff or retry asserted |
| **5** | Add `registry.test.ts` + bootstrap snapshot (D-10, D-11) | Snapshot stable or documented |
| **6** | Add `interactions.integration.test.ts` (D-13) | Full slash → handler path with fixtures |
| **7** | Create `discord-live-smoke.mjs` (D-16) | Runs with env flag; documented in DEMO_PREREQUISITES |
| **8** | Add CI job for `pnpm discord:test` (D-17) | MR pipeline fails on discord test regression |
| **9** | Optional D-14 E2E or defer with documented reason | Either test exists or explicit waiver in brief |
| **10** | Update acceptance-gate to call discord:test when CI=false local | Single command validates discord locally |

---

# P6 — Hosted Scale

**Program refs:** Steps 171–174 · Postgres · Redis/BullMQ · multi-worker · scheduler cron

## Discussion

Local MVP uses SQLite + worker poll. Hosted production needs durable writes to Postgres, Redis queue consumer, and safe multi-worker claim. This project is **not required** for single-machine dev but blocks real multi-instance deployment.

**Touches:** `packages/persistence`, `packages/queue`, `apps/worker`, `apps/scheduler`, `docker/`, `.env.example`.

## Suggested course of action (default)

1. Complete Postgres adapter write path for all mutation bundles.
2. Implement BullMQ consumer when `AGENTOS_QUEUE_BACKEND=redis`.
3. Worker uses `claimNextQueuedRun` with SKIP LOCKED semantics on Postgres.
4. Scheduler sets `nextRunAt` on routines after run.
5. Docker compose for api + worker + redis + postgres smoke.

## Scope worksheet — copy/paste

```text
=== P6 HOSTED SCALE — SCOPE WORKSHEET ===

PROJECT PRIORITY (1-9): 
TARGET COMPLETION: 

HOSTING TARGET:
[ ] Local docker compose only
[ ] Cloudflare tunnel + single VPS
[ ] Kubernetes
[ ] defer — SQLite fine for now

DATA:
Postgres required tables: [ ] all  [ ] missions/runs only  [ ] custom: ___
Redis: [ ] BullMQ  [ ] queue stub sufficient

WORKERS:
Number of worker instances: ___
Same machine as API: [ ] yes  [ ] no

SCHEDULER:
Cron accuracy needed: [ ] minute-level  [ ] hour-level  [ ] manual routines only

MIGRATION:
Existing SQLite data must migrate: [ ] yes  [ ] no  [ ] export/import script OK

OUT OF SCOPE:
___________________________________________

SUCCESS DEMO (one sentence):
___________________________________________
```

## Revised scope (fill after worksheet)

| Field | Your answer | Plan impact |
|-------|-------------|-------------|
| Hosting | _[paste]_ | |
| Workers | _[paste]_ | |
| Migration | _[paste]_ | |

## 10-step gameplan

| Step | Action | Success parameters |
|------|--------|-------------------|
| **1** | List all `PersistenceAdapter` methods; mark read vs write gaps for Postgres | Checklist doc |
| **2** | Implement missing Postgres writes for mission/run bundles | Integration test against testcontainer or docker pg |
| **3** | Queue: BullMQ producer on enqueue when `redis` backend | Job appears in Redis on mission start |
| **4** | Worker: BullMQ consumer replaces poll loop when configured | Worker processes job without API `/worker/process` |
| **5** | `claimNextQueuedRun` SKIP LOCKED on Postgres | Two workers do not claim same run (test) |
| **6** | Scheduler: update `nextRunAt` after routine execution | Due routines fire once per interval |
| **7** | `docker-compose.yml` (or extend docker/) for full stack | `docker compose up` brings api+worker+pg+redis healthy |
| **8** | Env docs: `DATABASE_URL`, `REDIS_URL`, `AGENTOS_QUEUE_BACKEND` | `.env.example` comments accurate |
| **9** | Run acceptance gate against docker stack | typecheck + test pass in compose context |
| **10** | Production deploy runbook draft (even if not executed) | `docs/hosting/` or troubleshooting section |

---

# P7 — Memory Curator

**Program refs:** Steps 178–180 · `packages/memory`, `packages/agents/memory-curator.ts`, memory queue UI

## Discussion

AgentOS policy: **memory is curated, not dumped**. Queue and curator agent exist; vector search and preference loops are shallow. This project improves long-horizon missions and operator trust.

**Touches:** `packages/memory`, `packages/agents/memory-curator.ts`, `.agentos/state/memory-queue.json`, `ForgeMemoryQueuePanel`, API `/memory/*`.

## Suggested course of action (default)

1. Define memory record types (fact, preference, risk, ownership).
2. Add local vector search (sqlite-vss, embedded, or file-based stub with upgrade path).
3. Curator proposes writes; operator approves via memory queue UI (exists).
4. Inject approved memories into context minimizer packet.
5. Decay policy via `AGENTOS_MEMORY_DECAY`.

## Scope worksheet — copy/paste

```text
=== P7 MEMORY CURATOR — SCOPE WORKSHEET ===

PROJECT PRIORITY (1-9): 
TARGET COMPLETION: 

VECTOR SEARCH:
[ ] Required for P7 done
[ ] Optional — keyword search enough for now
Backend preference: [ ] sqlite-vss  [ ] external pgvector  [ ] in-memory dev only

MEMORY TYPES (check all):
[ ] project facts (paths, commands)
[ ] code ownership
[ ] operator preferences
[ ] risk areas
[ ] mission outcomes

APPROVAL:
All memory writes require human approve: [ ] yes  [ ] auto-approve low risk  [ ] curator only

UI:
[ ] Forge memory queue panel (exists — extend)
[ ] Discord approve memory button
[ ] neither — API only

OUT OF SCOPE:
___________________________________________

SUCCESS DEMO (one sentence):
___________________________________________
```

## Revised scope (fill after worksheet)

| Field | Your answer | Plan impact |
|-------|-------------|-------------|
| Vector | _[paste]_ | |
| Types | _[paste]_ | |
| Approval | _[paste]_ | |

## 10-step gameplan

| Step | Action | Success parameters |
|------|--------|-------------------|
| **1** | Audit memory queue flow API → UI → curator agent | Flow doc matches code |
| **2** | Extend memory schema with type + source run id | Migration or schema version bump tested |
| **3** | Implement search backend (chosen in worksheet) | `searchMemories` returns ranked results |
| **4** | Curator agent proposes candidates post-mission | Queue entry created with preview text |
| **5** | Approve/dismiss updates durable store | Approved memory readable on next mission |
| **6** | Context minimizer pulls top-k approved memories | Envelope shows memory refs not full text dump |
| **7** | Decay: stale memories deprioritized or archived | Test with `AGENTOS_MEMORY_DECAY=true` |
| **8** | Forge panel shows queue with approve/dismiss | Manual UI test pass |
| **9** | Optional Discord notification for pending memory | If in scope; else documented skip |
| **10** | Update `.agentos/memory/` examples + risk-areas integration | Curator improves code-ownership-map usage |

---

# P8 — Ship

**Program refs:** Steps 187–190 · CI E2E · docker prod · `agentos-complete-v1.0.0` tag

## Discussion

Capstone project: prove the platform is releasable. Combines E2E in CI, production docker images, acceptance gate as merge requirement, and version tag. Depends partially on P1–P5 but can start docker/CI work in parallel.

**Touches:** `e2e/`, `playwright.config.ts`, `docker/`, CI config, `scripts/acceptance-gate.ps1`, `package.json` version.

## Suggested course of action (default)

1. CI job: install, typecheck, test, discord:test, agentos:validate-profiles.
2. CI job (optional/nightly): Playwright with `webServer`.
3. Production docker build for api, worker, gateway, command-center.
4. Dress-rehearsal: run full demo on clean machine checklist.
5. Tag `agentos-complete-v1.0.0` with release notes.

## Scope worksheet — copy/paste

```text
=== P8 SHIP — SCOPE WORKSHEET ===

PROJECT PRIORITY (1-9): 
TARGET COMPLETION: 
TAG NAME: [ ] agentos-complete-v1.0.0  [ ] other: ___________

CI:
Platform: ___________
E2E in every MR: [ ] yes  [ ] nightly  [ ] manual only
Required checks before merge: ___________

DOCKER:
[ ] api  [ ] worker  [ ] gateway  [ ] command-center  [ ] compose stack
Registry: ___________

RELEASE CRITERIA (check all required for tag):
[ ] pnpm acceptance:gate green
[ ] E2E demo.spec + acceptance.spec green
[ ] discord:smoke:full pass (manual OK)
[ ] Hosted tunnel demo (flous.dev) — optional
[ ] P1 implementer demo mission — optional

RELEASE NOTES AUDIENCE:
[ ] self  [ ] public GitHub  [ ] Discord post

OUT OF SCOPE:
___________________________________________
```

## Revised scope (fill after worksheet)

| Field | Your answer | Plan impact |
|-------|-------------|-------------|
| Tag | _[paste]_ | |
| CI | _[paste]_ | |
| Release criteria | _[paste]_ | |

## 10-step gameplan

| Step | Action | Success parameters |
|------|--------|-------------------|
| **1** | Define v1.0.0 release checklist from worksheet | Checklist in `docs/demo/` or release doc |
| **2** | CI: typecheck + test on every push/MR | Pipeline green on main |
| **3** | CI: add discord:test + validate-profiles | Same pipeline |
| **4** | CI: Playwright job with webServer (MR or nightly per scope) | E2E artifacts uploaded on failure |
| **5** | Docker: build all images locally without error | `docker build` scripts documented |
| **6** | Compose: smoke test api health + command-center load | One-command smoke script |
| **7** | Run dress-rehearsal on clean machine (WSL or Windows per DEMO_PREREQUISITES) | Checklist signed off |
| **8** | Fix gaps found in dress-rehearsal | All blocker items closed |
| **9** | Write release notes from PRODUCT_SUMMARY + changelog | Notes ready in `docs/` or GitHub release draft |
| **10** | Create git tag; verify acceptance:gate on tagged commit | Tag pushed; gate green |

---

# P9 — App Intake Polish (optional)

**Program refs:** Step 123 · `app_creation` · `GeneratedAppFrame` · `packages/app-generator`

## Discussion

Secondary lane only. Improves greenfield questionnaire → scaffold → **inspect in iframe** demo. Do not prioritize over P1–P3 unless demo audience cares about app scaffold more than repo development.

**Touches:** `apps/command-center` missions view, `packages/runtime/src/app-generation.ts`, preview API.

## Suggested course of action (default)

1. Wire preview URL into sandboxed iframe in GeneratedAppFrame.
2. postMessage bridge for inspect mode (element pick / feedback).
3. Feedback ties to regen API (partially exists).
4. Demo script mentions app_creation as optional path.

## Scope worksheet — copy/paste

```text
=== P9 APP INTAKE POLISH (OPTIONAL) — SCOPE WORKSHEET ===

PROJECT PRIORITY (1-9): 
TARGET COMPLETION: 

INCLUDE THIS PROJECT: [ ] yes  [ ] no — defer

INSPECT MODE:
[ ] iframe preview only
[ ] click-to-select component + feedback
[ ] full visual editor — OUT OF DEFAULT SCOPE

OUTPUT LOCATION:
AGENTOS_OUTPUT_DIR: ___________
Preview served from: [ ] API route  [ ] static export  [ ] other

REGEN:
Feedback → regen loop required: [ ] yes  [ ] nice-to-have

SUCCESS DEMO (one sentence):
___________________________________________
```

## Revised scope (fill after worksheet)

| Field | Your answer | Plan impact |
|-------|-------------|-------------|
| Include | _[paste]_ | If no, skip project |
| Inspect | _[paste]_ | |

## 10-step gameplan

| Step | Action | Success parameters |
|------|--------|-------------------|
| **1** | Confirm `app_creation` route still used in demos | If no, stop project |
| **2** | Preview API returns stable URL for generated scaffold | URL loads in browser |
| **3** | GeneratedAppFrame embeds iframe with CSP/sandbox attrs | No XSS; sandbox documented |
| **4** | postMessage protocol for inspect (if in scope) | Typed messages; unit test |
| **5** | Feedback form sends to regen endpoint | Regen creates new preview version |
| **6** | Mission record stores questionnaire + generation history | Visible in missions UI |
| **7** | Error state when output dir missing | Clear operator message |
| **8** | E2E: optional app_creation path in playwright | Test or explicit skip doc |
| **9** | Demo script section "optional app intake" | `demo.ps1` or DEMO_PREREQUISITES |
| **10** | If promoted: `APP_CREATION_FLOW.md`; else one paragraph in PRODUCT_SUMMARY | Doc decision recorded |

---

# Master reply template (all projects)

Paste this when you want to scope multiple projects in one pass:

```text
=== AGENTOS PROJECT SCOPING — MASTER REPLY ===

DATE:
DEFAULT IMPLEMENTER MODE (P1): gateway / cursor / both
DEFAULT HOSTING (P6): local / docker / defer
CI PLATFORM (P5/P8): GitLab / GitHub / local only

PROJECT ORDER (comma-separated): P1,P2,...

--- P1 ---
[paste P1 worksheet answers]

--- P2 ---
[paste P2 worksheet answers]

--- P3 ---
[paste P3 worksheet answers]

--- P4 ---
[paste P4 worksheet answers]

--- P5 ---
[paste P5 worksheet answers]

--- P6 ---
[paste P6 worksheet answers]

--- P7 ---
[paste P7 worksheet answers]

--- P8 ---
[paste P8 worksheet answers]

--- P9 ---
[paste P9 worksheet answers or "SKIP"]

CROSS-CUTTING NOTES:
___________________________________________
```

---

# After you reply — what happens next

1. **Revise** each project’s “Revised scope” table with your answers.
2. **Adjust** any 10-step row where your choices change order (e.g. skip Cursor in P1 → merge steps 8–9).
3. **Lock** success parameters — add/remove gates per your risk tolerance.
4. **Execute** one project at a time; treat steps as MR-sized chunks.

Linked docs: `PRODUCT_SUMMARY.md`, `IMPLEMENTATION_BRIEF.md`, `BUILD_PROGRESS.md`, `ACCEPTANCE_CRITERIA.md`.
