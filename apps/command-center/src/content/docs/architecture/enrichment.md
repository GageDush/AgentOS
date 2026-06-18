# Enrichment

The **enricher** adds public context to a normalized entity by chaining adapters.

## Example chains

```txt
Domain → DNS → IP → Services → Certificates → Related Domains
```

```txt
Image → Reverse Search → Prior Appearances → Original Context → Timeline
```

```txt
URL → Archive Lookup → Snapshot Diff → Claim Verification
```

## Design rules

- Enrichment is **lazy** — run only when the user or playbook requests it.
- Each hop should create new entities + `relationships` rows, not overwrite parents.
- Cap depth and fan-out to control API cost (Quota / budget service).
- Propagate lowest confidence across the chain unless corroborated.

## Component

Dedicated [Enrichment service](/docs/platform/backend-services) orchestrates follow-on jobs from a seed entity ID.

## Adapter picks by seed type

| Seed | Typical enrichers |
|------|-------------------|
| Domain | [DNS](/docs/adapters/dns), [Certificates](/docs/adapters/certificates), [Internet exposure](/docs/adapters/internet-exposure) |
| URL | [Archives](/docs/adapters/archives), [Search](/docs/adapters/search-engines) |
| Image | [Media verification](/docs/adapters/media-verification), [Maps](/docs/adapters/maps) |
| Organization | [Public datasets](/docs/adapters/public-datasets), [Search](/docs/adapters/search-engines) |

## UI

Show enrichment as expandable steps on an [Entity card](/docs/ui/entity-card) with per-hop source badges.
