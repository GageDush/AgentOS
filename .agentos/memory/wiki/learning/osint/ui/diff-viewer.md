---
slug: learning/osint/ui/diff-viewer
title: Diff Viewer
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Diff Viewer

Source: `apps/command-center/src/content/docs/ui/diff-viewer.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/ui/diff-viewer` (flous.dev/docs).

## Article

# Diff viewer

Compare **current vs archived** web content.

## Displays

- Side-by-side or unified diff
- Text change highlights
- Screenshot change slider
- Metadata diff (title, canonical URL, HTTP headers)
- Links to both live URL and archive snapshot

## Adapter

[Archives](/docs/adapters/archives).

## Component pair

Works with archive adapter + screenshot renderer. Store diff summary hash on evidence item.

## Tool patterns

- [Media verification workspace](/docs/patterns/media-verification-workspace)
- [Brand impersonation monitor](/docs/patterns/brand-impersonation-monitor)

## Related

- [[learning/osint/index]]
- [[index]]
