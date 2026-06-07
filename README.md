# AgentOS

AgentOS is a local-first AI agent operations dashboard for running, observing, and demoing coordinated agent workflows without depending on cloud credentials. The current MVP centers on an interactive Phaser office scene, React control panels, a safe Fastify API layer, local Ollama support, memory and audit surfaces, and mock-first integrations that stay usable when credentials are missing.

## Highlights

- Local-first demo experience with safe mock fallbacks by default
- Interactive command center built with Next.js, React, and Phaser
- Fastify API and gateway services for app and orchestration flows
- Local LLM support through Ollama for prompt and task execution
- Memory, logs, and audit-style visibility for agent activity
- Data-driven game interactions through `packages/game-schema`
- Shared contracts and types kept in `packages/shared`

## Monorepo Layout

### Apps

- `apps/command-center`: Next.js dashboard and Phaser office scene
- `apps/api`: Fastify API for local data, memory, and agent-facing actions
- `apps/gateway`: Gateway service for local routing and health checks
- `apps/worker`: Background worker entry point for task execution flows

### Packages

- `packages/game-schema`: Data-driven scene and interaction schema
- `packages/shared`: Shared contracts, types, and cross-app utilities
- `packages/memory`: Memory helpers and persistence logic
- `packages/orchestrator`: Agent workflow coordination logic
- `packages/agents`: Agent definitions and composition helpers
- `packages/token-manager`: Token and provider handling utilities
- `packages/tools`: Tooling interfaces for internal actions
- `packages/ui`: Shared UI building blocks
- `packages/config`: Shared configuration helpers
- `packages/sandbox`: Sandbox-related utilities

## Tech Stack

- `pnpm` workspaces
- `Next.js 15`
- `React 19`
- `Phaser 3`
- `Fastify 5`
- `TypeScript`
- `Vitest`
- `Ollama` for optional local model execution

## Getting Started

### Prerequisites

- Node.js 22+
- `pnpm`
- Optional: `Ollama` for local model-backed flows

### Install

```powershell
pnpm install
Copy-Item .env.example .env
```

### Initialize local data

```powershell
pnpm db:migrate
pnpm db:seed
```

### Validate the environment

```powershell
pnpm sanitize:check
pnpm env:check
pnpm typecheck
pnpm test
```

### Run the full local stack

```powershell
pnpm dev
```

Expected local URLs:

- Dashboard: `http://localhost:3000`
- API health: `http://localhost:8787/health`
- Gateway health: `http://localhost:8790/health`

## Environment Model

AgentOS is intentionally mock-first until real provider credentials and security rules are configured.

- If credentials are missing, the app should continue in mock or local mode
- Product-facing names should stay under the AgentOS identity
- Real autonomous execution should not be added without approval gates and audit events

See `.env.example` for the current environment surface.

## Local AI With Ollama

AgentOS can call a local Ollama model through `POST /llm/chat`.

Recommended setup:

```powershell
ollama serve
ollama pull qwen2.5-coder:7b
```

Set the following in `.env` when you want local model execution instead of the mock provider:

```env
AGENTOS_MODEL_PROVIDER=ollama
AGENTOS_DEFAULT_MODEL=qwen2.5-coder:7b
FEATURE_OLLAMA=true
```

## Discord Integration

The current Discord surface is intentionally safe and read-only.

Optional environment values:

```env
FEATURE_DISCORD=true
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
DISCORD_PUBLIC_KEY=
```

If those values are missing, the dashboard and API stay in mock mode without crashing.

## Demo Walkthrough

1. Start the local stack with `pnpm dev`.
2. Open the dashboard and click the highlighted office surfaces.
3. Open `Local AI Console` and run a prompt.
4. Open `Tasks`, queue a task, and run it with local AI.
5. Press `Run Demo Mission` to simulate a planner-to-builder-to-reviewer-to-memory flow.
6. Open `Logs`, `Memory`, and `Discord` to show the surrounding operational surfaces.

## Common Commands

```powershell
pnpm install
Copy-Item .env.example .env
pnpm dev
pnpm sanitize:check
pnpm env:check
pnpm typecheck
pnpm test
```

## Troubleshooting

- If the dashboard falls back to seed data, make sure the API is running on `8787`.
- If `/llm/chat` fails, verify Ollama is serving on `http://127.0.0.1:11434`.
- If Discord is not configured, the app should show mock or status behavior instead of throwing.
- If a Next.js chunk error appears during local dev, clear `apps/command-center/.next` and restart the dev server.

## Status

This repository is currently an MVP and demo environment. It is best suited for local development, workflow demos, UI iteration, and safe orchestration experiments before live provider rollout.
