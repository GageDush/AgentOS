---
slug: learning/osint/components/confidence-scoring
title: Confidence Scoring
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Confidence Scoring

Source: `apps/command-center/src/content/docs/components/confidence-scoring.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/components/confidence-scoring` (flous.dev/docs).

## Article

# Confidence scoring

Grades the **strength of a finding** for badges, filters, and report language.

## Inputs

- Source type and reliability tier
- Number of independent sources
- Recency of observation
- Directness (primary vs derivative)
- Contradictions in graph
- Analyst review override

## Levels

| Level | Typical use |
|-------|-------------|
| Confirmed | Analyst verified + multiple independent sources |
| High confidence | Strong source, no contradictions |
| Medium confidence | Single reputable source or indirect chain |
| Low confidence | Weak or stale source |
| Unverified | Collected but not assessed |
| Contradicted | Conflicting evidence exists |

## UI

[Confidence badge](/docs/ui/entity-card) on entity and evidence cards. Filter timeline and graph by minimum confidence.

## Implementation

Pure function + optional ML later. Store numeric score + display label on `entities` and `evidence_items`.

Propagate minimum confidence across [Enrichment](/docs/architecture/enrichment) chains unless a hop corroborates.

## Related

- [[learning/osint/index]]
- [[index]]
