---
slug: learning/osint/adapters/search-engines
title: Search Engines
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Search Engines

Source: `apps/command-center/src/content/docs/adapters/search-engines.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/adapters/search-engines` (flous.dev/docs).

## Article

# Search engines

Queries **indexed web content** through search APIs or permitted programmatic access.

## Common inputs

- Query string
- Site filter
- Date range
- File type
- Exact phrase
- Excluded terms

## Common outputs

- Title
- Snippet
- URL
- Ranking position
- Cached date (if available)

## Useful components

- [Query builder](/docs/components/query-builder)
- Deduplicator (canonical URL)
- Result scorer (relevance + source tier)
- URL normalizer
- [Evidence vault](/docs/components/evidence-vault) logger

## Adapter outputs

Feed [Parser](/docs/components/parser) → [Normalizer](/docs/architecture/normalization) as `URL` and `WebPage` entities.

## Tool patterns

- [Event timeline builder](/docs/patterns/event-timeline-builder)
- [Brand impersonation monitor](/docs/patterns/brand-impersonation-monitor)
- [Self-OSINT audit](/docs/patterns/self-osint-audit)

## Directories

[OSINT Framework](https://osintframework.com/) and [Bellingcat Toolkit](https://bellingcat.gitbook.io/toolkit) group search and discovery utilities by category.

## Related

- [[learning/osint/index]]
- [[index]]
