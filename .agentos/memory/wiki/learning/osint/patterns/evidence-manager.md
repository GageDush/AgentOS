---
slug: learning/osint/patterns/evidence-manager
title: Evidence Manager
tags: [learning, osint, flous-docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Evidence Manager

Source: `apps/command-center/src/content/docs/patterns/evidence-manager.md` — full body indexed for agent retrieval.
Canonical human reader: `/docs/patterns/evidence-manager` (flous.dev/docs).

## Article

# Evidence manager

Local-first workspace for **sources, claims, and analyst notes**.

## Goal

Single place to collect verification material and ship reports.

## Inputs

- URLs
- Screenshots
- Freeform notes
- Uploaded files
- Named entities

## Components

- [Evidence vault](/docs/components/evidence-vault)
- Claim extractor (optional NLP)
- Tag manager
- Citation manager
- [Redaction engine](/docs/components/redaction-engine)
- [Report builder](/docs/ui/report-builder) templates

## UI

- Evidence board (kanban or grid)
- Claim table linked to evidence IDs
- Entity sidebar
- Source reliability badge
- Export wizard

## Storage

SQLite + filesystem — [Storage](/docs/architecture/storage).

## Related lab

[Lab 2: Evidence vault](/docs/labs/overview#lab-2-build-an-evidence-vault)

## Related

- [[learning/osint/index]]
- [[index]]
