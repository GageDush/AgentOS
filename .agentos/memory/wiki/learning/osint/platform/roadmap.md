---
slug: learning/osint/platform/roadmap
title: Roadmap
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Roadmap

Source: `apps/command-center/src/content/docs/platform/roadmap.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/platform/roadmap` (flous.dev/docs).

## Article

# Component roadmap

Prioritized build order for the OSINT component library.

## MVP

Ship a usable local-first tool with:

- Source registry
- [Search adapter](/docs/adapters/search-engines)
- [Archive adapter](/docs/adapters/archives)
- [DNS adapter](/docs/adapters/dns)
- [Entity model](/docs/architecture/entity-model)
- [Evidence vault](/docs/components/evidence-vault)
- [Confidence scoring](/docs/components/confidence-scoring) badge
- [Report builder](/docs/ui/report-builder) (markdown export)

**Delivers:** [Evidence manager](/docs/patterns/evidence-manager) or minimal [Self-OSINT audit](/docs/patterns/self-osint-audit).

## V2

- [Graph](/docs/ui/graph) view
- [Timeline](/docs/ui/timeline) builder
- [Diff viewer](/docs/ui/diff-viewer)
- [Certificate](/docs/adapters/certificates) adapter
- [Internet exposure](/docs/adapters/internet-exposure) adapter
- [Map](/docs/adapters/maps) adapter
- [Redaction engine](/docs/components/redaction-engine)

**Delivers:** [Domain exposure mapper](/docs/patterns/domain-exposure-mapper), [Media verification workspace](/docs/patterns/media-verification-workspace).

## V3

- Full [Plugin SDK](/docs/platform/plugin-sdk)
- Job queue + horizontal workers
- Multi-user workspaces
- Source reliability scoring model
- Natural-language [Query builder](/docs/components/query-builder)
- Analyst review workflow
- [Audit logs](/docs/components/audit-logs) + export approval gates

**Delivers:** Team-grade CTI and verification ops.

## Labs mapping

| Lab | Roadmap phase |
|-----|----------------|
| [Lab 1 — Adapter](/docs/labs/overview#lab-1-build-a-source-adapter) | MVP |
| [Lab 2 — Evidence vault](/docs/labs/overview#lab-2-build-an-evidence-vault) | MVP |
| [Lab 3 — Domain mapper](/docs/labs/overview#lab-3-build-a-domain-exposure-mapper) | V2 |
| [Lab 4 — Media board](/docs/labs/overview#lab-4-build-a-media-verification-board) | V2 |
| [Lab 5 — Timeline](/docs/labs/overview#lab-5-build-a-timeline-generator) | V2 |

## Related

- [[learning/osint/index]]
- [[index]]
