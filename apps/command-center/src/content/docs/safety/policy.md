# Safety & policy

Scope, disallowed use, and privacy resources — read this section **before shipping** a tool to other users.

## What this docs pack is not for

This documentation does **not** endorse or instruct:

- Stalking private individuals
- Doxxing
- Credential discovery
- Bypassing privacy controls
- Scraping restricted or private platforms
- Harassment, intimidation, or targeting

Builders and operators are responsible for how they deploy these components. **You accept the risk** of misuse if you disable or ignore scope controls.

## Policy engine

A `policy-service` (see [Backend services](/docs/platform/backend-services)) should enforce:

- Adapter allowlists per workspace
- Input validation (reject non-public identifiers where mode requires)
- Retention TTL on raw artifacts
- Export redaction defaults
- [Audit logs](/docs/components/audit-logs) on every collection and export

## Recommended scope modes

Configure via [Scope banner](/docs/ui/scope-banner):

| Mode | Intended use |
|------|----------------|
| **Self-audit** | User investigates only their own supplied identifiers |
| **Owned-domain** | Assets for domains the org controls or has authorization to test |
| **Public-event** | Named public events; public sources only |
| **Media-verification** | Single media object + public corroboration |
| **Organization-risk** | Brand protection, impersonation, authorized CTI |

Each mode should ship with a default adapter allowlist and retention rule.

## Redaction defaults

[Redaction engine](/docs/components/redaction-engine) should run on **every** export unless the operator explicitly chooses full internal evidence mode — and that choice must be audit-logged.

Targets: private addresses, phone numbers, personal emails, minors, medical/financial details, credentials, precise live location.

## Privacy resources

Further reading for operators and end users:

- [EFF Surveillance Self-Defense](https://ssd.eff.org/)
- [FTC consumer privacy resources](https://www.ftc.gov/)
- [CISA privacy and civil liberties](https://www.cisa.gov/)

## Source bank

Tool directories and verification methodology links: [Source bank](/docs/reference/source-bank).

## Related components

- [Audit logs](/docs/components/audit-logs)
- [Scope banner](/docs/ui/scope-banner)
- [Self-OSINT audit](/docs/patterns/self-osint-audit) — the recommended on-ramp for personal exposure review
