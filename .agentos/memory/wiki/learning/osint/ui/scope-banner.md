---
slug: learning/osint/ui/scope-banner
title: Scope Banner
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Scope Banner

Source: `apps/command-center/src/content/docs/ui/scope-banner.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/ui/scope-banner` (flous.dev/docs).

## Article

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

## Related

- [[learning/osint/index]]
- [[index]]
