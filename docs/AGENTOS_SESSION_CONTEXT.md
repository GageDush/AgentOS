# AgentOS Session Context (compressed handoff)

Read this first in new agent sessions instead of replaying long chat history.

## Product

- **AgentOS Local** = canonical product: isolated, self-run command center; must operate offline (mock/Ollama/gateway) when APIs are off.
- **Office Demo** = archived only at `/demo/office`; do not invest unless asked.
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

```powershell
pnpm db:migrate
pnpm agentos:validate-profiles
pnpm sanitize:check
pnpm env:check
pnpm typecheck
pnpm test
pnpm dev
```

## Ollama models

- Installed: `qwen2.5-coder:7b` (default implementer)
- Also pull: `nomic-embed-text`, `qwen2.5-coder:3b` (fast classify)

## Quota Steward (implementation target)

Provider configs from official subscription docs (not metered API as default):

- **Anthropic Pro:** rolling 5h + rolling 7d weekly
- **OpenAI Codex (Plus):** shared 5h window + weekly
- **Cursor Pro:** monthly included pool; reset on billing date; track spending %

Stop files: `.agentos/stops/{agent-id}/stop.json` + queue for steward/admin resume.

## Next implementation queue

1. Smoke test + Ollama pulls
2. CI: `pivot/*` + `agentos:validate-profiles`
3. Wire full task envelopes (orchestrator → persistence)
4. Quota Steward v1 + dashboard warnings
5. GitHub issue opt-in checkbox

## Out of scope unless asked

Phaser office polish, Discord bot, multi-worker hosted execution, metered API without caps, committing secrets.
