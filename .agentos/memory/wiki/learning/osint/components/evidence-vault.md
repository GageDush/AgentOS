---
slug: learning/osint/components/evidence-vault
title: Evidence Vault
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Evidence Vault

Source: `apps/command-center/src/content/docs/components/evidence-vault.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/components/evidence-vault` (flous.dev/docs).

## Article

# Evidence vault

Stores **verifiable records** so every claim traces back to a source.

## Stores per evidence item

- Original source URL
- Archive URL (Wayback / CDX snapshot)
- Screenshot path
- Raw response reference
- Parsed text excerpt
- Collection timestamp
- Content hash
- Analyst note
- Confidence level

## Design goal

> Every claim should trace back to evidence.

## UI

Render as [Evidence card](/docs/ui/evidence-card) with archive + screenshot links.

## Service

`evidence-service` — [Backend services](/docs/platform/backend-services).

## Table

`evidence_items` — [Data model](/docs/platform/data-model).

## Reusable in

- [Evidence manager](/docs/patterns/evidence-manager)
- [Media verification workspace](/docs/patterns/media-verification-workspace)
- [Event timeline builder](/docs/patterns/event-timeline-builder)

## Export modes

- Full internal evidence (analyst)
- Redacted view via [Redaction engine](/docs/components/redaction-engine)
- Public-safe report via [Report builder](/docs/ui/report-builder)

## Related

- [[learning/osint/index]]
- [[index]]
