---
slug: docs/agentos_session_context
title: AGENTOS SESSION CONTEXT
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# AGENTOS SESSION CONTEXT

Source: `docs/AGENTOS_SESSION_CONTEXT.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Session Context (compressed handoff)

Read this first in new agent sessions instead of replaying long chat history.

## Consolidated conversation briefs

| Topic | Doc |
|-------|-----|
| Forge dashboard, URLs, agent placards, art assets | `.agentos/memory/wiki/product/forge-command-center-consolidated.md` |
| All Cursor sessions (auto-synced) | `.agentos/memory/wiki/sessions/cursor/index.md` |
| Rolling Cursor digest | `.agentos/memory/wiki/flows/cursor-memory.md` |

Sync Cursor chats into wiki: `pnpm wiki:sync-cursor` (or `--full`).

## Product

- **AgentOS Local** = canonical product: isolated, self-run command center; must operate offline (mock/Ollama/gateway) when APIs are off.
- **Office / Phaser surface** = removed from this checkout; Claude is handling the replacement path.
- **Repo:** `GageDush/AgentOS`, branch `pivot/agentos-local-command-center`, commit `7ae4724+`.

## Locked decisions (2026-06-11)

| Topic | Decision |
|-------|----------|
| North star | Local-first solo dev tool + demoable from home PC |
| Models | Ollama default; escalate to Anthropic / OpenAI Codex / Cursor per Quota Steward |
| GitHub | Opt-in UI checkbox → issue on `GageDush/AgentOS`; `gh` authenticated |
| Hosting | PC + **Cloudflare Tunnel** (free); exit Railway; Neon/Postgres later |
| PR policy | CI on `pivot/*`; merge when green |
| Task envelopes | Full `docs/AGENTOS_TOKEN_OPTIMIZATION_SPEC.md` |
| Quota | Separate buckets per provider; warn at **80%**; stop file per stopped agent; resume queue via Quota Steward → Admin |
| Cursor billing | Monthly pool reset aligned to user's Cursor dashboard billing date |

## Architecture (current)

- `apps/command-center` — Next.js UI
- `apps/api` — Fastify (:8787)
- `apps/gateway` — allowlisted commands (:8790)
- `apps/worker` — local run poller
- `packages/persistence` — SQLite + repository (`agentos-local.db`)
- `packages/runtime` — missions, approvals, chat, quick actions
- `packages/orchestrator` — routing + intent
- `.agentos/agents/` — 16 profiles + contracts

## Validation

[code block omitted]

## Ollama models

- Installed: `qwen2.5-coder:7b` (default implementer)
- Also pull: `nomic-embed-text`, `qwen2.5-coder:3b` (fast classify)

## Quota Steward (implementation target)

Provider configs from official subscription docs (not metered API as default):

- **

## Related

- [[index]]
- [[areas/repo-layout]]
