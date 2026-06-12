---
slug: docs/memory_and_token_systems
title: MEMORY AND TOKEN SYSTEMS
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# MEMORY AND TOKEN SYSTEMS

Source: `docs/MEMORY_AND_TOKEN_SYSTEMS.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Memory and Token/Credit Management Systems

## Memory management system

AgentOS needs two memory layers:

1. **Structured memory** for known fields, auditability, and filtering.
2. **Vector-ready memory** for future semantic search and RAG.

## Memory types

[code block omitted]

## Minimum database tables

[code block omitted]

## Memory fields

[code block omitted]

## Vector-ready fields

[code block omitted]

For MVP, keyword/mock search is acceptable. The schema should be ready for pgvector later.

## Memory API endpoints

[code block omitted]

## Memory UI

Clicking the Knowledge area opens:

[code block omitted]

## Memory acceptance criteria

[code block omitted]

---

# Token and credit management system

## Goal

Prevent runaway API usage and surprise bills.

The token manager should track:

[code block omitted]

## Minimum database tables

[code block omitted]

## Usage event type

[code block omitted]

## Budget type

[code block omitted]

## Enforcement logic

Before every real LLM call:

[code block omitted]

## Token API endpoints

[code block omitted]

## Token UI

Clicking the Finance/Token station opens:

[code block omitted]

## Discord command

[code block omitted]

Should return:

[code block omitted]

## Token acceptance criteria

[code block omitted]

## Related

- [[index]]
- [[areas/repo-layout]]
