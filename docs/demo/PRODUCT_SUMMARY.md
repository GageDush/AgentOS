# AgentOS — Product Summary

Last updated: 2026-06-12

## What AgentOS is

AgentOS is a **local-first software development operator** — not an app builder.

You give it development work on a real codebase (fix a bug, implement a feature, run checks, review a diff, prepare a release). It routes that work through a **conditional multi-agent pipeline** with sandboxed execution, human approval gates, and audit trails. You operate it from the **Forge Command Center**, **Discord**, or the **Cursor bridge** — all surfaces attach to the same mission runtime.

The core loop is development, not generation:

```text
Mission → classify route → context → implement (gateway / Cursor) → test/typecheck → gates → release
```

AgentOS is deliberately **mock-mode by default**: without LLM keys, cloud providers, or Discord tokens it still runs end-to-end with deterministic fallbacks. Policy beats autonomy — reviewers do not implement, implementers cannot self-approve, and the Release Manager is the final gate before commit or PR.

Think of it as **an AI dev team you operate** — with Blackbox visibility into routing, agent steps, gates, and audit events.

---

## What it is not

AgentOS is **not** primarily a no-code app generator. The questionnaire → scaffold → preview path (`app_creation` mission type) is a **secondary demo/intake lane**, not the product identity. The registry and pipeline center on implementer, architect, repo-cartographer, QA, security, reviewer, and release-manager agents — a **dev pipeline on your repo**.

The retired Phaser office game is explicitly out of scope unless requested.

---

## End-state vision

| Capability | Target behavior |
|------------|-----------------|
| **Repo development** | Missions change real code via gateway, patch apply, or Cursor SDK dispatch |
| **Conditional agents** | 16+ profiles invoked only when needed — not a fixed assembly line |
| **Safe execution** | Gateway allowlists commands; tool broker for Read/Grep/Shell with sandbox leases |
| **Human gates** | Control Gate for risky commands; release prepare/approve; Discord approve/deny |
| **Multi-surface ops** | Forge UI, Discord guild + operator lanes, `#cursor` channel |
| **Release-aware completion** | Diff → review → human approve → commit/PR — not export-and-done |
| **Hosted production** | Postgres, Redis/BullMQ, multi-worker, Cloudflare tunnel, CI E2E |
| **Memory curation** | Vector search and preference loops — not raw transcript dumps |
| **App intake (secondary)** | Questionnaire scaffold for greenfield UI experiments when explicitly routed |

---

## Current build status

**Overall: ~82% of the 190-step program materially implemented.**

| Phase | Steps | Status | ~% |
|-------|-------|--------|-----|
| Baseline | 1–10 | Done | 95% |
| Operator shell | 11–20 | Mostly done | 85% |
| Live UX / missions | 21–40 | Mostly done | 80% |
| Gateway / chat | 41–60 | Mostly done | 75% |
| Agent realism | 61–80 | Partial | 65% |
| Docs / demo | 81–100 | Mostly done | 85% |
| App intake (secondary) | 101–130 | Mostly done | 85% |
| LLM / tools / release | 131–170 | Mostly done | 80% |
| Hosted / E2E / ship | 171–190 | Partial | 70% |

**Verification snapshot (documented green):**

| Check | Result |
|-------|--------|
| `pnpm typecheck` | 19 packages pass |
| `pnpm test` | 142+ unit tests pass |
| `pnpm discord:test` | 41 Discord tests pass |
| `pnpm agentos:validate-profiles` | 16 profiles OK |
| Playwright E2E | `e2e/demo.spec.ts`, `e2e/acceptance.spec.ts` |
| Merge gate | `pnpm acceptance:gate` |

Most completed work is **dev-ops infrastructure** (runtime, gates, Discord, release scaffolds). The largest gap versus “software developer” is **implementer realism** — tool loops, multi-file changes, and closing the git commit/PR loop.

---

## Strong vs weak (developer lens)

| Strong today | Still thin |
|--------------|------------|
| Mission runtime, routing, orchestrator | Real tool execution (Read/Grep/Shell loop) |
| Gateway (git, pnpm test/typecheck) | Deep multi-file implementation beyond mock narration |
| Implementer dispatch (gateway / Cursor / mock) | Autonomous fix-verify loops on failing tests |
| Release gates, GitHub PR API | Git commit/push as default mission completion |
| Control gate, approvals, audit | Code review automation (semgrep, diff reviewer) |
| Discord operator lane, Cursor `#cursor` channel | WebSocket live events in UI (API has `/events`; UI polls) |
| Blackbox run visibility | Hosted Postgres/Redis production path |

---

## Work clusters (developer-first priority)

1. **Implementer realism (141–150)** — tool broker, patch-verify loop, Cursor/gateway as primary path
2. **Quality gates (151–160)** — semgrep, diff review, timeline gate chips, Discord failure cards
3. **Release execution (161–170)** — git commit/push, dedicated Release panel, `GATES.md` / `RELEASE_FLOW.md`
4. **Live dev UX (21–22, 185–186)** — WebSocket `/events` in Command Center; Blackbox as “what the dev team did”
5. **Discord test parity + CI (D-04–D-17)** — operator-plane hardening
6. **Hosted scale (171–174)** — Postgres writes, BullMQ consumer, multi-worker
7. **Memory curator (178–180)** — vector search, preference loops
8. **Ship (187–190)** — CI E2E, docker prod, v1.0.0 tag
9. **App intake polish (123)** — inspect iframe bridge; only if greenfield demo lane matters

Clusters 1–3 are the spine. App intake (9) is optional polish.

---

## Architecture at a glance

```text
Operator (Forge / Discord / Chat)
        │
        ▼
   API :8787 ── WebSocket /events, missions, gates, release
        │
   ┌────┴────┬──────────────┐
   ▼         ▼              ▼
Worker    Gateway :8790   Discord / GitHub / Cursor
   │      (sandbox cmds)
   ▼
Runtime → Orchestrator → Agents (conditional pipeline)
   │
   ▼
SQLite (.agentos/state/) — Postgres/Redis for hosted path
```

**Monorepo:** 5 apps (`api`, `command-center`, `gateway`, `worker`, `scheduler`), 12 packages (`runtime`, `agents`, `orchestrator`, `persistence`, …), agent profiles in `.agentos/agents/`.

---

## Risk areas

- `apps/api/src/discord/` — outbound webhooks and operator approvals
- `packages/persistence/` — durable state and approval bundles
- `packages/runtime/` — mission execution and sandbox gates
- `.env` — local secrets; never commit

---

## Merge gate

```powershell
pnpm install
pnpm acceptance:gate
# Optional with stack:
$env:E2E_BASE_URL = "http://localhost:3000"
pnpm acceptance:gate
```

See also: `IMPLEMENTATION_BRIEF.md`, `BUILD_PROGRESS.md`, `ACCEPTANCE_CRITERIA.md`, `PROJECT_WORKSHEETS.md`, `SCOPING_RESPONSE.md` (Gage 2026-06-12).
