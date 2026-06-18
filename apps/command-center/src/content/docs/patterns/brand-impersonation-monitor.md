# Brand impersonation monitor

Find public **lookalike domains**, fake pages, and impersonation indicators.

## Goal

Protect a brand you represent — domains, logos, official handles.

## Inputs

- Brand name
- Authorized domain
- Logo image (hash / perceptual hash)
- Official social handles

## Components

- [Search adapter](/docs/adapters/search-engines)
- Domain permutation generator (typosquat patterns)
- [DNS adapter](/docs/adapters/dns)
- Screenshot collector
- Visual similarity checker
- [Evidence vault](/docs/components/evidence-vault)

## UI

- Suspect domain table
- Screenshot gallery
- Similarity score column
- Evidence pack export
- Takedown prep checklist (links only — no legal advice)

## Scope mode

**Organization-risk mode** — [Safety & policy](/docs/safety/policy).
