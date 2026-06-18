# API auth matrix

Classification for every Fastify route on `@agentos/api`. Used by functionalization phase 0.2 and phase 1 auth guard (`apps/api/src/auth-guard.ts`).

## Classes

| Class | Meaning |
|-------|---------|
| `public-read` | No session required; safe to expose read-only |
| `authenticated-read` | Valid Discord OAuth session cookie required |
| `authenticated-mutate` | Session required; creates or changes operator state |
| `operator-admin` | Session required; guild bootstrap, sync, or other privileged ops |
| `internal-only` | Not session-gated; verified by alternate trust (signatures, worker placement) |

Enforcement: `AGENTOS_API_REQUIRE_AUTH=true` activates `installApiAuthGuard` (public allowlist: `/health`, `/auth/*`, `GET /media/agents/*`, `POST /discord/interactions`).

Source of truth: `apps/api/src/index.ts`, `apps/api/src/scraper/routes.ts`. Validated by `node scripts/functionalization/check-auth-matrix.mjs`.

## Routes

### Health and static

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/health` | GET | public-read | Liveness probe |
| `/media/agents/:file` | GET | public-read | Static agent portraits |
| `/` | GET | public-read | Redirect to `/auth/success` |

### Auth and session

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/auth/discord` | GET | public-read | OAuth authorize redirect |
| `/auth/discord/callback` | GET | public-read | OAuth callback |
| `/auth/success` | GET | public-read | Post-login HTML page |
| `/auth/me` | GET | public-read | Session introspection (401 body when logged out) |
| `/auth/logout` | POST | authenticated-mutate | Clears session cookie; on `/auth/*` allowlist until phase 1.3 |

### Operator snapshot

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/dashboard` | GET | authenticated-read | Command center snapshot |
| `/policy/check` | GET | authenticated-read | Sandbox policy assessment |
| `/providers/status` | GET | authenticated-read | LLM provider connectivity |
| `/system` | GET | authenticated-read | Service/feature flags |
| `/operators` | GET | authenticated-read | Operator roster |
| `/workspaces` | GET | authenticated-read | Workspace list |
| `/users` | GET | authenticated-read | User directory |

### Missions

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/missions` | GET | authenticated-read | List missions |
| `/missions` | POST | authenticated-mutate | Create mission |
| `/missions/:id` | GET | authenticated-read | Mission detail |
| `/missions/:id/questionnaire/generate` | POST | authenticated-mutate | Generate scoping questionnaire |
| `/missions/:id/questionnaire/submit` | POST | authenticated-mutate | Submit questionnaire answers |
| `/missions/:id/generated-app` | GET | authenticated-read | Generated app metadata |
| `/missions/:id/generated-app/preview` | GET | authenticated-read | Generated app preview |
| `/missions/:id/feedback` | POST | authenticated-mutate | Mission feedback |
| `/missions/:id/regen` | POST | authenticated-mutate | Regenerate app artifact |
| `/missions/:id/run` | POST | authenticated-mutate | Enqueue mission run |
| `/mission/demo` | GET | authenticated-read | Demo mission fixture |
| `/mission/demo/run` | POST | authenticated-mutate | Run demo mission |

### Runs and release gates

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/runs` | GET | authenticated-read | List runs |
| `/runs/:id` | GET | authenticated-read | Run detail |
| `/runs/:id/logs` | GET | authenticated-read | Run logs |
| `/runs/:id/gates` | GET | authenticated-read | Release gate status |
| `/runs/:id/continue` | POST | authenticated-mutate | Continue after approval |
| `/runs/:id/pause` | POST | authenticated-mutate | Pause run |
| `/runs/:id/resume` | POST | authenticated-mutate | Resume run |
| `/runs/:id/retry` | POST | authenticated-mutate | Retry failed run |
| `/runs/:id/gates/release/prepare` | POST | authenticated-mutate | Prepare release gate |
| `/runs/:id/gates/release/approve` | POST | authenticated-mutate | Approve release gate |
| `/runs/:id/release/pr` | POST | authenticated-mutate | Open GitHub PR for run |

### Routines, sessions, tasks, agents

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/routines` | GET | authenticated-read | List routines |
| `/routines` | POST | authenticated-mutate | Create routine |
| `/routines/:id/toggle` | POST | authenticated-mutate | Enable/disable routine |
| `/routines/:id/run` | POST | authenticated-mutate | Trigger routine |
| `/loadout` | GET | authenticated-read | Agent loadout |
| `/sessions` | GET | authenticated-read | List sessions |
| `/sessions` | POST | authenticated-mutate | Create session |
| `/sessions/:id/pause` | POST | authenticated-mutate | Pause session |
| `/sessions/:id/resume` | POST | authenticated-mutate | Resume session |
| `/agents` | GET | authenticated-read | Agent list |
| `/agents/:id` | GET | authenticated-read | Agent detail |
| `/agents/roster` | GET | authenticated-read | Forge roster cards |
| `/tasks` | GET | authenticated-read | List tasks |
| `/tasks` | POST | authenticated-mutate | Create task |
| `/tasks/:id` | GET | authenticated-read | Task detail |
| `/tasks/:id/run` | POST | authenticated-mutate | Start task |

