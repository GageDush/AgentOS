# AgentOS — Gated implementation pipeline (post B/C/D)

**Last updated:** 2026-06-16  
**Branch:** `pivot/agentos-local-command-center`  
**Audience:** Claude (Cowork / Design) — autonomous execution, no operator option-picking

Use **`chatbox.txt`** to paste. This file is the full pipeline reference.

---

## Operator directive

Execute **all stages below in order**. Do **not** ask the operator to choose between options. Do **not** skip a stage because the prior one “looks done” — run the gate checklist and record pass/fail.

**Stop only when:** a gate fails after two fix attempts, or a gate requires credentials the operator must provide (list exactly what).

**One PR per stage** (or one PR per stage group if tiny). Commit messages: conventional (`feat`, `fix`, `chore`).

---

## Visual QA baseline (Cursor, 2026-06-16) — treat as Gate 0 input

| Check | Result | Active port |
|-------|--------|-------------|
| `GET /control-gate` | **200** — ForgeNav rail, KPI empty state “All caught up”, rich-message Approve/Deny, Run Inspector | **3003** (override) |
| `GET /wiki?view=map` | **200** — Map tab selected, React Flow **200 nodes / 722 links**, category chips, search, zoom; node click → inspector “Open article” | 3003 |
| `pnpm llm:smoke` | **PASS** — `/llm/routes`, `/llm/chat` (Ollama), `/llm/activity` | API :8787 |
| `pnpm typecheck` + `pnpm test` + `command-center build` | **PASS** | — |

**Infra debt (Stage 0 must address):**

- Zombie Node still holds `:3000`; override escalated `3002 → 3003`
- `repair-stack-force.ps1` must not call admin-only `repair-cloudflare-tunnel.ps1` directly (use `agentos-control -Action StartWithTunnel`)
- `llm-smoke.mjs` had libuv crash on `process.exit` on Windows — fixed to `process.exitCode` (verify in Gate 0)
- Duplicate `POST /llm/chat` was merged by Cursor — do not reintroduce

**Read active UI port before browsing:**

```powershell
Get-Content .agentos/state/command-center-port.override  # if present
```

---

## Pipeline overview

```text
Gate 0  → Stack stability + smoke scripts green
Stage 1 → LLM caller-swap (providers.ts + agents/llm.ts → routeLlmCall)
Stage 2 → Router health in Settings / health bar
Stage 3 → Wiki Map QA fixes (only if Gate 3 checklist finds gaps)
Stage 4 → Control Gate QA fixes (only if Gate 3 checklist finds gaps)
Stage 5 → Stack port canonicalization (stop zombie / single port story)
Stage 6 → LLM router docs + AGENTS.md + optional CI smoke job
```

---

## Gate 0 — Stack stability (do first)

**Goal:** One reliable UI port; all smokes green on Windows.

**Tasks:**

1. Run `pnpm stack:repair` (or improve it) until:
   - `GET http://127.0.0.1:<ui-port>/` → 200
   - `GET http://127.0.0.1:<ui-port>/control-gate` → 200
   - `GET http://127.0.0.1:<ui-port>/wiki?view=map` → 200
   - `GET http://127.0.0.1:8787/health` → 200
2. Confirm `pnpm llm:smoke` exits **0** (no libuv assertion)
3. If port override > 3000, document in `.agentos/state/README.md` (one paragraph)

**Gate 0 PASS when all true:**

- [ ] `pnpm typecheck` — exit 0
- [ ] `pnpm test` — exit 0
- [ ] `pnpm -C apps/command-center build` — exit 0
- [ ] `pnpm llm:smoke` — exit 0
- [ ] UI routes above return 200 on the **same** `<ui-port>`
- [ ] No duplicate `POST /llm/chat` in `apps/api/src/index.ts`

**On FAIL:** fix and re-run Gate 0 (max 2 attempts). Do not start Stage 1 until PASS.

---

## Stage 1 — LLM caller-swap (core choke point)

**Goal:** Satisfy LLM router spec acceptance #6 — no direct Ollama bypass outside router.

**Files:**

- `apps/api/src/providers.ts` — delegate `chat()` to `routeLlmCall` (preserve `LlmChatResponse` shape)
- `packages/agents/src/llm.ts` — use `routeLlmCall` for `local_ollama` lane
- `packages/llm-router/src/index.ts` — extend only if needed

**Out of scope:** LiteLLM Docker, cloud keys, mission runtime refactor beyond `llm.ts`

**Gate 1 PASS when all true:**

- [ ] `pnpm test` — exit 0 (especially `packages/agents`, `apps/api/providers.test.ts`, `packages/llm-router`)
- [ ] `pnpm llm:smoke` — exit 0; chat still returns Ollama lane when `FEATURE_OLLAMA=true`
- [ ] `pnpm mission:smoke` — exit 0 (if available in repo)
- [ ] No second `POST /llm/chat` handler
- [ ] Usage events still appended on successful chat

**On FAIL:** fix router integration; do not proceed to Stage 2.

---

## Stage 2 — Router health readout (UI)

**Goal:** Operator can see router mode + Ollama/LiteLLM health without curl.

**Spec ref:** `docs/design/llm-router-litellm-handoff/prompt.md` implementation plan step 7

