---
slug: areas/diagrams/ui-routes
title: "Diagram: UI routes to API"
tags: [architecture, mermaid, diagram, ui]
valid_from: 2026-06-13
---
# UI routes → API proxy

Command Center sections (Forge shell). Standalone pages outside the shell listed separately.

```mermaid
flowchart TB
    subgraph nav ["Primary nav"]
        dash["/ dashboard"]
        miss["/missions"]
        gate["/control-gate"]
        bb["/blackbox"]
    end

    subgraph more ["More menu"]
        ops["/operators"]
        rout["/routines"]
        load["/loadout"]
        arch["/archive"]
        wiki["/wiki"]
        set["/settings"]
        scrap["/scraper"]
    end

    subgraph standalone ["Standalone pages"]
        prev["/preview/forge"]
        off["/office experimental"]
        demo["/demo/office"]
    end

    subgraph proxy ["agentos-api proxy"]
        api["API :8787"]
    end

    dash -->|"/dashboard"| api
    miss -->|"/missions /runs"| api
    gate -->|"/control-gate /approvals"| api
    bb -->|"/audit /runs/logs"| api
    ops -->|"/agents/roster"| api
    rout -->|"/routines"| api
    load -->|"/loadout /providers/status"| api
    arch -->|"/archive /memory"| api
    wiki -->|"/memory/wiki/*"| api
    set -->|"/policy/check"| api
```

## Section keys (`AgentOSLocalApp`)

`dashboard` · `missions` · `routines` · `operators` · `control-gate` · `blackbox` · `archive` · `wiki` · `loadout` · `settings`

Global chrome: command palette, health bar, chat FAB, run inspector, optional memory queue panel on wiki.
