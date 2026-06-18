# Scope banner

Persistent UI strip defining **investigation scope** for the current workspace.

## Displays

- Investigation purpose (mode label)
- Allowed source adapters (checklist)
- Excluded sources
- Data retention rule summary
- Export sensitivity reminder (links to [Safety & policy](/docs/safety/policy))

## Modes

Configured by `policy-service` — see recommended modes in [Safety & policy](/docs/safety/policy):

- Self-audit
- Owned-domain
- Public-event
- Media-verification
- Organization-risk

## Behavior

- Block collection jobs to adapters outside allowlist
- Stamp `scope_id` on jobs, evidence, and [audit logs](/docs/components/audit-logs)
