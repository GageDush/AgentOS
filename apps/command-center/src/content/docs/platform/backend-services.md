# Backend services

Suggested service boundaries for a multi-component OSINT platform.

## `source-registry`

Stores adapter definitions, metadata, rate limits, and terms URLs. Loads [Plugin SDK](/docs/platform/plugin-sdk) manifests.

## `collector-worker`

Runs [collection jobs](/docs/architecture/collection). Writes `raw_artifacts`.

## `parser-worker`

Runs [Parser](/docs/components/parser) on raw artifacts. Emits parsed records.

## `entity-service`

Creates and merges normalized entities via [Entity resolver](/docs/components/entity-resolver).

## `enrichment-service`

Orchestrates [Enrichment](/docs/architecture/enrichment) chains from seed entity IDs.

## `evidence-service`

CRUD for [Evidence vault](/docs/components/evidence-vault) items and citations.

## `graph-service`

Materializes [Correlation](/docs/architecture/correlation) views for [Graph UI](/docs/ui/graph).

## `report-service`

[Report builder](/docs/ui/report-builder) — template render and export.

## `policy-service`

Applies scope rules, [Redaction engine](/docs/components/redaction-engine), and [Audit logs](/docs/components/audit-logs).

## Deployment sketch

```txt
API gateway → job queue → workers (collector, parser) → Postgres/SQLite + object store
```

Local-first: collapse workers into one process with SQLite until you need scale.
