# AgentOS functionalization program

Autonomous, gate-driven implementation of the functionalization gameplan (phases 0–7).

## Machine artifacts

| Path | Purpose |
|------|---------|
| `.agentos/functionalization/manifest.json` | Phases, tasks, gate commands, chain prompts |
| `.agentos/state/functionalization-state.json` | Progress pointer + history |
| `.agentos/state/functionalization-envelopes/` | Emitted task prompts |
| `scripts/functionalization-runner.mjs` | Driver (interactive + SDK) |
| `scripts/functionalization/gates.mjs` | Security and completion gates |

## Operating modes

### Interactive (Cursor chat)

```bash
pnpm functional:start     # task 0.1 kickoff
# implement → pnpm functional:gates → pnpm functional:next
pnpm functional:prompt    # reprint current task
pnpm functional:status
```

Windows clipboard helper:

```powershell
pnpm functional:start     # via scripts/functionalization-runner.ps1 if wired
```

### Autonomous (Cursor SDK)

Requires `CURSOR_API_KEY` in `.env` (see `apps/api` / `@cursor/sdk`).

```bash
pnpm functional:run       # one task: implement → gates → advance
pnpm functional:loop      # repeat until program complete
```

Environment:

- `AGENTOS_FUNCTIONAL_MAX_CYCLES` — default 50
- `AGENTOS_FUNCTIONAL_LOOP_PAUSE_MS` — pause between cycles (default 5000)
- `AGENTOS_CURSOR_MODEL` — default `composer-2.5`

## Phase order

1. **phase-0** — Baseline, auth matrix, functional profile
2. **phase-1** — P0 security (auth guard, SSRF, hardening)
3. **phase-2** — Real LLM + pipeline + tools
4. **phase-3** — Token/cost + budget stop
5. **phase-4** — Migrations, FKs, hot-path SQL
6. **phase-5** — UI port determinism + route smoke
7. **phase-6** — Truthful LIVE panels
8. **phase-7** — Review automation + `/system-review`

## Gate types

Each task defines:

- **functionality** — tests/smokes must pass
- **performance** — latency/concurrency checks (when applicable)
- **security** — `functional:gate:auth`, `functional:gate:scraper`

Phase-level gates run on `pnpm functional:gates` alongside task gates.

## Completion

```bash
pnpm functional:complete   # all manifest tasks marked done in state
```

Final acceptance: operator loop with auth, real model path, cost accounting, stable persistence, truthful UI, daily review persisted.

## Relation to project wave

`pnpm project:wave` drives demo P1–P10 product projects. **Functionalization** is the platform hardening track — run this first for production readiness.
