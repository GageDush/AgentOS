---
slug: docs/sanitization_policy
title: SANITIZATION POLICY
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# SANITIZATION POLICY

Source: `docs/SANITIZATION_POLICY.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Sanitization Policy

AgentOS must be treated as a new product identity.

## Canonical names

| Concept | AgentOS name |
|---|---|
| Product | AgentOS |
| Dashboard | AgentOS Command Center |
| Runtime | AgentOS Runtime |
| Gateway | AgentOS Gateway |
| Main orchestrator | AgentOS Operator |
| Default agent team | AgentOS Production Team |
| CLI command | `agentos` |
| Environment variable prefix | `AGENTOS_` |

## Forbidden product-facing references

Do not use inherited/source-project names in product-facing code, prompts, UI, commands, package metadata, runtime logs, or agent personalities.

Forbidden outside legal/reference files:

[code block omitted]

## Allowed location for third-party references

Original-source provenance, license notes, and legally required attribution may exist only in:

[code block omitted]

## Source areas to sanitize

[code block omitted]

## Required CI behavior

Every pull request should run:

[code block omitted]

The check must fail if forbidden branding appears outside legal/reference files.

## Related

- [[index]]
- [[areas/repo-layout]]