**Suggested surface:** `/settings` or existing health strip in `ForgeDashboardShell` / `AgentOSLocalApp`

**Show:**

- Router mode (`AGENTOS_LLM_ROUTER_MODE` or default `local-first`)
- `GET /llm/routes` health: ollama up/down, litellm up/down (if enabled)
- Link to `pnpm llm:litellm:setup` docs when litellm disabled

**Gate 2 PASS when:**

- [ ] Settings (or health) shows live data from `/llm/routes` when API up
- [ ] Degraded state when API down (no crash)
- [ ] Orange Forge styling; no new blue/violet primaries
- [ ] `pnpm typecheck` exit 0

---

## Stage 3 — Wiki Map QA fixes (conditional)

**Run this checklist in browser on `/wiki?view=map`:**

- [ ] Map tab loads < 60s cold start
- [ ] ≥ 50 nodes visible; cap banner if > 200
- [ ] Click node → inspector title + in/out counts
- [ ] Double-click node → opens article in browse view
- [ ] Category chip filters graph
- [ ] Search dims non-matches
- [ ] `prefers-reduced-motion` disables transitions (already in `wiki-graph.css` — verify)

**If all checked:** Stage 3 = **SKIP** (log “Wiki Map QA clean” in PR description).

**If any fail:** fix in `apps/command-center/src/components/forge/wiki/*` only; re-run checklist until pass.

**Gate 3 PASS:** checklist all true OR explicitly skipped with evidence.

---

## Stage 4 — Control Gate QA fixes (conditional)

**Run on `/control-gate` with API live:**

- [ ] KPI row: Awaiting / High risk / Agents waiting / Signed in
- [ ] Empty state when no pending approvals
- [ ] With pending approvals (seed or real): gate cards show verb(target), risk chip, Approve once / For mission / Deny
- [ ] Approve all visible when count > 1
- [ ] Rich message card + actions wired
- [ ] Nav badge count matches home when pending exist
- [ ] Run Inspector still visible on this route

**If all checked:** Stage 4 = **SKIP**.

**If any fail:** fix `ForgeControlGateView.tsx` + `forge-control-gate.css` only (no API changes).

**Gate 4 PASS:** checklist all true OR skipped with evidence.

**Note:** QA on 2026-06-16 had **zero pending approvals** — gate card actions were not exercised live. If possible, use `pnpm mission:smoke` or mock pending data to verify buttons once.

---

## Stage 5 — Stack port canonicalization

**Goal:** Reduce port override churn (`3000` zombie → `3002` → `3003`).

**Tasks:**

1. Improve `scripts/agentos-control.ps1` `Stop-Stack` to kill launcher **trees** (already started — verify on Windows)
2. Add `scripts/stack-port-status.ps1` (or `pnpm stack:port`) printing: override file, listeners on 3000/3002/3003, cloudflared ingress port
3. When kill succeeds: remove `command-center-port.override`, reset `~/.cloudflared/config.yml` UI ingress to `.env` `AGENTOS_COMMAND_CENTER_PORT`
4. Document reboot-as-last-resort in `.agentos/state/README.md`

**Gate 5 PASS when:**

- [ ] `pnpm stack:restart` leaves single UI listener on configured port
- [ ] `stack:port` script exists and runs
- [ ] README documents override + cleanup

---

## Stage 6 — Docs + CI hook

**Tasks:**

1. `AGENTS.md` — add `pnpm llm:smoke`, `pnpm stack:repair`, active port note
2. `docs/design/llm-router-litellm-handoff/prompt.md` — mark Phase 1 acceptance items done
3. Optional: GitHub Actions job `llm-smoke` (mock/Ollama-only, `continue-on-error` if no Ollama in CI)

**Gate 6 PASS when:**

- [ ] Docs merged; no stale “pick Option A or B” language in active handoffs
- [ ] `pnpm agentos:validate-profiles` still passes if touched agents

---

## Hard constraints (all stages)

1. Orange Forge — no blue/violet Halo primaries
2. No approval semantics changes without explicit operator request
3. No Postgres migration; no autonomous execution without gates
4. Do not batch unrelated P2 page ports (missions, agents, etc.)
5. Verify on Windows; sandbox cannot kill elevated Node — use `pnpm stack:repair`
6. Wiki manifest: run `pnpm wiki:meta-reset` before commit if only timestamps drift

---

## Key paths

| Area | Path |
|------|------|
| Control Gate UI | `apps/command-center/src/components/forge/ForgeControlGateView.tsx` |
| Wiki Map | `apps/command-center/src/components/forge/wiki/` |
| LLM router | `packages/llm-router/src/index.ts` |
| API LLM routes | `apps/api/src/index.ts` (~`/llm/*`) |
| Stack repair | `scripts/repair-stack-force.ps1`, `pnpm stack:repair` |
| Port override | `.agentos/state/command-center-port.override` |
| Router spec | `docs/design/llm-router-litellm-handoff/prompt.md` |

---

## Suggested Claude opener (autonomous)

> Run the gated pipeline in `docs/design/forge-post-bcd-gated-pipeline/prompt.md` from Gate 0 through Stage 6. Do not ask me to pick options. Stop only if a gate fails twice or you need credentials. One PR per stage.
