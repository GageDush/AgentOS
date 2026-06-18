# Public datasets

Connects to **open government, research, or institutional datasets**.

## Common inputs

- Dataset ID
- Search term
- Entity name
- Location
- Date range

## Common outputs

- Records (JSON / CSV)
- Table schemas
- Dataset metadata
- License string
- Update frequency

## Useful components

- Dataset browser UI
- Schema mapper → [Entity model](/docs/architecture/entity-model)
- Table normalizer
- Source freshness badge

## Adapter design

- Respect license field on every export
- Cache dataset version + retrieval date
- Map columns explicitly — do not guess PII columns

## Tool patterns

- [Event timeline builder](/docs/patterns/event-timeline-builder) (official records)
- Organization enrichment on [Domain exposure mapper](/docs/patterns/domain-exposure-mapper)
