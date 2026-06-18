---
slug: learning/osint/adapters/archives
title: Archives
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Archives

Source: `apps/command-center/src/content/docs/adapters/archives.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/adapters/archives` (flous.dev/docs).

## Article

# Archives

Finds **historical versions** of public web pages.

## Common inputs

- URL
- Domain
- Date range

## Common outputs

- Snapshot URL
- Capture timestamp
- HTTP status at capture
- MIME type
- Page diff vs current or vs prior snapshot

## Useful components

- Snapshot timeline
- [Diff viewer](/docs/ui/diff-viewer)
- Screenshot renderer
- Change detector (hash / structural diff)

## APIs and tools

- [Internet Archive](https://archive.org/)
- Wayback Machine CDX API resources
- Pair with [Evidence vault](/docs/components/evidence-vault) — store `archive_url` on every claim

## Enrichment chain

```txt
URL → Archive Lookup → Snapshot Diff → Claim Verification
```

See [Media verification workspace](/docs/patterns/media-verification-workspace) and [Event timeline builder](/docs/patterns/event-timeline-builder).

## Related

- [[learning/osint/index]]
- [[index]]
