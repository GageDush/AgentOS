# AgentOS — All-Projects Scoping Form

## Recommended: use the web form

Too many questions for one markdown block? Use the **multi-step wizard** (auto-save, one project per screen):

```powershell
pnpm scoping:form
```

Or serve it: `pnpm scoping:form:serve` → http://localhost:3456

To put it on a public URL: drag folder `docs/demo/scoping-form` to [Netlify Drop](https://app.netlify.com/drop).

Details: `docs/demo/scoping-form/README.md`

---

## Text fallback (manual)

Fill in every line below. Replace `___` with your answers. Change `[ ]` to `[x]` for selections. When done, copy the **FORM BODY** and paste into chat.

**Filled by:** _______________________  
**Date:** _______________________  
**Reference:** `PROJECT_WORKSHEETS.md` (10-step plans per project)

---

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- COPY FROM HERE ↓ (FORM BODY)                                      -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

```text
================================================================================
AGENTOS — ALL-PROJECTS SCOPING FORM
================================================================================

FILLED BY:
DATE:

--------------------------------------------------------------------------------
SECTION 0 — GLOBAL DEFAULTS
--------------------------------------------------------------------------------

Overall target (when should P1–P8 be done?): ___

Default implementer mode for AgentOS:  gateway / cursor / both / mock-only

Default hosting goal:  local-only / docker-compose / VPS+tunnel / k8s / defer

CI platform:  GitLab / GitHub Actions / both / local-only

Project execution order (comma-separated, e.g. P1,P2,P3,P4,P5,P8,P6,P7):
___

Projects to SKIP entirely (e.g. P9,P6): ___

Cross-cutting notes (budget, team size, must-ship-by, etc.):
___

================================================================================
P1 — IMPLEMENTER REALISM (spine)
Steps 141–150 · tools, fix-verify, gateway/Cursor dispatch
================================================================================

Include P1:  YES / NO / DEFER
Priority (1=now, 9=later): ___
Target completion: ___

IMPLEMENTER MODES (mark x):
[ ] gateway only
[ ] cursor only
[ ] gateway + cursor (cursor codes, gateway verifies)
[ ] mock must stay for CI/demo without credentials

TOOLS (mark x):
[ ] Read
[ ] Grep
[ ] Shell (gateway allowlist)
[ ] Write/Edit (patch apply)
[ ] Other: ___

AUTONOMY:
Max tool-call iterations per run: ___
Max wall-clock minutes (implementer phase): ___
Fix-verify on test failure:  YES (retries: ___) / NO (human retry only)

SAFETY:
Commands that require Control Gate approval: ___
Paths never writable (globs): ___
Allowed repo roots:
[ ] monorepo only
[ ] AGENTOS_OUTPUT_DIR too
[ ] other: ___

LLM FOR IMPLEMENTER (mark x):
[ ] Ollama local only
[ ] Cloud when FEATURE_CLOUD_PROVIDERS=true
[ ] Mock-only OK for merge gate

SUCCESS DEMO (one sentence):
___

OUT OF SCOPE:
___

BLOCKERS / DEPENDENCIES:
___

================================================================================
P2 — QUALITY GATES
Steps 151–160 · QA, security, code review, timeline, Discord
================================================================================

Include P2:  YES / NO / DEFER
Priority (1-9): ___
Target completion: ___

GATES (mark x):
[ ] QA (test/typecheck via gateway)
[ ] Security (semgrep or substitute)
[ ] Code review (diff reviewer)
[ ] All three

DETERMINISTIC TOOLS:
Semgrep:  required / optional / skip (use pnpm test/lint only)
Semgrep rules path: ___
Min diff to trigger code review: ___ lines OR ___ files

UI (mark x):
[ ] MissionTimeline gate chips
[ ] Blackbox gate detail panel
[ ] Discord failure card with actions
[ ] Control Gate waive integration

On gate FAIL:  block run / warn and continue / operator choice per gate
Waive allowed:  never / human approve + audit / Discord button only

SUCCESS DEMO (one sentence):
___

OUT OF SCOPE:
___

================================================================================
P3 — RELEASE EXECUTION
Steps 161–170 · git commit/push, PR, Release UI, Discord card
================================================================================

Include P3:  YES / NO / DEFER
Priority (1-9): ___
Target completion: ___

GIT:
Branch strategy:  feature branch per mission / current branch / other: ___
Commit author:  operator git config / AgentOS bot / env AGENTOS_GIT_*
Push target:  origin only / fork / no push

HUMAN GATES:
Release always needs human approve:  YES / NO / env-flag only
Autopilot PR (AGENTOS_AUTOPILOT_RELEASE):  yes / no / dry-run only

GITHUB:
Repo (default AGENTOS_GITHUB_REPO): ___
PR template must include: ___
Create GitHub issue on mission start:  YES / NO

UI (mark x):
[ ] Release panel (new route or Blackbox tab)
[ ] Discord release card
[ ] Extend existing quick action "release"

SUCCESS DEMO (one sentence):
___

OUT OF SCOPE:
___

================================================================================
P4 — LIVE DEV UX
Steps 21–22, 185–186 · WebSocket /events, connection state, polish
================================================================================

Include P4:  YES / NO / DEFER
Priority (1-9): ___
Target completion: ___

ROUTES that must be live (mark x):
[ ] /dashboard
[ ] /missions
[ ] /blackbox
[ ] /control-gate
[ ] all Forge routes

EVENT TYPES (mark x):
[ ] run status changes
[ ] mission log lines
[ ] approval requests
[ ] gate results
[ ] quota warnings
[ ] other: ___

If WebSocket fails:  poll every ___s / offline banner only / both

Offline API banner:  YES / NO
flous.dev tunnel required for demo:  YES / NO

POLISH (185–186):
[ ] full MAX polish all routes
[ ] live events only — polish later

SUCCESS DEMO (one sentence):
___

OUT OF SCOPE:
___

================================================================================
P5 — DISCORD TEST PARITY + CI
D-04–D-17 · unit tests, integration, CI merge gate
================================================================================

Include P5:  YES / NO / DEFER
Priority (1-9): ___
Target completion: ___

CI PLATFORM:  GitLab / GitHub Actions / both / local only

CI JOBS to add (mark x):
[ ] pnpm discord:test (unit)
[ ] pnpm discord:smoke:full (secrets — nightly/manual)
[ ] DISCORD_LIVE_SMOKE optional job
[ ] full pnpm acceptance:gate

TEST WORK PACKAGES (mark x):
[ ] D-04 rich-action-buttons
[ ] D-08 outbox
[ ] D-09 rest 429 retry
[ ] D-10 registry/bootstrap
[ ] D-11 round-table/guides snapshots
[ ] D-13 interactions integration
[ ] D-14 rich-actions E2E
[ ] D-16 live-smoke script

Discord token in CI:  YES (protected vars) / NO (mock only)

SUCCESS DEMO (one sentence):
___

OUT OF SCOPE:
___

================================================================================
P6 — HOSTED SCALE
Steps 171–174 · Postgres, Redis/BullMQ, multi-worker, scheduler
================================================================================

Include P6:  YES / NO / DEFER
Priority (1-9): ___
Target completion: ___

HOSTING TARGET (mark one):
[ ] local docker compose only
[ ] Cloudflare tunnel + single VPS
[ ] Kubernetes
[ ] defer — SQLite fine for now

DATA:
Postgres tables:  all / missions+runs only / custom: ___
Redis:  BullMQ required / stub OK for now

WORKERS:
Number of worker instances: ___
Workers on same machine as API:  YES / NO

SCHEDULER:
Cron accuracy:  minute / hour / manual routines only

Migrate existing SQLite data:  YES / NO / export script OK

SUCCESS DEMO (one sentence):
___

OUT OF SCOPE:
___

================================================================================
P7 — MEMORY CURATOR
Steps 178–180 · vector search, approval queue, context injection
================================================================================

Include P7:  YES / NO / DEFER
Priority (1-9): ___
Target completion: ___

VECTOR SEARCH required for P7 done:  YES / NO (keyword search enough)

Backend preference (mark one):
[ ] sqlite-vss
[ ] external pgvector
[ ] in-memory dev only

MEMORY TYPES (mark x):
[ ] project facts (paths, commands)
[ ] code ownership
[ ] operator preferences
[ ] risk areas
[ ] mission outcomes

All memory writes need human approve:  YES / auto low-risk / curator only

UI (mark x):
[ ] extend Forge memory queue panel
[ ] Discord approve memory button
[ ] API only

SUCCESS DEMO (one sentence):
___

OUT OF SCOPE:
___

================================================================================
P8 — SHIP
Steps 187–190 · CI E2E, docker prod, release tag
================================================================================

Include P8:  YES / NO / DEFER
Priority (1-9): ___
Target completion: ___

TAG NAME:  agentos-complete-v1.0.0 / other: ___

E2E in every MR:  YES / nightly / manual only
Required checks before merge: ___

DOCKER IMAGES (mark x):
[ ] api
[ ] worker
[ ] gateway
[ ] command-center
[ ] full compose stack
Container registry: ___

RELEASE CRITERIA — all required for tag (mark x):
[ ] pnpm acceptance:gate green
[ ] E2E demo.spec + acceptance.spec green
[ ] discord:smoke:full (manual OK)
[ ] hosted tunnel demo flous.dev
[ ] P1 implementer demo mission

Release notes audience:  self / public GitHub / Discord post

SUCCESS DEMO (one sentence):
___

OUT OF SCOPE:
___

================================================================================
P9 — APP INTAKE POLISH (optional — secondary lane)
Step 123 · iframe inspect, app_creation demo
================================================================================

Include P9:  YES / NO / SKIP

Priority (1-9): ___
Target completion: ___

INSPECT MODE (mark x):
[ ] iframe preview only
[ ] click-to-select component + feedback
[ ] full visual editor (usually OUT OF SCOPE)

AGENTOS_OUTPUT_DIR: ___
Preview served from:  API route / static export / other: ___

Feedback → regen loop:  required / nice-to-have

SUCCESS DEMO (one sentence):
___

================================================================================
SECTION Z — SIGN-OFF
================================================================================

Biggest risk if we ship without finishing checked projects:
___

Single metric that means "AgentOS is a real software developer" to me:
___

Anything else:
___

================================================================================
END OF FORM — paste everything above this line back for revised gameplans
================================================================================
```

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- COPY TO HERE ↑ (FORM BODY)                                        -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

---

## Quick priority matrix (optional — fill after main form)

| Project | Include? | Priority 1–9 | Target date |
|---------|----------|--------------|-------------|
| P1 Implementer | | | |
| P2 Quality gates | | | |
| P3 Release | | | |
| P4 Live UX | | | |
| P5 Discord CI | | | |
| P6 Hosted scale | | | |
| P7 Memory | | | |
| P8 Ship | | | |
| P9 App intake | | | |

---

## After you submit

Paste the filled **FORM BODY** in chat. You will receive:

1. Revised scope table per included project  
2. Adjusted 10-step gameplans from `PROJECT_WORKSHEETS.md`  
3. Recommended MR order and dependencies  
