---
slug: areas/diagrams/wiki-sync-sequence
title: "Diagram: Memory wiki sync"
tags: [architecture, mermaid, sequence, diagram, wiki]
valid_from: 2026-06-13
---
# Memory wiki sync

Sources: Cursor transcripts, ChatGPT planning exports, repo index, agent curator, manual briefs.

```mermaid
sequenceDiagram
    participant Operator
    participant WikiUI
    participant API
    participant CursorTranscripts
    participant WikiFS

    Operator->>WikiUI: Open /wiki Sync Cursor
    WikiUI->>API: POST /memory/wiki/sync-cursor
    API->>CursorTranscripts: Read JSONL sessions
    CursorTranscripts-->>API: Transcript content
    API->>WikiFS: Write sessions/cursor/*
    API->>WikiFS: Rebuild _meta/index.json
    API-->>WikiUI: Sync summary
    WikiUI-->>Operator: Updated article list

    Note over API,WikiFS: Optional AGENTOS_CURSOR_WIKI_SYNC=true runs sync on API interval
```

Other ingest: `pnpm wiki:index-repo`, `pnpm wiki:sync-chatgpt`, memory-curator on run complete → [[flows/memory-curator]].
