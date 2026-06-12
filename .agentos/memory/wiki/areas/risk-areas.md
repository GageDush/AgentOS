---
slug: areas/risk-areas
title: Risk areas
tags: [security, policy, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# Risk areas

Elevated-risk paths and policies. **Values and credentials are never stored in the wiki.**

## High sensitivity (paths only)

- `.env`
- `apps/api/src/discord-auth`
- `packages/persistence/`
- `.agentos/state/`
- `apps/api/src/github`

## Policy

- Default sandbox requires approval for `workspace_write` missions.
- Release Manager gates commits; `AGENTOS_NO_SELF_APPROVAL` blocks implementer self-approve.
- Run `pnpm sanitize:check` before release.

## Related

- [[packages/runtime]]
- [[flows/test-commands]]
