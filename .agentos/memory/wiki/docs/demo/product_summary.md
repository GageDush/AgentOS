---
slug: docs/demo/product_summary
title: PRODUCT SUMMARY
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# PRODUCT SUMMARY

Source: `docs/demo/PRODUCT_SUMMARY.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS — Product Summary

Last updated: 2026-06-12

## What AgentOS is

AgentOS is a **local-first software development operator** — not an app builder.

You give it development work on a real codebase (fix a bug, implement a feature, run checks, review a diff, prepare a release). It routes that work through a **conditional multi-agent pipeline** with sandboxed execution, human approval gates, and audit trails. You operate it from the **Forge Command Center**, **Discord**, or the **Cursor bridge** — all surfaces attach to the same mission runtime.

The core loop is development, not generation:

[code block omitted]

AgentOS is deliberately **mock-mode by default**: without LLM keys, cloud providers, or Discord tokens it still runs end-to-end with deterministic fallbacks. Policy beats autonomy — reviewers do not implement, implementers cannot self-approve, and the Release Manager is the final gate before commit or PR.

Think of it as **an AI dev team you operate** — with Blackbox visibility into routing, agent steps, gates, and audit events.

## End-state vision

| Capability | Target behavior |
|------------|-----------------|
| **Repo development** | Missions change real code via gateway, patch apply, or Cursor SDK dispatch |
| **Conditional agents** | 16+ profiles invoked only when needed — not a fixed assembly line |
| **Safe execution** | Gateway allowlists commands; tool broker for Read/Grep/Shell with sandbox leases |
| **Human gates** | Control Gate for risky commands; release prepare/approve; Discord approve/deny |
| **Multi-surface ops** | Forge UI, Discord guild + operator lanes, `#cursor` channel |
| **Release-aware completion** | Diff → review → human approve → commit/PR — not export-and-done |
| **Hosted production** | Postgres, Redis/BullMQ, multi-worker, Cloudflare tunnel, CI E2E |
| **Memory curation** | Vector search and preference loops — not raw transcript dumps |
| **App intake (secondary)** | Questionnaire scaffold for greenfield UI experiments when explicitly routed |

---

## Current build status

**Overall: ~82% of the 190-step program materially implemented.**

| Phase | Steps | Status | ~% |
|-------|-------|--------|-----|
| Baseline | 1–10 | Done | 95% |
| Operator shell | 11–20 | Mostly done | 85% |
| Live UX / missions | 21–40 | Mostly done | 80% |
| Gateway / chat | 41–60 | Mostly d

## Related

- [[index]]
- [[areas/repo-layout]]
