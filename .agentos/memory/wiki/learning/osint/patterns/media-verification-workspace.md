---
slug: learning/osint/patterns/media-verification-workspace
title: Media Verification Workspace
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Media Verification Workspace

Source: `apps/command-center/src/content/docs/patterns/media-verification-workspace.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/patterns/media-verification-workspace` (flous.dev/docs).

## Article

# Media verification workspace

Verify whether an image or video is **original, reused, or miscaptioned** using public evidence.

## Goal

Journalism-style verification — sourced conclusions only.

## Inputs

- Image and/or video
- Source URL (optional)
- Claimed date / location (optional)

## Components

- Keyframe extractor
- [Media verification adapter](/docs/adapters/media-verification)
- Metadata viewer
- [Archive adapter](/docs/adapters/archives)
- [Map adapter](/docs/adapters/maps)
- [Timeline](/docs/ui/timeline) builder
- [Confidence scoring](/docs/components/confidence-scoring)

## UI

- Media preview pane
- Keyframe strip
- Source timeline
- Location candidates map
- Confidence panel
- [Report builder](/docs/ui/report-builder) export

## Scope mode

**Media-verification mode** — [Safety & policy](/docs/safety/policy).

## Related

- [[learning/osint/index]]
- [[index]]
