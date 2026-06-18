---
slug: learning/osint/components/query-builder
title: Query Builder
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Query Builder

Source: `apps/command-center/src/content/docs/components/query-builder.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/components/query-builder` (flous.dev/docs).

## Article

# Query builder

Creates **structured search queries** from user inputs with source-specific syntax and reproducible logs.

## Query types

- Domain query
- Exact phrase query
- Date-bounded query
- Filetype query
- Site-scoped query (`site:example.com`)
- Boolean query (AND / OR / NOT)

## Features

- Query templates per adapter
- Live query preview before execution
- Source-specific syntax translation (Google dorks vs Shodan filters vs Censys query language)
- Reproducible query logs stored with `collection_jobs`

## Outputs

Final query string + parameter object passed to [Collector](/docs/components/collector).

## Shodan filter reference

Internet-exposure tools often expose a dedicated filter syntax — see [Shodan API](https://developer.shodan.io/api) and filter docs for facet and host-search patterns. Mirror that as template chips in your UI.

## Reusable in

- Search dashboard
- [Event timeline builder](/docs/patterns/event-timeline-builder)
- [Brand impersonation monitor](/docs/patterns/brand-impersonation-monitor)

## Related

- [[learning/osint/index]]
- [[index]]
