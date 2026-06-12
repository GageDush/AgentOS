---
slug: docs/memory-and-token-systems
title: Memory And Token Systems
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# Memory And Token Systems

Source: `docs/memory-and-token-systems.md` (excerpt; secrets redacted).

## Excerpt

# Memory and Token Systems

## Memory

The MVP supports structured memory records, keyword search, and agent/task attachment fields. The schema is ready to expand into vector chunks later.

## Token and Credit Manager

The MVP tracks mock usage events, budgets, warning thresholds, and hard stops. Real provider calls should call the budget evaluator before any LLM request.

## Related

- [[index]]
- [[areas/repo-layout]]
