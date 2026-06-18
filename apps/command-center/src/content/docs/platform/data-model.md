# Data model

Core SQL tables for a component-style OSINT tool.

## `sources`

```sql
id
name
type
base_url
auth_type
rate_limit
terms_note
risk_level
created_at
updated_at
```

## `collection_jobs`

```sql
id
source_id
input_type
input_value
status
started_at
completed_at
error
scope_id
```

## `raw_artifacts`

```sql
id
job_id
source_id
content_type
storage_path
hash
captured_at
```

## `entities`

```sql
id
type
value
canonical_value
confidence
first_seen
last_seen
created_at
updated_at
```

## `relationships`

```sql
id
from_entity_id
to_entity_id
relationship_type
confidence
source_id
evidence_id
created_at
```

## `evidence_items`

```sql
id
claim
source_id
url
archive_url
screenshot_path
raw_artifact_id
captured_at
confidence
notes
```

## `reports`

```sql
id
title
scope_id
summary
created_by
created_at
export_path
```

## `audit_logs`

```sql
id
user_id
action
input_value
source_id
scope_id
timestamp
metadata
```

## Entity types

See [Entity model](/docs/architecture/entity-model) for canonical `type` enum values.

## Storage notes

[Storage](/docs/architecture/storage) — when to promote SQLite → Postgres, object store for blobs.
