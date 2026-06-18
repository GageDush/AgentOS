---
slug: learning/osint/welcome
title: Welcome
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Welcome

Source: `apps/command-center/src/content/docs/welcome.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/welcome` (flous.dev/docs).

## Article

# Welcome

A **developer-oriented documentation set** for understanding how OSINT tools work, what components they share, and how to remix those building blocks into search tools, verification tools, asset mappers, evidence dashboards, graph explorers, and privacy-audit utilities.

## What this docs pack teaches

This guide focuses on OSINT tooling as **reusable software systems**, not a single investigation playbook.

You will learn:

- What OSINT tools collect
- How collection modules are structured
- How enrichment pipelines work
- How entities are normalized
- How evidence is stored and cited
- How graphs, timelines, and reports are generated
- How verification and confidence scoring work
- How to design **scoped, useful** intelligence tools

## Recommended project categories

These patterns map cleanly to the component library in this pack:

- Self-OSINT privacy audit
- Organization-owned domain exposure review
- Brand impersonation monitoring
- Public event verification
- Misinformation verification
- Cyber threat intelligence enrichment
- Public dataset exploration
- Media verification workflows
- Evidence management dashboards

## Core library components

The killer artifact is a reusable OSINT component set you can wire together:

| Component | Role |
|-----------|------|
| `SourceAdapter` | One public source behind a common interface |
| `QueryBuilder` | Structured queries per source syntax |
| `Collector` | Retrieval, rate limits, raw artifacts |
| `Parser` / `Normalizer` | Messy data → canonical entities |
| `EntityResolver` | Same-entity detection with uncertainty |
| `EvidenceVault` | Citations, screenshots, hashes |
| `ConfidenceBadge` | Graded findings |
| `Timeline` / `Graph` | Correlation views |
| `Redactor` | Export-safe views |
| `ReportBuilder` | Markdown, PDF, HTML output |

## Where to go next

- [Pipeline overview](/docs/architecture/pipeline-overview) — end-to-end system model
- [Entity model](/docs/architecture/entity-model) — shared types across tools
- [Source adapters](/docs/adapters/search-engines) — catalog of adapter patterns
- [Tool patterns](/docs/patterns/self-osint-audit) — complete tool recipes
- [Safety & policy](/docs/safety/policy) — scope modes and disallowed use (read before shipping)

## Related

- [[learning/osint/index]]
- [[index]]
