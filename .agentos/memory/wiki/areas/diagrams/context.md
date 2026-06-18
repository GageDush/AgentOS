---
slug: areas/diagrams/context
title: "Diagram: System context (C4 L1)"
tags: [architecture, mermaid, c4, diagram]
valid_from: 2026-06-13
---
# System context (C4 L1)

Operator-facing AgentOS on `flous.dev`, local-first stack behind Cloudflare Tunnel.

```mermaid
flowchart LR
    subgraph operators ["Operators"]
        operator["Operator"]
    end

    subgraph agentosBoundary ["AgentOS"]
        agentos["AgentOS Platform"]
    end

    subgraph external ["External systems"]
        discord["Discord"]
        cursor["Cursor IDE"]
        github["GitHub"]
        ollama["Ollama"]
        cloudflare["Cloudflare Tunnel"]
    end

    operator -->|"HTTPS flous.dev"| cloudflare
    cloudflare -->|"Routes to local stack"| agentos
    operator -->|"OAuth and bot"| discord
    agentos -->|"Bot OAuth bridge"| discord
    agentos -->|"Implementer and wiki sync"| cursor
    agentos -->|"Release PRs"| github
    agentos -->|"Local LLM lane"| ollama
```

## Hostnames (production)

| Host | Target |
|------|--------|
| `flous.dev` | Command Center `:3000` |
| `app.flous.dev` | Command Center alias |
| `agentos.flous.dev` | Command Center alias |
| `api.flous.dev` | API `:8787` |

See [[areas/diagrams/containers]] for services inside the boundary.
