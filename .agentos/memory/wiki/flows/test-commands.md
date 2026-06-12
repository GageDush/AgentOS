---
slug: flows/test-commands
title: Test commands
tags: [qa, verification]
archived: false
---

# Test commands

Canonical verification commands for [[index|AgentOS]] missions.

## Default stack

- `pnpm sanitize:check`
- `pnpm agentos:validate-profiles`
- `pnpm typecheck`
- `pnpm test`

## Acceptance

- `pnpm acceptance:gate` — typecheck, unit, profiles, discord, optional live smoke
- `pnpm smoke:full` — ground-up spine validation

## Related

- [[packages/runtime]] — runs commands via gateway during missions
- [[areas/risk-areas]] — paths that need extra care before changing tests
