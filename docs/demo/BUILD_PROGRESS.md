# AgentOS 190-Step Build Progress

Last updated: 2026-06-12 (product framing: software development operator).

AgentOS is a **software development operator** — missions on a real codebase through a conditional agent pipeline. App intake (steps 101–130) is a secondary lane. See `PRODUCT_SUMMARY.md`.

## Summary by phase

| Steps | Target | Status | Completion |
|-------|--------|--------|------------|
| 1–10 | Baseline | 🟢 Done | ~95% |
| 11–20 | Operator shell | 🟢 Mostly done | ~85% |
| 21–40 | Live UX / missions | 🟢 Mostly done | ~80% |
| 41–60 | Gateway / chat | 🟢 Mostly done | ~75% |
| 61–80 | Agent realism / tests | 🟡 Partial | ~65% |
| 81–100 | Docs / demo | 🟢 Mostly done | ~85% |
| 101–110 | App intake (secondary) | 🟢 Done | ~90% |
| 111–130 | App scaffold / feedback (secondary) | 🟢 Mostly done | ~85% |
| 131–170 | LLM / tools / release | 🟢 Mostly done | ~80% |
| 171–190 | Hosted / E2E / ship | 🟡 Partial | ~70% |

**Overall program: ~82% of 190 steps materially implemented.**

## Delivered — final waves

### LLM executor (131–140)
- ✅ Profile-aware `buildProfileAwareSummary` reads `.agentos/agents/*.md`
- ✅ `FEATURE_AGENT_LLM` + `FEATURE_OLLAMA` lanes
- ✅ Runtime uses `executeAgentPipelineStep` (primary + QA + release) in mock execution

### Release Manager (161–170)
- ✅ `prepareReleaseReport` + release-manager executor step
- ✅ Runtime `executeReleaseGateCheck` (prepare → approve → `gate.release_passed`)
- ✅ Quick actions: `release`, `approve_release`
- ✅ API: `GET /runs/:id/gates`, `POST .../release/prepare|approve`, `POST .../release/pr`
- ✅ GitHub: `createGitHubPullRequest`, `buildPullRequestBody`
- ✅ Blackbox UI: gate status + prepare/approve release

### Demo + acceptance (81–100, 189–190)
- ✅ `/mission/demo/run` creates real mission + `processRun` (typecheck)
- ✅ `demo-smoke.ps1` aligned to `{ run, mission, result }`
- ✅ `pnpm acceptance:gate` — typecheck, test, profiles, discord, optional smoke/E2E

### Queue + scheduler (173–174)
- ✅ `@agentos/queue` — local + redis stub backend
- ✅ `@agentos/scheduler` — polls due routines via API
- ✅ API enqueues runs on mission start

### E2E (187–188)
- ✅ Playwright `webServer` for API + Command Center
- ✅ `e2e/demo.spec.ts`, `e2e/acceptance.spec.ts`

## Remaining (hosted production)

- Full BullMQ Redis consumer (replace worker poll when `AGENTOS_QUEUE_BACKEND=redis`)
- Postgres adapter write path (hosted `AGENTOS_DATABASE_URL`)
- Live Discord rich-action E2E (D-14–D-16)
- Production deploy runbook execution on target host

## Merge gate

```powershell
pnpm install
pnpm acceptance:gate
# With stack running + E2E:
$env:E2E_BASE_URL = "http://localhost:3000"
pnpm acceptance:gate
```
