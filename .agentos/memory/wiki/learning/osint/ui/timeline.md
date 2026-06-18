---
slug: learning/osint/ui/timeline
title: Timeline
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Timeline

Source: `apps/command-center/src/content/docs/ui/timeline.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/ui/timeline` (flous.dev/docs).

## Article

# Timeline

Chronological view of events with sources and contradictions.

## Displays

- Event title + timestamp (normalized timezone)
- Linked [evidence cards](/docs/ui/evidence-card)
- Confidence per event
- `CONTRADICTS` markers between events
- Filter by source type / min confidence

## Data

Events derived from `evidence_items` + `relationships` or a dedicated `timeline_events` projection.

## Tool patterns

- [Event timeline builder](/docs/patterns/event-timeline-builder)
- [Media verification workspace](/docs/patterns/media-verification-workspace)

## Export

Markdown section via [Report builder](/docs/ui/report-builder).

## Related

- [[learning/osint/index]]
- [[index]]
