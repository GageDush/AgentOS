# Source bank

External references that anchor **real-world adapter and UX patterns**. Use these as design specs, not dependencies to vendor-lock.

## Tool directories

| Resource | URL |
|----------|-----|
| Bellingcat Online Investigation Toolkit | https://bellingcat.gitbook.io/toolkit |
| OSINT Framework | https://osintframework.com/ |

Bellingcat groups satellite/mapping, photo/video verification, archive tools, and other utilities — a strong model for [Source adapters](/docs/architecture/source-adapters) taxonomy.

## Cyber / infrastructure

| Resource | URL | Docs use |
|----------|-----|----------|
| OWASP Amass | https://owasp.org/www-project-amass/ | Collection engine, asset DB, Open Asset Model, DNS/intel subcommands |
| Shodan Developer Docs | https://developer.shodan.io/api | [Internet exposure](/docs/adapters/internet-exposure) query + facets |
| Censys Search API | https://search.censys.io/api | Hosts + certificates endpoints |
| Certificate Transparency | CT log docs (various) | [Certificates adapter](/docs/adapters/certificates) |
| DNS / RDAP / WHOIS | IANA + registry docs | [DNS adapter](/docs/adapters/dns) |

## Graph / transform tools

| Resource | URL |
|----------|-----|
| Maltego Transform Hub | https://www.maltego.com/transform-hub/ |
| Maltego transform development docs | https://docs.maltego.com/ |

Transform model: inbound entity → query external source → return new entities. Maps to [Plugin SDK](/docs/platform/plugin-sdk) and [Correlation](/docs/architecture/correlation).

## Maps / geospatial

| Resource | URL |
|----------|-----|
| OpenStreetMap documentation | https://wiki.openstreetmap.org/ |
| Overpass API | https://wiki.openstreetmap.org/wiki/Overpass_API |
| Overpass Turbo | https://overpass-turbo.eu/ |
| Bellingcat geolocation guides | https://bellingcat.gitbook.io/toolkit |

## Archives / verification

| Resource | URL |
|----------|-----|
| Internet Archive | https://archive.org/ |
| Wayback CDX API | Internet Archive developer docs |
| Google Fact Check Tools | https://toolbox.google.com/factcheck/ |
| Bellingcat verification guides | https://bellingcat.gitbook.io/toolkit |

## Privacy / safety (policy reading)

| Resource | URL |
|----------|-----|
| EFF Surveillance Self-Defense | https://ssd.eff.org/ |
| FTC data broker resources | https://www.ftc.gov/ |
| CISA privacy resources | https://www.cisa.gov/ |

Consolidated policy guidance for builders: [Safety & policy](/docs/safety/policy).
