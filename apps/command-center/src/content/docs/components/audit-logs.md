# Audit logs

Records **how the tool was used** for accountability and debugging.

## Log fields

- User / operator ID
- Query or input entity
- Source adapter accessed
- Timestamp
- Export action (format, redaction mode)
- Scope policy ID
- Tool version / git SHA

## Table

`audit_logs` — [Data model](/docs/platform/data-model).

## Service

`policy-service` writes audit rows when scope rules are applied — [Backend services](/docs/platform/backend-services).

## UI

Admin-only log viewer; optional export for compliance review. Do not expose raw logs to untrusted tenants.

## Related

- [Scope banner](/docs/ui/scope-banner)
- [Safety & policy](/docs/safety/policy)
