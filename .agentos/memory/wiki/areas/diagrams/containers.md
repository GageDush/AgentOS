---
slug: areas/diagrams/containers
title: "Diagram: Containers and hosting (C4 L2)"
tags: [architecture, mermaid, c4, diagram]
valid_from: 2026-06-13
---
# Containers and hosting (C4 L2)

Current app processes and data stores (reviewed 2026-06-13).

```mermaid
flowchart LR
    subgraph operators ["Operators"]
        operator["Operator"]
        developer["Developer"]
    end

    subgraph edge ["Edge"]
        tunnel["Cloudflare Tunnel agentos"]
    end

    subgraph apps ["AgentOS apps"]
        cc["Command Center :3000"]
        api["API :8787"]
        gw["Gateway :8790"]
        worker["Worker"]
        sched["Scheduler"]
    end

    subgraph packages ["Shared packages"]
        runtime["runtime orchestrator agents memory"]
    end

    subgraph stores ["Stores"]
        sqlite["agentos-local.db"]
        wiki[".agentos/memory/wiki"]
        profiles[".agentos/agents"]
        repo["Repo workspace"]
    end

    subgraph external ["External"]
        discord["Discord"]
        cursor["Cursor IDE"]
        github["GitHub GageDush/AgentOS"]
        ollama["Ollama :11434"]
    end

    operator -->|"HTTPS"| tunnel
    tunnel -->|"flous.dev :3000"| cc
    tunnel -->|"api.flous.dev :8787"| api
    developer -->|"pnpm dev stack"| cc
    developer -->|"pnpm dev stack"| api
    cc -->|"/agentos-api proxy"| api
    cc <-->|"/events WebSocket"| api
    api --> gw
    worker -->|"POST /worker/process"| api
    sched --> api
    api --> runtime
    gw -->|"git pnpm semgrep"| repo
    api --> sqlite
    api --> wiki
    api --> profiles
    api --> repo
    api --> discord
    api --> cursor
    api --> ollama
    api --> github
    developer -->|"git push PR"| github
```

## Apps (`apps/`)

| App | Port | Role |
|-----|------|------|
| [[apps/command-center]] | 3000 | Forge UI, wiki browser, chat dock |
| [[apps/api]] | 8787 | Auth, missions, Discord, wiki API, WebSocket |
| [[apps/gateway]] | 8790 | Allowlisted git/pnpm/semgrep |
| [[apps/worker]] | — | Polls and processes mission runs |
| [[apps/scheduler]] | — | Scheduled automations |

## Optional infra (env only, not required for MVP)

- Postgres `:5432`, Redis `:6379` — referenced in `.env.example`, SQLite is primary today
