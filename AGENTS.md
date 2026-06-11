# AgentOS Agent Instructions

AgentOS is a local-first mock-mode MVP until real provider credentials and security rules are configured.

## Conditional Pipeline

AgentOS uses a conditional agent graph, not a fixed assembly line. Do not load every profile for every task.

Default control flow:

```text
Admin Agent
-> Task Classifier
-> Context Minimizer, only if repo/docs context is needed
-> Quota Steward
-> Planner/Partitioner, only if moderate or complex
-> Specialist Agents, only as needed
-> QA, if code changed
-> Security, if risk triggers matched
-> Code Review, if meaningful diff exists
-> Release Manager, only for commit/PR/release
```

Core policy rules:

- Use compact task envelopes instead of full transcripts.
- Use deterministic commands before LLM interpretation whenever possible.
- Quota Steward chooses the cheapest adequate lane: deterministic, local, subscription, premium, or defer.
- Review and security agents are read-only by default.
- The implementer cannot self-approve.
- Release Manager performs the final gate before commit.
- Commit only in assisted/autopilot mode according to policy.
- The visual office / Phaser UI is out of scope unless explicitly requested.

## Commands

- Install: `pnpm install`
- Copy env on Windows: `Copy-Item .env.example .env`
- Dev: `pnpm dev`
- Checks: `pnpm sanitize:check`, `pnpm env:check`, `pnpm typecheck`, `pnpm test`

## Rules

- Keep product-facing names under the AgentOS identity.
- Default to mock/local behavior when credentials are missing.
- Do not add real autonomous execution without approval gates and audit events.
- Keep Phaser interactions data-driven through `packages/game-schema`.
- Keep API contracts in `packages/shared`.
- Agent profiles live in `.agentos/agents/` and contracts live in `.agentos/contracts/`.
- Validate the installed profile system with `pnpm agentos:validate-profiles`.
