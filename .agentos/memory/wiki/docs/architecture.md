---
slug: docs/architecture
title: Architecture
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# Architecture

Source: `docs/architecture.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Architecture

## Apps

- `apps/command-center`: Next.js, React, Phaser.
- `apps/api`: Fastify mock-mode API.
- `apps/worker`: mock agent runner heartbeat.
- `apps/gateway`: local tool gateway stub.

## Packages

- `shared`: types and seed data.
- `game-schema`: data-driven office interactables.
- `memory`: memory creation and keyword search.
- `token-manager`: budget evaluation and hard-stop logic.

## Data

The MVP stores data in memory. Docker Compose provides Postgres and Redis for the next implementation pass.

## Related

- [[index]]
- [[areas/repo-layout]]
