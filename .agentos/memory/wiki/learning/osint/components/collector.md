---
slug: learning/osint/components/collector
title: Collector
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Collector

Source: `apps/command-center/src/content/docs/components/collector.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/components/collector` (flous.dev/docs).

## Article

# Collector

Retrieves data from a [source adapter](/docs/architecture/source-adapters) and writes **raw artifacts**.

## Features

- Pagination (cursor, offset, or token-based)
- Retry queue with exponential backoff
- Rate limiting per source and per API key
- Response caching
- User-agent policy enforcement
- Source terms display in run UI
- Error classification: `transient` | `auth` | `policy` | `not_found` | `parse_error`

## Outputs

| Output | Stored as |
|--------|-----------|
| Raw body | `raw_artifacts.storage_path` |
| `captured_at` | ISO timestamp |
| Request metadata | job row JSON |
| Source status | HTTP / API code |

## Worker

Runs as `collector-worker` — see [Backend services](/docs/platform/backend-services) and [Collection jobs](/docs/architecture/collection).

## Handoff

Raw artifacts feed [Parser](/docs/components/parser) workers. Never parse inline in the collector — keeps retries cheap.

## Related

- [[learning/osint/index]]
- [[index]]
