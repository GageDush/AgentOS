---
slug: learning/osint/patterns/self-osint-audit
title: Self Osint Audit
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Self Osint Audit

Source: `apps/command-center/src/content/docs/patterns/self-osint-audit.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/patterns/self-osint-audit` (flous.dev/docs).

## Article

# Self-OSINT audit

Help a user find and reduce **their own** public exposure.

## Goal

Privacy audit — not third-party targeting.

## Inputs

- Name (optional)
- Known usernames (user-provided)
- Owned domains
- Public emails user acknowledges
- Social links provided by the user

## Components

- [Search adapter](/docs/adapters/search-engines)
- [Archive adapter](/docs/adapters/archives)
- Public profile checker (user-supplied handles only)
- [Evidence vault](/docs/components/evidence-vault)
- [Redaction engine](/docs/components/redaction-engine)
- Cleanup checklist generator

## UI

- Exposure score (informational)
- Public links table
- Data type badges (username, image, address, etc.)
- Cleanup priority list
- Opt-out / removal tracker

## Scope mode

Use **self-audit mode** — see [Safety & policy](/docs/safety/policy).

## Related

- [[learning/osint/index]]
- [[index]]
