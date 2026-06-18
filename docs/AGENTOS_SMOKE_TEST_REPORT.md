# AgentOS — Smoke Test Report

**Repository root:** `C:\Users\gaged\Documents\AgenOS`
**Audit type:** Review-only forensic smoke test (no source changes)
**Date:** 2026-06-16
**Environment:** Windows 11 Pro · Node `v24.16.0` · pnpm `9.15.4` · git branch `main` (HEAD `9bbbb0f6`)

> Note: `package.json` declares `packageManager: pnpm@9.15.4`. README/CLAUDE.md state "Node 22+". Audit ran on Node 24.16.0 with no failures, so Node 24 is compatible in practice.

---

## 0. Method & Safety

All commands were run **locally, read-only**, using **only scripts that exist** in `package.json`. No command was run that sends external network traffic with real credentials, deploys, mutates remote state, or executes untrusted payloads. The live Discord/LLM/tunnel smokes (`discord:live-smoke`, `llm:smoke`, `tunnel:repair`, `tool:smoke:live`) were **deliberately NOT run** because they require live credentials / external services. `node_modules` was already installed (no `pnpm install` needed).

---

## 1. Commands Run — Results

| # | Command | Result | Exit | Blocks local dev? | Blocks prod? |
|---|---------|--------|------|-------------------|--------------|
| 1 | `pnpm typecheck` (`pnpm -r typecheck`) | **PASS** — all 14 workspaces `tsc --noEmit` clean | 0 | No | No |
| 2 | `pnpm test` (`pnpm -r test`, Vitest) | **PASS** — 89 test files, 278 tests, 0 failures | 0 | No | No |
| 3 | `pnpm env:check` (`node scripts/validate-env.mjs`) | **PASS** — "AgentOS env check passed using .env." | 0 | No | No |
| 4 | `pnpm sanitize:check` (`node scripts/sanitize-agentos.mjs`) | **PASS** — "sanitization passed across 858 product-facing files." | 0 | No | No |
| 5 | `pnpm build` (`pnpm -r build`) | **PASS** — all packages build; Next.js `apps/command-center` "✓ Compiled successfully in 5.0s" | 0 | No | No |

**Headline: the repo is green.** Typecheck, the full unit/integration suite, env validation, sanitization, and a production build all pass cleanly on a fresh checkout with no code changes.

---

## 2. Detail — `pnpm test` breakdown (278 tests / 89 files, all passing)

| Workspace | Test files | Tests | Notes |
|-----------|-----------:|------:|-------|
| `apps/api` | 34 | 88 | Heaviest: 26 Discord files (bot interactions, OAuth, embeds, outbox, verify, gateway WS), providers, session, store, memory-wiki |
| `packages/agents` | 15 | 33 | Pipeline, tool-broker, implementer dispatch, tool loops, QA gate, patch-apply, golden-path |
| `packages/orchestrator` | 9 | 38 | Lane router, planner-score, intake, context-minimizer, pipeline-bench |
| `packages/memory` | 7 | 25 | Wiki sync, chatgpt-planning, redact |
| `packages/shared` | 6 | 18 | Domain types / feature flags |
| `packages/runtime` | 4 | 28 | Gate checks, app-generation, **mission-execution-smoke**, index |
| `apps/gateway` | 3 | 7 | Tools, repo-root, index |
| `packages/ui` | 4 | 5 | Component smoke |
| `packages/persistence` | 1 | 23 | Adapter behavior |
| `packages/llm-router` | 1 | 5 | Router logic (mocked fetch) |
| `packages/sandbox` / `queue` / `token-manager` / `app-generator` / `apps/worker` | 1 each | 2/2/2/1/1 | Policy, queue, budget, scaffold, worker tick |

**Test character:** predominantly unit/integration with **heavy mocking** (fetch and SDKs stubbed). True end-to-end validation lives in the (separately invoked) smoke scripts and Playwright e2e, which were not run in this pass.

---

## 3. Detail — `pnpm build`

- `tsc --noEmit` / `tsc -b` clean across all packages.
- `apps/command-center` (`next build`): **Compiled successfully in 5.0s**, 103 kB shared First Load JS.
- Route output confirms the static/SSG split observed in the UI audit: `/preview/forge` (1.91 kB) and `/scraper` (6.52 kB) carry real component weight; the operational routes (`/missions`, `/operators`, `/routines`, `/settings`, `/loadout`, `/wiki`) are 175–187 B shells that hydrate the shared `AgentOSLocalApp` client bundle (176 kB) and fetch data client-side.

