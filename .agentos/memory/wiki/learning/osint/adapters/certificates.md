---
slug: learning/osint/adapters/certificates
title: Certificates
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Certificates

Source: `apps/command-center/src/content/docs/adapters/certificates.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/adapters/certificates` (flous.dev/docs).

## Article

# Certificates

Queries **certificate transparency** logs for domains, subdomains, and organizations.

## Common inputs

- Domain
- Organization name
- Certificate fingerprint

## Common outputs

- Certificate subject
- Subject alternative names (SANs)
- Issuer
- Validity dates
- Fingerprint
- Related hostnames

## Useful components

- Subdomain extractor (from SANs)
- Certificate timeline
- Host correlation graph
- Organization matcher

## Enrichment chain

```txt
Domain → Certificates → Subdomains → DNS → IP
```

## Tool patterns

- [Domain exposure mapper](/docs/patterns/domain-exposure-mapper)

## Reference

[Censys Search API](https://search.censys.io/api) exposes certificate search endpoints alongside hosts — useful split for adapter design.

## Related

- [[learning/osint/index]]
- [[index]]
