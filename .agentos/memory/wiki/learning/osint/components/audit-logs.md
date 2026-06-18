---
slug: learning/osint/components/audit-logs
title: Audit Logs
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Audit Logs

Source: `apps/command-center/src/content/docs/components/audit-logs.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/components/audit-logs` (flous.dev/docs).

## Article

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

## Related

- [[learning/osint/index]]
- [[index]]
