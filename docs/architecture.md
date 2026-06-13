# AgentOS Architecture

## Apps

- `apps/command-center`: Next.js operator UI for missions, approvals, archive, wiki, and control surfaces.
- `apps/api`: Fastify control-layer API with auth, chat, Discord bridge, mission routing, and persistence-backed endpoints.
- `apps/worker`: local queued-run executor.
- `apps/gateway`: allow-listed command execution service.
- `apps/scheduler`: scheduled trigger dispatcher.

## Packages

- `shared`: types, seed data, and rich-message contracts.
- `persistence`: SQLite adapters, repository bundles, and storage contracts.
- `runtime`: mission execution, approvals, chat, and quick actions.
- `orchestrator`: task intake, routing, and context minimization.
- `memory`: memory wiki load, write, sync, and retrieval helpers.
- `agents`: installed `.agentos` registry and profile loading.
- `sandbox`: command permission policies.
- `token-manager`: budget evaluation and hard-stop logic.

## Data

The active local runtime stores durable state in SQLite at `.agentos/state/agentos-local.db` through the repository layer in `packages/persistence`.

Hosted Postgres remains a future adapter target, but the current checkout is designed to run local-first with mock/Ollama/gateway fallbacks when cloud credentials are absent.
