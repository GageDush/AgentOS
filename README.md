# AgentOS

AgentOS is a local-first AI agent operations dashboard. The MVP is an interactive Phaser office that opens React control panels for agents, tasks, memory, token usage, approvals, logs, Discord mock controls, and settings.

## Local MVP

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm sanitize:check
pnpm env:check
pnpm dev
```

Expected URLs:

- Dashboard: http://localhost:3000
- API health: http://localhost:8787/health
- Gateway health: http://localhost:8790/health

## Current Scope

- Mock-mode API, worker, and gateway.
- Phaser office with clickable zones.
- React overlay panels.
- Memory and token/credit manager data models.
- Approval and audit-log endpoints.
- Discord mock-mode endpoint surface.

Real LLM calls, production Discord, GitHub automation, and secure tool execution are intentionally deferred until the local skeleton is stable.
