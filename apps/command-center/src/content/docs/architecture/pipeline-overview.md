# Pipeline overview

Most OSINT tools share the same pipeline. Design yours as composable layers so you can swap adapters without rewriting the UI.

## High-level model

```txt
Input → Source Adapter → Collector → Parser → Normalizer → Enricher → Correlator → Storage → UI/Report
```

## Input layer

Accepts the starting point for a task.

Examples:

- Domain
- URL
- Image
- Username
- Company name
- IP address
- Public post URL
- Search query
- Location name
- File hash
- Email domain

## Source adapter layer

Connects to a specific **public** source. See [Source adapters](/docs/architecture/source-adapters) and the [adapter catalog](/docs/adapters/search-engines).

Examples: search engine, DNS, certificate transparency, internet exposure (Shodan/Censys-style), archive, OpenStreetMap, news search, public dataset.

## Collection layer

Handles retrieval. See [Collection jobs](/docs/architecture/collection).

Responsibilities: rate limiting, pagination, retry logic, API key handling, caching, robots/policy checks, error handling, raw response storage.

## Parsing layer

Turns messy source data into structured records.

Examples: HTML, JSON, RSS, EXIF, screenshot OCR, DNS, WHOIS/RDAP, certificate parsers.

## Normalization layer

Converts source-specific data into common entities. See [Normalization](/docs/architecture/normalization).

## Enrichment layer

Adds context to an entity. See [Enrichment](/docs/architecture/enrichment).

## Correlation layer

Connects entities into a graph or relationship table. See [Correlation](/docs/architecture/correlation).

## Storage layer

Persists raw data, normalized data, and analysis. See [Storage](/docs/architecture/storage).

## UI / report layer

Presents findings: evidence cards, entity graph, timeline, source table, confidence badges, map view, diff viewer, exportable report. See [UI components](/docs/ui/entity-card).

## Reference implementations

| Pattern | Anchor project |
|---------|----------------|
| Asset discovery pipeline | [OWASP Amass](https://owasp.org/www-project-amass/) — collection engine, asset DB, Open Asset Model |
| Internet exposure adapter | [Shodan API](https://developer.shodan.io/api), [Censys Search API](https://search.censys.io/api) |
| Graph / transforms | [Maltego Transform Hub](https://www.maltego.com/transform-hub/) |
| Geospatial queries | [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) |
