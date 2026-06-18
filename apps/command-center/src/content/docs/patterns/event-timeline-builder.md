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
