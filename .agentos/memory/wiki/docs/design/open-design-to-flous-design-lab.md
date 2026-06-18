---
slug: docs/design/open-design-to-flous-design-lab
title: Open Design To Flous Design Lab
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Open Design To Flous Design Lab

Source: `docs/design/open-design-to-flous-design-lab.md` (excerpt; secrets redacted).

## Excerpt

# Open Design to Flous Design Lab

Source reviewed: `nexu-io/open-design` at `076bf3316fb6dfa79bf00acd84c9dff2f07de5cd`

License posture: Open Design is Apache-2.0. AgentOS can adapt concepts and, if needed, small implementation patterns with attribution and license notices. The safer path is to rebuild the experience using AgentOS primitives instead of copying their monorepo or daemon model.

## What To Reverse Engineer

Open Design is strongest as a local-first design workspace. The parts worth turning into a Flous.dev component are the workflow seams:

- Design project intake: URL, local folder, uploaded HTML, screenshots, design-system files, and generated artifacts.
- File and asset rail: grouped pages, source files, screenshots, icons, animations, and metadata with status badges.
- Sandboxed preview stage: generated or captured HTML rendered in an iframe with view switching, reload, fullscreen, and export actions.
- Design context panel: brief, constraints, source URL, implementation notes, and handoff prompt.
- Comment and review loop: visual comments tied to an artifact, page, selector, screenshot, or preview state.
- Export handoff: self-contained HTML, Drive upload, Claude Design prompt, zip when needed, mission artifact link.

## What Not To Import

Do not import the whole Open Design app, daemon, registry, or plugin runtime into AgentOS.

Reasons:

- The dependency shape is different from AgentOS and would turn a focused component into a second platform.
- Their state model is built around their desktop daemon and project router.
- AgentOS already has missions, approvals, scraper output, local control, generated app preview, and wiki/docs surfaces.
- Flous.dev should keep the AgentOS product language instead of inheriting another app's nouns.

## Flous Component

Component name: `DesignLabWorkbench`

Suggested route: `/design-lab`

Primary job: turn scraped websites, uploaded HTML, and generated design docs into a reviewable design project with a live preview and handoff exports.

Layout:

- Left rail: project files, source pages, screenshots, assets, icons, motion references, raw captures, derived artifacts.
- Center stage: sandboxed preview for original composition, generated HTML, gallery view, or screenshot comparison.
- Right inspector: selected asset metadata, source URL, dimensions, file size, animation notes, contact/source notes, and lin

## Related

- [[index]]
- [[areas/repo-layout]]
