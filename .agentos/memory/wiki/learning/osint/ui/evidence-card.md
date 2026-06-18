---
slug: learning/osint/ui/evidence-card
title: Evidence Card
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Evidence Card

Source: `apps/command-center/src/content/docs/ui/evidence-card.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/ui/evidence-card` (flous.dev/docs).

## Article

# Evidence card

One verifiable claim or observation with full citation trail.

## Displays

- Claim text
- Primary source name + [source badge](/docs/ui/entity-card)
- Live URL
- Archive link
- Screenshot thumbnail
- `captured_at` timestamp
- Confidence badge
- Analyst note (collapsible)

## Actions

- Open raw artifact
- Re-fetch archive
- Attach to timeline event
- Add to report section

## Backend

[Evidence vault](/docs/components/evidence-vault) / `evidence_items` table.

## Related

- [[learning/osint/index]]
- [[index]]
