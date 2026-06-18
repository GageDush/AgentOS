# Redaction engine

Removes **unnecessary sensitive details** before display or export.

## Redaction targets

- Private residential addresses
- Phone numbers
- Personal emails
- Minors' identifiers
- Medical details
- Financial account details
- Credentials and secrets
- Precise live-location indicators

## Output modes

| Mode | Audience |
|------|----------|
| Full internal | Analyst workstation |
| Redacted analyst view | Shared team workspace |
| Public-safe export | External report |

## Pipeline position

```txt
Evidence vault → Redactor → Report builder / API response
```

## Configuration

Rule sets per `scope_id` — see [Safety & policy](/docs/safety/policy).

Pair with [Audit logs](/docs/components/audit-logs) to record which export mode was used.
