---
slug: learning/osint/adapters/internet-exposure
title: Internet Exposure
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Internet Exposure

Source: `apps/command-center/src/content/docs/adapters/internet-exposure.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/adapters/internet-exposure` (flous.dev/docs).

## Article

# Internet exposure

Queries **internet-scan databases** for public host and service data.

## Common inputs

- IP address
- Domain
- Port
- Product / banner string
- Organization
- Country
- Service banner

## Common outputs

- Open ports
- Service names
- Banners
- TLS information
- Geolocation (coarse)
- Organization attribution
- Observed timestamps

## Useful components

- Service normalizer
- Risk tagger (exposed admin panels, etc.)
- Faceted search UI
- Asset table
- Exposure dashboard

## Reference APIs

| Provider | Docs |
|----------|------|
| Shodan | [REST API Documentation](https://developer.shodan.io/api) — host search, facets, query syntax |
| Censys | [Search API](https://search.censys.io/api) — hosts, certificates, metadata endpoints |

## Tool patterns

- [Domain exposure mapper](/docs/patterns/domain-exposure-mapper)

## Query builder

Expose provider filter syntax as template chips — mirror Shodan filter reference in [Query builder](/docs/components/query-builder).

## Related

- [[learning/osint/index]]
- [[index]]
