---
slug: docs/demo/acceptance_criteria
title: ACCEPTANCE CRITERIA
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# ACCEPTANCE CRITERIA

Source: `docs/demo/ACCEPTANCE_CRITERIA.md` (excerpt; secrets redacted).

## Excerpt

# AgentOS Demo-Worthy Acceptance Criteria

1. **Given** a fresh `pnpm demo`, **when** the operator opens `http://localhost:3000`, **then** the Forge dashboard loads with live API data (no silent seed fallback).
2. **Given** the dashboard, **when** the operator clicks **Run Platform Demo**, **then** a mission runs through the worker and gateway typecheck completes.
3. **Given** a risky command mission, **when** Control Gate triggers, **then** approve-once / approve-for-mission / deny work from UI and chat.
4. **Given** an active run, **when** the operator opens Blackbox, **then** routing, agent steps, and audit events are visible.
5. **Given** Discord configured, **when** `pnpm discord:smoke:full` runs, **then** guild channels, webhooks, and bot identity pass.
6. **Given** plain-language app request, **when** questionnaire generates, **then** answers persist on the mission before run.
7. **Given** Ollama running, **when** chat sends a message, **then** a model or mock fallback response returns.
8. **Given** completed mission, **when** archive is searched, **then** output is retrievable by keyword.
9. **Given** Cloudflare tunnel up, **when** visiting `https://flous.dev`, **then** Command Center and `https://api.flous.dev/health` respond.
10. **Given** generated user app mission (future), **when** complete, **then** preview opens outside monorepo at `AGENTOS_OUTPUT_DIR`.

## Related

- [[index]]
- [[areas/repo-layout]]
