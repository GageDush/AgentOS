---
slug: learning/osint/architecture/collection
title: Collection
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Collection

Source: `apps/command-center/src/content/docs/architecture/collection.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/architecture/collection` (flous.dev/docs).

## Article

# Collection jobs

The **collector** retrieves data from a source adapter and persists raw artifacts before parsing.

## Responsibilities

- Pagination across large result sets
- Retry queue with backoff
- Rate limiting per source policy
- Response caching (ETag / TTL)
- User-agent and robots policy compliance
- Source terms display in UI
- Error classification (transient, auth, policy, not found)
- Raw response storage with hash and timestamp

## Job lifecycle

```txt
queued → running → succeeded | failed | partial
```

Persist job rows in `collection_jobs` — see [Data model](/docs/platform/data-model).

## Outputs

| Field | Purpose |
|-------|---------|
| Raw data blob or path | Immutable evidence |
| `captured_at` | Collection timestamp |
| Request metadata | URL, headers, query params (redacted) |
| Source status | HTTP code, API status, rate-limit headers |

## Component reference

Implementation details: [Collector component](/docs/components/collector).

Worker service: `collector-worker` in [Backend services](/docs/platform/backend-services).

## Design tips

- **Never** discard raw responses after parse — re-parse when schemas evolve.
- Attach `scope_id` to every job for audit and retention rules.
- Surface source ToS links in the UI next to the run button.

## Related

- [[learning/osint/index]]
- [[index]]
