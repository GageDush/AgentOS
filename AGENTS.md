# AgentOS Agent Instructions

AgentOS is a local-first mock-mode MVP until real provider credentials and security rules are configured.

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
