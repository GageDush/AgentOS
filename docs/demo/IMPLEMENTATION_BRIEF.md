# AgentOS — Implementation Brief

Last updated: 2026-06-12  
Program target: **190-step conditional agent pathway** (Waves 0–16)

## Executive summary

AgentOS is a **local-first software development operator** — a control plane for running development missions on a real codebase through a conditional multi-agent pipeline with policy gates and human oversight.

The platform ships a working operator shell (Forge Command Center), mission runtime, sandboxed gateway, implementer dispatch (gateway / Cursor / mock), Discord command plane, release-manager gates, queue/scheduler scaffolds, and Playwright E2E. It is **~82% materially complete** against the 190-step plan.

**Core demo paths work** (typecheck mission, control gate, blackbox, Discord smoke). **Production hosted infra, real tool execution, and implementer depth** remain the main gaps before it feels like a full AI dev team rather than a mission narrator.

App questionnaire → scaffold → preview (`app_creation`) exists as a **secondary intake lane** — not the product center of gravity.

### Verification snapshot (latest green)

| Check | Result |
|-------|--------|
| `pnpm typecheck` | 19 packages pass |
| `pnpm test` | 142+ unit tests pass |
| `pnpm discord:test` | 41 Discord tests pass |
| `pnpm agentos:validate-profiles` | 16 profiles OK |

---

## What AgentOS is (product framing)

| Layer | Role |
|-------|------|
| **Core** | Repo development: routing, implementation, gateway commands, patch apply, QA/security/review, release/PR |
| **Control planes** | Forge UI, Discord (guild + `#operator-command` + `#cursor`), chat threads |
| **Policy** | Control gate, quota steward, no self-approval, release manager final gate |
| **Secondary** | `app_creation` intake — questionnaire + scaffold for greenfield UI experiments |

Default development loop:

```text
Admin → Classifier → Context? → Quota → Planner? → Specialists → QA? → Security? → Review? → Release?
```

Specialists include `code-implementer`, `architect-agent`, `backend-service-agent`, `frontend-ui-agent`, `docs-agent`, and others — invoked only when the route requires them.

Full product narrative: `docs/demo/PRODUCT_SUMMARY.md`.  
All-projects scoping form: `docs/demo/PROJECT_SCOPING_FORM.md`.  
Per-project worksheets + 10-step gameplans: `docs/demo/PROJECT_WORKSHEETS.md`.

---

## What has been built (by phase)

### Steps 1–10 — Baseline ✅ ~95%

- Monorepo scaffold, shared contracts, persistence (SQLite), env validation
- Agent profiles in `.agentos/agents/`, profile validator
- API health, dashboard contracts, demo prerequisites docs
- Acceptance criteria + build progress tracking

### Steps 11–20 — Operator shell ✅ ~85%

- Command Center dashboard with health panel, mission form, blackbox view
- Demo mission + typecheck gateway; worker structured logging
- API connection state (no silent empty UI when API offline)
- Mission filters, faster polling

### Steps 21–40 — Live UX / missions ✅ ~80%

- Pause/resume/retry; MissionTimeline; Control Gate UI
- Secondary routes (missions, approvals, operators, forge)
- Orchestrator routing fixtures; quota warnings
- **Gap:** WebSocket live events in UI (API has `/events`; UI still polls)

### Steps 41–60 — Gateway / chat ✅ ~75%

- Gateway deny-matrix; sandbox expansion; stuck-run recovery
- Rich-actions gate; command palette; archive search
- Chat intents (orchestrator `parseConversationalIntent`)
- Discord: slash commands, buttons, gateway chat, round-table, chat rooms
- **Gap:** Full conversational intent mirror in Discord for all control verbs

### Steps 61–80 — Agent realism / implementer 🟡 ~65%

- Mock narration, Ollama planner hooks, profile validation
- Classifier/QA gateway triggers; review/security mock paths
- Implementer dispatch: `gateway` | `cursor` | `mock`; patch apply scaffold
- **LLM executor (131–140):** profile-aware summaries, pipeline step (primary + QA + release)
- **Gap:** Real tool execution (Read/Grep/Bash); fix-verify loops; cloud provider lanes incomplete

### Steps 81–100 — Docs / demo ✅ ~85%

- Demo script, smoke script, FAQ, execution model doc
- `/mission/demo/run` → real mission + `processRun` + typecheck
- `pnpm acceptance:gate` script
- **Gap:** `COMPLETE_PATHWAY.md`, dress-rehearsal tag, full WSL checklist execution

### Steps 101–130 — App intake (secondary lane) ✅ ~85%

- `app_creation` types, questionnaire API (`generate` / `submit`)
- Runtime `runAppGenerationForMission`, preview API, feedback + regen
- GeneratedAppFrame in missions view
- **Gap:** Inspect mode iframe bridge (step 123); preference memory depth
- **Note:** Deprioritize vs implementer realism unless greenfield demo is the goal

### Steps 131–170 — LLM / tools / release 🟡 ~75%

**Done:**

- `packages/agents/src/llm.ts` — profile-aware LLM summaries
- `executeAgentPipelineStep` in runtime mock execution
- Release manager: `prepareReleaseReport`, gate prepare/approve, GitHub PR API
- Quick actions: `release`, `approve_release`; Blackbox gate UI

**Not done:**

- Real `packages/tools` execution (141–150)
- Code review gate, semgrep/diff reviewer (152–153)
- Gate chips on timeline (155); Discord gate failure cards (156)
- Git commit/push execution; dedicated Release panel (165)
- `GATES.md`, `RELEASE_FLOW.md`

