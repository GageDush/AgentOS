---
slug: planning/chatgpt/agentos-master-codex-prompt
title: AgentOS Master Codex Prompt
tags: [chatgpt, planning, og-board, bundle-git]
valid_from: 2026-06-12
---
# AgentOS Master Codex Prompt
OG AgentOS planning material from the ChatGPT project board.
## Metadata
- Source path: `AgentOS_Project_Bundle/AGENTOS_MASTER_CODEX_PROMPT.md`
- Source kind: bundle-git
- ChatGPT project: [AgentOS planning board](https://chatgpt.com/g/g-p-6a1a7068c4688191830b4109f595a807-agentos/project)
- Updated: 2026-06-12T13:48:22.815Z
## Outline

- AgentOS Master Codex Prompt
- Product identity
- Core concept
- Hard requirements
- Required repo structure
- Required app stack
- Phaser dashboard requirements
- API endpoints
- WebSocket events
- Default agents
- Memory system
- Token/credit system
## Content
# AgentOS Master Codex Prompt

Read this file completely and implement AgentOS according to this specification.

Build a runnable local MVP, not just documentation.

## Product identity

Product: AgentOS  
Dashboard: AgentOS Command Center  
Runtime: AgentOS Runtime  
Gateway: AgentOS Gateway  
Operator: AgentOS Operator  
Default team: AgentOS Production Team  
CLI: `agentos`  
Environment prefix: `AGENTOS_`

## Core concept

AgentOS is a local-first AI agent operations platform with a Phaser-based interactive pixel-art office dashboard.

The main dashboard is an office environment. Agents, desks, rooms, boards, terminals, server racks, and system objects are clickable. Clicking them opens React/HTML control panels connected to the backend.

Discord acts as the mobile control surface.

## Hard requirements

1. Create a full pnpm TypeScript monorepo.
2. Use AgentOS branding everywhere.
3. Build dashboard, API, worker, gateway stub, config system, memory system, token/credit management, sanitization scanner, database setup, seed data, first-run scripts, docs, and CI workflows.
4. Default to mock/local provider mode so the app runs without API keys.
5. Enforce sanitization: no inherited source/project names outside legal/reference files.
6. Implement memory management with structured memory and vector-ready storage.
7. Implement token/credit management with usage tracking, estimated cost tracking, quota limits, warnings, and hard stops.
8. Add approval gates and audit logging.
9. Add Discord bot/mobile-control skeleton.
10. Add Phaser office dashboard with clickable interactions.
11. Add README, first-run docs, troubleshooting docs, and AGENTS.md.
12. Run install/build/test/sanitization commands that are possible.
13. Fix errors encountered.
14. Do not claim anything works unless it was actually tested.

## Required repo structure

```text
agentos/
  apps/
    command-center/
    api/
    worker/
    gateway/

  packages/
    agents/
    orchestrator/
    tools/
    memory/
    token-manager/
    sandbox/
    config/
    shared/
    game-schema/
    ui/

  configs/
    agentos.context.yaml
    default-agents.yaml
    default-tools.yaml
    permissions.yaml
    models.yaml

  prompts/
    operator.md
    product.md
    architect.md
    builder.md
    qa.md
    security.md
    reviewer.md
    docs.md
    release.md

  scripts/
    bootstrap.sh
    first-run.sh
    sanitize-agentos.ts
    validate-env.ts

  docs/
    overview.md
    architecture.md
    first-run.md
    troubleshooting.md
    phaser-office.md
    memory-and-token-systems.md
    legal/
      SOURCE_REFERENCES.md
      THIRD_PARTY_NOTICES.md

  docker/
    api.Dockerfile
    command-center.Dockerfile
    worker.Dockerfile
    gateway.Dockerfile

  .github/
    workflows/
      sanitize.yml
      ci.yml

  package.json
  pnpm-workspace.yaml
  docker-compose.yml
  .env.example
  README.md
  AGENTS.md
```

## Required app stack

Frontend:
- Next.js
- React
- Phaser
- Zustand or equivalent small state store
- Tailwind/shadcn-style panel design if practical

Backend:
- Fastify or NestJS
- WebSocket or Socket.IO
- Postgres
- Redis + BullMQ

Memory:
- Postgres structured memory
- vector-ready tables
- keyword/mock search in MVP

Discord:
- discord.js or HTTP interaction endpoint skeleton
- mock mode allowed if no Discord credentials

## Phaser dashboard requirements

The office dashboard must be the main screen.

Required scenes:

```text
BootScene
PreloadScene
OfficeScene
HudScene
InteractionScene
```

Required clickable targets:

```text
AgentOS Operator sprite
Builder Agent sprite
QA Agent sprite
Security Agent sprite
Product Agent sprite
Mission board
Task pipeline board
Finance/token station
Knowledge/memory station
Security station
QA station
DevOps station
Server rack
Settings terminal
Discord/comms station
System status panel
```

Required React panels:

```text
AgentPanel
TaskPanel
MissionBoardPanel
MemoryPanel
TokenManagerPanel
SystemHealthPanel
ApprovalPanel
LogsPanel
DiscordPanel
SettingsPanel
```

Use a data-driven interaction registry.

```ts
export type OfficeInteractable = {
  id: string;
  label: string;
  kind: "agent" | "station" | "board" | "system" | "room" | "prop";
  x: number;
  y: number;
  width: number;
  height: number;
  action: string;
  panel: string;
};
```

## API endpoints

```text
GET  /health
GET  /agents
GET  /agents/:id
GET  /tasks
POST /tasks
GET  /tasks/:id
GET  /runs
GET  /runs/:id

GET  /memory
POST /memory
POST /memory/search
POST /memory/:id/archive
POST /memory/:id/attach-agent
POST /memory/:id/attach-task

GET  /usage
GET  /usage/summary
GET  /usage/budgets
POST /usage/budgets
PATCH /usage/budgets/:id
GET  /usage/alerts
POST /usage/mock-event

GET  /approvals
POST /approvals/:id/approve
POST /approvals/:id/deny

GET  /audit
GET  /system
```

## WebSocket events

```text
agent.status.changed
task.created
task.updated
run.started
run.step.completed
approval.required
approval.resolved
token.warning
token.hard_stop
memory.created
system.health.changed
discord.command.received
```

## Default agents

The AgentOS Production Team includes:

```text
AgentOS Operator
Product Agent
Architect Agent
Builder Agent
QA Agent
Security Agent
Reviewer Agent
Docs Agent
Release Agent
```

## Memory system

Implement:

```text
memories
memory_chunks
memory_links
agent_memory_index
task_memory_index
```

Memory types:

```text
project_memory
agent_memory
task_memory
user_preference
tool_result
document_chunk
decision_log
error_pattern
```

MVP memory search may use keyword search. Schema must be ready for embeddings/pgvector later.

Acceptance criteria:

```text
[ ] Memory can be created.
[ ] Memory can be searched.
[ ] Memory can be attached to agents/tasks.
[ ] Agent panels show relevant memories.
[ ] Memory search works in mock/local mode.
```

## Token/credit system

Implement:

```text
usage_events
usage_budgets
usage_alerts
model_prices
provider_accounts
```

Track:

```text
provider
model
prompt_tokens
completion_tokens
total_tokens
estimated_cost
task_id
agent_id
run_id
daily_budget
monthly_budget
hard_limit
warning_threshold
```

Before every real LLM call:

```text
1. Estimate cost.
2. Check daily budget.
3. Check monthly budget.
4. Check per-agent/per-task budget.
5. Block if hard stop is exceeded.
6. Warn if threshold crossed.
7. Record usage after call.
```

Acceptance criteria:

```text
[ ] Mock usage is tracked.
[ ] Usage appears in dashboard.
[ ] Budgets can be configured.
[ ] Warning appears at threshold.
[ ] Agent runs are blocked when hard limit is reached.
[ ] Discord /tokens works in mock mode.
```

## Approval gates

Require approval for:

```text
file.write
file.delete
terminal.run
git.push
deploy.production
database.migration
auth.change
billing.change
secrets.read
external.network.call
```

Audit log records:

```text
who requested
which agent
which tool
input summary
output summary
timestamp
approval status
token cost
memory used
files changed
result
```

## Discord mobile control

Implement commands:

```text
/status
/agents
/tasks
/task-create
/assign
/approve
/deny
/logs
/tokens
/memory-search
```

If credentials are missing, app must still run in mock Discord mode.

## Environment

`.env.example` must include:

```env
AGENTOS_APP_NAME=AgentOS
AGENTOS_DASHBOARD_NAME=AgentOS Command Center
AGENTOS_ENV=development

AGENTOS_API_PORT=8787
AGENTOS_GATEWAY_PORT=8790
AGENTOS_COMMAND_CENTER_PORT=3000

DATABASE_URL=postgresql://[REDACTED]
REDIS_URL=redis://[REDACTED]

AGENTOS_MODEL_PROVIDER=mock
AGENTOS_DEFAULT_MODEL=mock-agentos-local

AGENTOS_REQUIRE_HUMAN_APPROVAL=true
AGENTOS_SANITIZATION_MODE=strict

AGENTOS_DAILY_BUDGET_USD=2
AGENTOS_MONTHLY_BUDGET_USD=20
AGENTOS_WARNING_THRESHOLD_PERCENT=80
AGENTOS_HARD_STOP_ENABLED=true

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
```

## First-run commands that must work

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm sanitize:check
pnpm env:check
pnpm typecheck
pnpm test
pnpm dev
```

On Windows, document:

```powershell
Copy-Item .env.example .env
```

## Expected local URLs

```text
Dashboard: http://localhost:3000
API health: http://localhost:8787/health
Gateway health: http://localhost:8790/health
```

## Sanitization requirement

Forbidden outside legal/reference files:

```text
OpenClaw
openclaw
OPENCLAW
Clawwright
clawwright
Factory.ai
Factory AI
Droid
Droids
droid
Mission Control
BaseOps
BaseOps HQ
```

Create `scripts/sanitize-agentos.ts` and CI workflow.

## Acceptance criteria for final output

```text
[ ] `pnpm install` works.
[ ] `.env.example` exists and can be copied to `.env`.
[ ] `docker compose up -d` starts Postgres and Redis.
[ ] `pnpm db:migrate` works.
[ ] `pnpm db:seed` works.
[ ] `pnpm sanitize:check` passes.
[ ] `pnpm env:check` passes.
[ ] `pnpm typecheck` passes.
[ ] `pnpm test` passes or clearly reports intentionally minimal tests.
[ ] `pnpm dev` starts dashboard, API, worker, and gateway.
[ ] Dashboard opens at `http://localhost:3000`.
[ ] API health endpoint works at `http://localhost:8787/health`.
[ ] Gateway health endpoint works at `http://localhost:8790/health`.
[ ] Phaser office loads.
[ ] At least 12 objects are clickable.
[ ] Clicking objects opens correct React panels.
[ ] Agent status changes update sprite indicators or placeholders.
[ ] Memory endpoints work in mock/local mode.
[ ] Usage/quota endpoints work in mock/local mode.
[ ] Approval endpoints work.
[ ] Audit log records mock actions.
[ ] Discord mock mode works without credentials.
[ ] Discord real mode is documented.
[ ] No inherited project/source references appear outside legal/reference files.
```

## When finished, report

1. Files created/updated.
2. Commands run.
3. Actual outputs or errors.
4. What works.
5. What does not work yet.
6. Exact next command to run.


_(truncated for wiki; full text kept in import source.)_
## Related
- [[planning/chatgpt/index]]
- [[planning/chatgpt/agentos-project]]
- [[index]]