---
slug: learning/osint/patterns/event-timeline-builder
title: Event Timeline Builder
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Event Timeline Builder

Source: `apps/command-center/src/content/docs/patterns/event-timeline-builder.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/patterns/event-timeline-builder` (flous.dev/docs).

## Article

# Event timeline builder

Build a **sourced timeline** from public posts, articles, official statements, and archives.

## Goal

Public event reconstruction with contradictions visible.

## Inputs

- Event name
- Date range
- Source allowlist (optional)
- Keywords

## Components

- [Search adapter](/docs/adapters/search-engines)
- News / RSS adapter
- [Archive adapter](/docs/adapters/archives)
- Timestamp normalizer
- Duplicate detector
- [Timeline](/docs/ui/timeline) renderer
- Contradiction tracker (`CONTRADICTS` edges)

## UI

- Chronological timeline
- Source cards per event
- Contradiction badges
- Confidence filters
- Markdown export

## Scope mode

**Public-event mode** — [Safety & policy](/docs/safety/policy).

## Related

- [[learning/osint/index]]
- [[index]]