### Steps 171–190 — Hosted / E2E / ship 🟡 ~70%

**Done:**

- `@agentos/queue` local + Redis stub; `@agentos/scheduler` routine poller
- Playwright E2E (`demo.spec.ts`, `acceptance.spec.ts`)
- API enqueues runs on mission start

**Not done:**

- Postgres adapter full write path
- BullMQ consumer (replace worker poll)
- Cron `nextRunAt` logic; multi-worker SKIP LOCKED
- CI E2E job; docker prod; tag `agentos-complete-v1.0.0`
- Vector memory + memory curator (178–180)
- MAX polish all routes (185–186)

---

## Discord coverage (D-01–D-17)

| WP | Status | Notes |
|----|--------|-------|
| D-01 interactions | ✅ | `interactions.test.ts` |
| D-02 interaction-respond | ✅ | defer/claim/callback mocks |
| D-03 commands | ✅ | slash handler tests |
| D-04 rich-action-buttons | ❌ | No parity test file |
| D-05 button-handlers | 🟡 | Partial expand |
| D-06 gateway | ✅ | reconnect/intent mocks |
| D-07 chat | 🟡 | `chat.test.ts`; no `messenger.test.ts` |
| D-08 persistence/outbox | ❌ | No `outbox.test.ts` |
| D-09 rest/client | ❌ | No 429 retry tests |
| D-10 registry/bootstrap | ❌ | No `registry.test.ts` |
| D-11 round-table/guides | ❌ | No snapshot tests |
| D-12 oauth | 🟡 | Partial auth-pages tests |
| D-13 interactions integration | ❌ | Not implemented |
| D-14 rich-actions E2E | ❌ | Not implemented |
| D-15 smoke:full | ✅ | `discord:smoke:full` |
| D-16 live-smoke | ❌ | No `discord-live-smoke.mjs` |
| D-17 CI | ❌ | `discord:test` not in GitLab CI merge gate |

**Operator lane:** `#operator-command` private channel — owner + bot only, control verb routing.

---

## Status legend

| Symbol | Meaning |
|--------|---------|
| ✅ Done | Materially implemented and tested |
| 🟡 Partial | Scaffold or happy-path only; needs hardening |
| ❌ Not started | No meaningful implementation |
| 🔧 Refine | Works but needs polish, docs, or production hardening |

---

## Still need to implement (developer-first priority)

1. **Tool execution (141–150)** — real Read/Grep/Shell broker with sandbox leases; wire into implementer loop
2. **QA/Security/Review gates (151–160)** — semgrep, diff reviewer, timeline chips, Discord gate cards
3. **Release execution (161–170)** — git commit/push, Discord release card, dedicated Release panel
4. **WebSocket UX (21–22)** — Command Center subscribes to `/events` for live dev visibility
5. **Hosted infra (171–174)** — Postgres writes, Redis queue consumer, cron scheduler
6. **Discord D-04–D-14, D-16–D-17** — test parity + integration + CI
7. **Memory curator (178–180)** — vector search + preference loops
8. **Ship (187–190)** — CI E2E, docker prod, v1.0.0 tag
9. **App intake polish (123)** — inspect iframe bridge; only if greenfield demo lane is a priority

---

## Still need to refine

- Implementer: tool-call loop, fix-verify on failing tests, correlation IDs
- LLM executor: cloud lanes when `FEATURE_CLOUD_PROVIDERS` enabled
- Demo playback polish — lead with typecheck/repo mission, not app scaffold
- Discord OAuth local + prod dual config
- Command Center MAX polish (185–186)
- Error surfaces when API/tunnel offline
- Chat room idle/release edge cases

---

## Not started

- `COMPLETE_PATHWAY.md`, `GATES.md`, `RELEASE_FLOW.md`
- `APP_CREATION_FLOW.md` (secondary; document only if intake lane is promoted)
- Production deploy runbook execution on target host
- Discord DM parity (182–184)
- `agentos-complete-v1.0.0` release tag

---

## Operator command channel

Private Discord lane: **`#operator-command`** (◈ OPS)

- Visible only to `DISCORD_OWNER_USER_ID` + AgentOS bot
- Natural language + control verbs (`status`, `pulse`, `approve`, `pause`, `mission …`, `help`)
- Falls back to Admin Agent LLM chat when no control intent matches

Setup:

```powershell
# Set your Discord user ID in .env
DISCORD_OWNER_USER_ID=your_discord_user_id

pnpm discord:setup-operator-channel
pnpm discord:post-brief
```

Requires `FEATURE_DISCORD=true`, `DISCORD_BOT_TOKEN`, API running for gateway chat.

---

## Merge gate (current)

```powershell
pnpm install
pnpm acceptance:gate
# Optional with stack:
$env:E2E_BASE_URL = "http://localhost:3000"
pnpm acceptance:gate
```

---

## Estimated path to 100%

| Milestone | Steps | Effort |
|-----------|-------|--------|
| Tool execution + implementer loop | 141–150 | ~3–5 days |
| Real gates + release git | 151–170 | ~3–4 days |
| WebSocket live UX | 21–22 | ~1 day |
| Discord test parity + CI | D-04–D-17 | ~2–3 days |
| Hosted Postgres/Redis | 171–174 | ~2–3 days |
| E2E CI + ship tag | 187–190 | ~1–2 days |

**Total remaining:** ~35 steps (~18% of program) — roughly **2–3 weeks** focused work on the developer spine. App intake polish is additive, not blocking.
