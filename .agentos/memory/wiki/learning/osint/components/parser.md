---
slug: learning/osint/components/parser
title: Parser
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Parser

Source: `apps/command-center/src/content/docs/components/parser.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/components/parser` (flous.dev/docs).

## Article

# Parser

Transforms **raw source data** into structured parsed records for [Normalization](/docs/architecture/normalization).

## Parser types

| Type | Input examples |
|------|----------------|
| HTML parser | Web pages, search results |
| JSON parser | REST APIs (Shodan, Censys, Overpass) |
| XML parser | RSS, some gov feeds |
| CSV parser | Public datasets |
| EXIF parser | Image metadata |
| Screenshot OCR parser | Rendered page text |
| DNS parser | Resolver responses |
| Certificate parser | CT log entries |

## Output pattern

```json
{
  "entity_type": "Domain",
  "value": "example.com",
  "source": "dns_adapter",
  "observed_at": "timestamp",
  "raw_ref": "raw_response_id"
}
```

## Design

- One parser module per `content_type` or adapter ID
- Parsers are **pure** — no network I/O
- Version parsers; keep raw artifacts to re-run when mappings change

## Worker

`parser-worker` in [Backend services](/docs/platform/backend-services).

## Related

- [[learning/osint/index]]
- [[index]]
