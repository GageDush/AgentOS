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

## Memory loop

Wiki memory is not a separate subsystem — it is the **read/write loop** around every mission when `FEATURE_MEMORY_WIKI=true`. See [[flows/memory-curator]] for write-path detail and [[packages/memory]] for the library surface.

### Read path (before specialists)

1. **Orchestrator** adds `context-minimizer` to the supporting roster when `requiresRepoContext` is true.
2. **Runtime** (`packages/runtime`) calls `shouldRunContextMinimizer()` — also triggers on prior failures, lane escalation, large rosters, or high token pressure.
3. **Context-minimizer** (`buildContextPacket`) loads the wiki:
   - Scores `_meta/index.json` manifest entries against task type, repo paths, and goal text
   - Seeds up to six articles, expands via `[[wikilinks]]`, ranks **sections** (not whole files)
   - Returns a `ContextPacket` with `memoryIncluded`, `riskAreas`, `suggestedCommands`, and wiki audit fields
4. Legacy flat files under `.agentos/memory/*.md` are skipped when the wiki flag is on.

Downstream **consumers** of the packet:

| Agent | Wiki-derived fields used |
| --- | --- |
| Primary specialist | `repoPaths`, dispatch scope |
| `qa-agent` | `suggestedCommands` (e.g. [[flows/test-commands]]) |
| `code-reviewer`, `security-auditor` | `riskAreas` (e.g. [[areas/risk-areas]]) |
| `release-manager` | Full packet at release gate |

Gate agents are read-only — they do not write memory during their step.

### Write path (after specialists)

1. **Runtime** runs `executeAgentPipelineStep` with `memoryUpdates: true` after primary, planner, gates, and `systems-synthesizer`.
2. Each specialist `AgentReport` → `MemoryUpdateEnvelope` via `buildMemoryUpdateFromReport` (areas touched, artifacts, suggested keys, confidence).
3. **Memory-curator** (`processMemoryUpdate`):
   - Maps keys to wiki slugs (e.g. `test-commands` → [[flows/test-commands]], package paths → [[packages/agents]])
   - **Confidence ≥ 0.85** and `AGENTOS_MEMORY_WIKI_WRITE` enabled → `proposeWikiMerges` + `applyWikiEdits` (timestamped section lines, manifest rebuild)
   - **Lower confidence** → `memory-queue.json` for operator review in Forge (`ForgeMemoryQueuePanel` → `POST /memory/queue/:id/approve`)
4. Approved or auto-applied edits are visible on the **next mission** via manifest-first retrieval.

Envelopes only — never full transcripts. Same governance pattern as release approval: agents propose, operator confirms when uncertain.

### Background ingest (feeds future reads)

| Source | Command / API | Wiki destination |
| --- | --- | --- |
| Repo structure | `pnpm wiki:index-repo` | `packages/*`, `apps/*`, `agents/*`, `areas/*` |
| Cursor sessions | `POST /memory/wiki/sync-cursor` | `sessions/cursor/*` |
| ChatGPT planning | `POST /memory/wiki/sync-chatgpt` | `planning/chatgpt/*` |

All ingest attributed to `memory-curator` with run IDs for provenance. Secrets redacted before write.

### Feature flags

| Variable | Effect |
| --- | --- |
| `FEATURE_MEMORY_WIKI=true` | Read path uses wiki; legacy flat files excluded |
| `AGENTOS_MEMORY_WIKI_WRITE=true` | High-confidence auto-merge allowed |
| `AGENTOS_CURSOR_WIKI_SYNC=true` | Background Cursor → wiki sync |
| Wiki off | Same pipeline; curator appends dated notes to legacy `.agentos/memory/*.md` |

### Closed loop (one line)

**Route** → **context-minimizer reads wiki** → **specialists + gates act on packet** → **memory-curator writes learnings back** → **next mission manifest retrieval picks them up**.

## Related

- [[packages/runtime]]
- [[packages/orchestrator]]
- [[packages/memory]]
- [[flows/memory-curator]]
- [[flows/test-commands]]
- [[index]]
