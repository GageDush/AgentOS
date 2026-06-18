# Correlation

The **correlation engine** builds relationships between entities for graphs, timelines, and reports.

## Relationship examples

| Type | Meaning |
|------|---------|
| `RESOLVES_TO` | Domain → IP |
| `HOSTED_ON` | Service → IP |
| `MENTIONS` | Post → Entity |
| `LINKS_TO` | Page → URL |
| `APPEARS_IN` | Image → Article |
| `ARCHIVED_AS` | URL → Snapshot |
| `USES_CERTIFICATE` | Host → Cert |
| `SAME_AS` | High-confidence duplicate |
| `POSSIBLY_SAME_AS` | Resolver uncertainty |
| `CONTRADICTS` | Conflicting claims |
| `SUPPORTS` | Corroborating evidence |

## Output

- Graph (nodes + edges) for [Graph UI](/docs/ui/graph)
- Relationship table for SQL exports
- Edge confidence + `evidence_id` on every link

## False links

Entity resolution can create false positives. Always:

- Prefer `POSSIBLY_SAME_AS` over `SAME_AS` when score < threshold
- Store resolver score and method on the edge
- Let analysts confirm or split entities in the UI

## Implementation

`graph-service` in [Backend services](/docs/platform/backend-services) materializes views from `relationships` table — see [Data model](/docs/platform/data-model).

Maltego-style transforms map cleanly: inbound entity → API query → outbound entities ([Maltego Transform Hub](https://www.maltego.com/transform-hub/)).
