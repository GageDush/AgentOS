---
slug: flows/pipeline
title: Agent pipeline
tags: [pipeline, routing, auto-indexed]
archived: false
valid_from: 2026-06-12
---
# Agent pipeline

Conditional control flow from `.agentos/agent-registry.json` (not a fixed assembly line).

## Default pipeline

1. `admin-agent`
2. `task-classifier`
3. `context-minimizer?`
4. `quota-steward`
5. `planner-partitioner?`
6. `specialists?`
7. `qa-agent?`
8. `security-auditor?`
9. `code-reviewer?`
10. `release-manager?`
11. `admin-agent`

## Core agents

- [[agents/admin-agent]]
- [[agents/task-classifier]]
- [[agents/context-minimizer]]
- [[agents/quota-steward]]
- [[agents/planner-partitioner]]
- [[agents/product-agent]]
- [[agents/architect-agent]]
- [[agents/repo-cartographer]]
- [[agents/code-implementer]]
- [[agents/systems-synthesizer]]
- [[agents/memory-curator]]
- [[agents/qa-agent]]
- [[agents/code-reviewer]]
- [[agents/security-auditor]]
- [[agents/release-manager]]
- [[agents/frontend-ui-agent]]
- [[agents/backend-service-agent]]

## Addon agents

- [[agents/database-migration-agent]]
- [[agents/integration-broker]]
- [[agents/docs-agent]]
- [[agents/issue-intake-researcher]]

## Principles

- conditional_not_linear
- agents_receive_envelopes_not_transcripts
- reviewers_do_not_implement
- deterministic_checks_beat_llm_opinions
- subscription_capacity_is_premium_fuel
- no_agent_self_approval
- memory_is_curated_not_dumped
- compact_agent_reports_only

## Related

- [[packages/runtime]]
- [[packages/orchestrator]]
- [[index]]
