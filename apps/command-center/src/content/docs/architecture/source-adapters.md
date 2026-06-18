# Source adapters

A **source adapter** wraps one data source behind a common interface so collectors, parsers, and UIs stay source-agnostic.

## Purpose

- One integration point per public source
- Shared validation, metadata, and error taxonomy
- Pluggable into search dashboards, mappers, verification assistants, and evidence collectors

## Interface sketch

See full [Plugin SDK](/docs/platform/plugin-sdk) for the `SourceAdapter` TypeScript contract.

## Inputs

- Query or seed entity
- API key (if required)
- Scope policy reference
- Rate-limit configuration

## Outputs

- Raw response artifact
- Parsed records
- Source metadata (reliability, terms, freshness)
- Collection status / error class

## Adapter metadata

Each adapter should declare:

| Field | Example |
|-------|---------|
| `id` | `dns_public` |
| `category` | `dns` |
| `requiresAuth` | false |
| `rateLimit` | `10 req/min` |
| `allowedUse` | owned-domain audit, CTI enrichment |
| `disallowedUse` | credential discovery, private profile scraping |

## Catalog

| Adapter doc | Typical source |
|-------------|----------------|
| [Search engines](/docs/adapters/search-engines) | Web index APIs |
| [Archives](/docs/adapters/archives) | Wayback / CDX |
| [DNS](/docs/adapters/dns) | Resolver + RDAP |
| [Certificates](/docs/adapters/certificates) | CT logs |
| [Internet exposure](/docs/adapters/internet-exposure) | Shodan, Censys |
| [Maps](/docs/adapters/maps) | OSM / Overpass |
| [Media verification](/docs/adapters/media-verification) | Reverse search, EXIF |
| [Public datasets](/docs/adapters/public-datasets) | Gov / research APIs |

## Real-world pattern: OWASP Amass

[OWASP Amass](https://owasp.org/www-project-amass/) documents a collection engine, asset database, and **Open Asset Model** for external asset discovery. Its user guide breaks the tool into subcommands for intel collection, DNS enumeration, visualization, tracking, and database management — a useful reference for how to split adapters vs storage vs graph views.
