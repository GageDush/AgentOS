---
slug: learning/osint/architecture/normalization
title: Normalization
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Normalization

Source: `apps/command-center/src/content/docs/architecture/normalization.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/architecture/normalization` (flous.dev/docs).

## Article

# Normalization

The **normalizer** converts source-specific objects into canonical entities from the [Entity model](/docs/architecture/entity-model).

## Problem

Different tools describe the same thing differently:

```txt
hostname | host | domain_name | fqdn | name
```

Normalize all into:

```txt
Domain.name
```

## Features

- Type mapping (source field → entity type)
- Value cleanup (trim, punycode, lowercase rules)
- Deduplication within a job batch
- Canonical formatting (URL canonicalization, domain root rules)
- Confidence inheritance from parser or source tier

## Output pattern

```json
{
  "entity_type": "Domain",
  "value": "example.com",
  "source": "dns_adapter",
  "observed_at": "2026-06-14T12:00:00Z",
  "raw_ref": "raw_response_id",
  "confidence": "medium"
}
```

## Pipeline position

```txt
Parser → Normalizer → Entity service (merge) → Enricher
```

Entity merge and fuzzy matching: [Entity resolver](/docs/components/entity-resolver).

## Parser handoff

Parsers emit **parsed records**; normalizers emit **entities**. Keep parsers dumb and normalizers strict so you can add sources without changing enrichment chains.

## Related

- [[learning/osint/index]]
- [[index]]
