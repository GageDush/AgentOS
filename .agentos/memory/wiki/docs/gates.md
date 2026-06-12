---
slug: docs/gates
title: GATES
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# GATES

Source: `docs/GATES.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Quality Gates

## Gate types

| Gate | Trigger | Deterministic check |
|------|---------|---------------------|
| **qa** | Code changed | `pnpm typecheck`, `pnpm test` via gateway |
| **security** | Risk triggers | `git diff` + optional `semgrep` (`.semgrep.yml`) |
| **code_review** | Meaningful diff (≥20 lines or 2 files) | Diff reviewer agent + stats |
| **approval** | Risky command / sandbox | Control Gate human decision |
| **release** | Commit/PR path | Release manager prepare → approve → ship |

## API

- `GET /runs/:id/gates` — required, passed, pending gates + `releasePrepared`
- Gate audit events: `gate.qa_passed`, `gate.security_passed`, `gate.qa_failed`, etc.

## Operator behavior

- **On fail:** configurable per mission — block, warn, or operator choice (Gage scope: operator choice)
- **Waive:** human approve + audit via Control Gate or Discord rich action

## UI

- Mission timeline `gateChips` on Forge steps
- Blackbox: audit metadata includes gate artifacts (`stderr`, `command`, `exitCode`)

See `packages/runtime/src/index.ts` → `executeDeterministicGateCheck`, `getRunGateStatus`.

## Related

- [[index]]
- [[areas/repo-layout]]