---

## 4. App-runtime inspection (UI/route load)

**The live dev stack (`pnpm dev` / `pnpm stack:background`) was NOT started in this pass** — it spawns 4 long-running services + a Next dev server and is not needed to reach a verdict given the clean build. Route/data wiring was instead established by static analysis (see `AGENTOS_ARCHITECTURE_MAP.md` §5 and `AGENTOS_FEATURE_MATRIX.md`). Key facts that a live run would confirm:

- The UI talks to the Fastify API at `:8787` via a Next rewrite proxy `/agentos-api/*` (`apps/command-center/next.config.mjs:91-104`).
- WebSocket-first realtime via `/agentos-api/events` with automatic fallback to 5s `/dashboard` polling, then "offline" (`apps/command-center/src/lib/use-agentos-events.ts:52-91`).
- When the API is down, the **home `/`** silently renders seed/placeholder data with the banner "API offline — showing placeholder data" (`useForgeHomeData.ts:168-186`); the operational shell shows an offline banner + boot loader instead.
- Expected URLs (per README): Dashboard `http://localhost:3000`, API health `http://localhost:8787/health`, Gateway health `http://localhost:8790/health`.

A follow-up live smoke is recommended (see §6) but is not a blocker for the conclusions here.

---

## 5. Notable observations surfaced during smoke

| Observation | Severity | Evidence | Recommended fix |
|-------------|----------|----------|-----------------|
| **Live secrets present in on-disk `.env`** (OpenAI, Anthropic, `GH_TOKEN`, Discord bot token, Cursor key, IcePanel, SESSION_SECRET) | **High** | Integrations audit read `.env` and reported non-empty, real-length keys. `.env` is gitignored and `.semgrep.yml` blocks committing it. | Rotate keys if this machine/image is ever shared; move to a secret manager; confirm `.env` never enters a backup zip (note `Documents/AgentOS-Backups/*.zip`, `Downloads/AgentOS_Project_Bundle.zip`). |
| **OpenAI/Anthropic keys are present but unused by code** | Medium | No `openai`/`@anthropic-ai`/`api.openai.com` references in source; only reachable via the disabled LiteLLM path. | Either remove the dead keys or wire/justify them; reduces blast radius. |
| **Gateway command allow-list ⇄ alias map drift** | Low | `apps/gateway/src/index.ts:13-26` aliases vs `packages/sandbox/src/index.ts:24-33` auto-allow set are out of sync (`git log`/`pnpm build` allowed by policy but no alias; `git diff --stat` aliased but not policy-allowed). | Reconcile the two lists; add a test asserting parity. |
| **`pnpm lint` is allow-listed but no root `lint` script exists** | Low | `package.json` has no `lint` script; gateway alias/policy both reference `pnpm lint`. | Add an ESLint config + `lint` script, or remove `lint` from the allow-list. |
| **CI runs with `AGENTOS_SEMGREP_GATE=false` and tier-2 classifier off** | Low | `.github/workflows/ci.yml:34-41`. The semgrep security gate that ships "required" in `.env.example` is disabled in CI. | Make the semgrep gate blocking in CI once stabilized. |

---

## 6. Recommended (not-run) follow-up smokes

These require a running stack and/or credentials and were intentionally skipped:

1. `pnpm dev` then `GET http://localhost:8787/health`, `:8790/health`, load `http://localhost:3000` and click through `/missions → create → run`, `/control-gate`, `/blackbox`, `/wiki`, `/scraper`. Verify no console/server errors and that data is live (not the seed-fallback banner).
2. `pnpm mission:smoke` and `pnpm tool:smoke` (both safe, mock-lane, and already in CI) — re-confirm locally.
3. `pnpm test:e2e` (Playwright; boots a real mock-mode stack) — non-blocking in CI, worth a local clean run.
4. With Ollama running: `pnpm llm:smoke` to confirm the only "real intelligence" path.

---

## 7. Verdict

**Local development readiness: strong.** Every existing check passes on a clean checkout with no edits. There were **no broken scripts, no dependency conflicts, and no build failures** in the read-only smoke set. The only material findings are operational/security hygiene (secrets at rest, two minor allow-list inconsistencies, a missing `lint` script), not correctness blockers.