### Memory and wiki

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/archive` | GET | authenticated-read | Archived memories |
| `/memory` | GET | authenticated-read | Memory entries |
| `/memory` | POST | authenticated-mutate | Persist memory |
| `/memory/search` | POST | authenticated-read | Semantic search (read-only query) |
| `/memory/:id/archive` | POST | authenticated-mutate | Archive entry |
| `/memory/wiki` | GET | authenticated-read | Wiki article index |
| `/memory/wiki/manifest` | GET | authenticated-read | Wiki manifest |
| `/memory/wiki/graph` | GET | authenticated-read | Wiki link graph |
| `/memory/wiki/article` | GET | authenticated-read | Single article |
| `/memory/wiki/backlinks` | GET | authenticated-read | Article backlinks |
| `/memory/wiki/search` | POST | authenticated-read | Wiki search (read-only query) |
| `/memory/wiki/expand` | POST | authenticated-read | Context expansion (read-only query) |
| `/memory/wiki/rebuild` | POST | operator-admin | Rebuild wiki manifest |
| `/memory/wiki/sync-chatgpt` | POST | operator-admin | Import ChatGPT planning export |
| `/memory/wiki/sync-cursor` | POST | operator-admin | Sync Cursor session transcripts |
| `/memory/queue` | GET | authenticated-read | Pending memory updates |
| `/memory/queue/:id/approve` | POST | authenticated-mutate | Approve queued memory write |
| `/memory/queue/:id/dismiss` | POST | authenticated-mutate | Dismiss queued memory write |

### Usage, quota, LLM

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/usage` | GET | authenticated-read | Usage events |
| `/usage/summary` | GET | authenticated-read | Aggregated usage |
| `/usage/budgets` | GET | authenticated-read | Budget caps |
| `/usage/budgets` | POST | authenticated-mutate | Add budget cap |
| `/usage/mock-event` | POST | operator-admin | Dev-only usage injection |
| `/quota/status` | GET | authenticated-read | Quota steward snapshot |
| `/llm/routes` | GET | authenticated-read | Router aliases |
| `/llm/activity` | GET | authenticated-read | Recent LLM usage |
| `/llm/chat` | POST | authenticated-mutate | Chat completion (spend) |

### Approvals, actions, chat, audit

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/approvals` | GET | authenticated-read | Pending approvals |
| `/control-gate` | GET | authenticated-read | Control gate snapshot |
| `/approvals/:id/approve-once` | POST | authenticated-mutate | One-shot approval |
| `/approvals/:id/approve-for-mission` | POST | authenticated-mutate | Mission-scoped approval |
| `/approvals/:id/deny` | POST | authenticated-mutate | Deny approval |
| `/approvals/bulk/approve-once` | POST | authenticated-mutate | Bulk approve pending |
| `/quick-actions` | GET | authenticated-read | Quick action queue |
| `/quick-actions/:id/consume` | POST | authenticated-mutate | Execute quick action |
| `/rich-actions/execute` | POST | authenticated-mutate | Rich quick action |
| `/chat/threads` | GET | authenticated-read | Chat threads |
| `/chat/threads` | POST | authenticated-mutate | Create thread |
| `/chat/threads/:id/messages` | GET | authenticated-read | Thread messages |
| `/chat/threads/:id/messages` | POST | authenticated-mutate | Post message |
| `/audit` | GET | authenticated-read | Audit event log |

### Worker and events

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/worker/process` | POST | authenticated-mutate | Dequeue mission runs (worker/scheduler) |
| `/events` | WS | authenticated-read | Live snapshot WebSocket |

### Discord

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/discord/interactions` | POST | internal-only | Ed25519 signature verification |
| `/discord/mock` | GET | authenticated-read | Discord integration debug |
| `/discord/bootstrap` | POST | operator-admin | Guild bootstrap |
| `/discord/restructure` | POST | operator-admin | Guild restructure |
| `/discord/sync-commands` | POST | operator-admin | Slash command sync |
| `/discord/sync-roles` | POST | operator-admin | Role sync |
| `/discord/sync-outbox` | POST | operator-admin | Approval outbox sync |
| `/discord/post-guides` | POST | operator-admin | Channel guide posts |
| `/discord/pulse` | POST | operator-admin | System pulse notification |

### Scraper (Puppeteer)

| Route | Method | Class | Notes |
|-------|--------|-------|-------|
| `/scraper/download` | POST | authenticated-mutate | Start scrape job (SSRF policy) |
| `/scraper/status/:downloadId` | GET | authenticated-read | Job status |
| `/scraper/logs/:downloadId` | GET | authenticated-read | Job logs |
| `/scraper/gallery` | GET | authenticated-read | Gallery index |
| `/scraper/gallery/:downloadId` | GET | authenticated-read | Gallery record |
| `/scraper/file/:downloadId` | GET | authenticated-read | Captured asset file |
| `/scraper/stop/:downloadId` | POST | authenticated-mutate | Stop job |
| `/scraper/export/:downloadId/:format` | GET | authenticated-read | Export bundle |
