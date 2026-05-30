# AgentOS

AgentOS is a local-first AI agent operations dashboard. The current demo build combines a Phaser office scene, React control panels, a safe Fastify API, local Ollama integration, demo mission playback, memory/audit logging, and a Discord status scaffold.

## Setup

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm sanitize:check
pnpm env:check
```

## Run

```powershell
pnpm dev
```

Expected URLs:

- Dashboard: http://localhost:3000
- API health: http://localhost:8787/health
- Gateway health: http://localhost:8790/health

## Local Ollama

AgentOS can now call Ollama through `POST /llm/chat`.

Recommended local setup:

```powershell
ollama serve
ollama pull qwen2.5-coder:7b
```

Set in `.env` when you want real local AI instead of the mock provider:

```env
AGENTOS_MODEL_PROVIDER=ollama
AGENTOS_DEFAULT_MODEL=qwen2.5-coder:7b
FEATURE_OLLAMA=true
```

## Discord

The current pass keeps Discord intentionally safe and read-only.

Optional env values:

```env
FEATURE_DISCORD=true
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
DISCORD_PUBLIC_KEY=
```

If those values are missing, the dashboard and API stay in mock mode without crashing.

## Demo Walkthrough

1. Open the dashboard and click the highlighted office surfaces.
2. Open `Local AI Console` and run a prompt.
3. Open `Tasks` and queue a task, then run it with local AI.
4. Press `Run Demo Mission` to simulate a planner -> builder -> reviewer -> memory flow.
5. Open `Logs`, `Memory`, and `Discord` to show the supporting systems around the mission.

## Troubleshooting

- If the dashboard falls back to seed data, make sure the API is running on `8787`.
- If `/llm/chat` fails, verify Ollama is serving on `http://127.0.0.1:11434`.
- If Discord is not configured, the app should show mock/status behavior instead of throwing.
