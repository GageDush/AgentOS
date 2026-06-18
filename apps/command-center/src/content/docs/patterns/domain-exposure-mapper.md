# Domain exposure mapper

Map **public-facing assets** for an owned or authorized domain.

## Goal

Asset inventory and exposure review for domains you control or have written permission to assess.

## Inputs

- Root domain
- Known subdomains (seed list)
- Organization name

## Components

- [DNS adapter](/docs/adapters/dns)
- [Certificate transparency adapter](/docs/adapters/certificates)
- [Internet exposure adapter](/docs/adapters/internet-exposure)
- Technology detector (banner / header fingerprint)
- Asset [Graph](/docs/ui/graph)
- Risk tagger
- [Report builder](/docs/ui/report-builder)

## UI

- Asset table (sortable)
- Subdomain graph
- Open service cards
- Certificate timeline
- Change tracker across collection runs

## Reference

[OWASP Amass](https://owasp.org/www-project-amass/) — collection engine + asset database + visualization subcommands.

## Scope mode

**Owned-domain mode** — [Safety & policy](/docs/safety/policy).
