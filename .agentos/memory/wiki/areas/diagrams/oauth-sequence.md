---
slug: areas/diagrams/oauth-sequence
title: "Diagram: Discord OAuth session"
tags: [architecture, mermaid, sequence, diagram, auth]
valid_from: 2026-06-13
---
# Discord OAuth session

Production cookies use `Domain=.flous.dev` when `AGENTOS_API_BASE_URL` includes flous.dev.

```mermaid
sequenceDiagram
    participant Operator
    participant CommandCenter
    participant API
    participant Discord
    participant SQLite

    Operator->>CommandCenter: Visit flous.dev
    CommandCenter->>API: GET /auth/discord
    API->>Discord: OAuth authorize redirect
    Discord-->>Operator: Login consent
    Operator->>Discord: Approve
    Discord->>API: GET /auth/discord/callback
    API->>Discord: Exchange code
    Discord-->>API: User profile
    API->>SQLite: Session row
    API-->>Operator: Set-Cookie agentos_session
    API-->>CommandCenter: Redirect /auth/success
    CommandCenter-->>Operator: Authenticated Forge shell
```

Callbacks: local `127.0.0.1:8787` and prod `api.flous.dev` (register both in Discord portal).
