# Storage

OSINT tools need **three storage tiers**: raw artifacts, structured entities, and presentation indexes.

## Suggested stores

| Store | Use case |
|-------|----------|
| **SQLite** | Local-first single-analyst tools |
| **PostgreSQL** | Multi-user workspaces |
| **Object storage** | Screenshots, HTML dumps, media |
| **Graph database** | Large relationship exploration |
| **Search index** | Full-text on notes, snippets, parsed HTML |

## What to persist

1. **Raw artifacts** — immutable responses (`raw_artifacts`)
2. **Normalized entities** — canonical values (`entities`)
3. **Relationships** — graph edges (`relationships`)
4. **Evidence items** — claims + citations (`evidence_items`)
5. **Audit logs** — tool usage ([Audit logs](/docs/components/audit-logs))

## Local-first default

Start with SQLite + filesystem object store. Promote to Postgres when you need concurrent analysts or remote workers.

## Retention

Tie retention rules to `scope_id` from [Scope banner](/docs/ui/scope-banner) and [Safety & policy](/docs/safety/policy).

## Schema

Full table definitions: [Data model](/docs/platform/data-model).

Amass-style asset DBs are a good reference for separating **intel events** from **current asset snapshot** ([OWASP Amass](https://owasp.org/www-project-amass/)).
