---
slug: flows/memory-curator
title: Memory curator flow
tags: [memory, curation]
archived: false
---

# Memory curator flow

Runs at the **end** of `executeAgentPipelineStep` when runtime passes `memoryUpdates: true`. See [[flows/pipeline#memory-loop]] for how read and write connect.

## Write sequence

1. Each specialist `AgentReport` (except `systems-synthesizer`) → `MemoryUpdateEnvelope` via `buildMemoryUpdateFromReport`
2. `processMemoryUpdate` routes by flag:
   - **Wiki on** (`FEATURE_MEMORY_WIKI=true`): `proposeWikiMerges` → target slugs from keys + `areasTouched`
   - **Wiki off**: append dated notes to legacy `.agentos/memory/*.md`
3. **Confidence ≥ 0.85** and `AGENTOS_MEMORY_WIKI_WRITE` → auto `applyWikiEdits` (section merge + manifest rebuild)
4. **Lower confidence** → `memory-queue.json` → Forge approve/dismiss (`GET /memory/queue`, `POST /memory/queue/:id/approve`)

Approved edits land in [[index|wiki]] articles with `[[wikilinks]]`. The next mission's context-minimizer read path picks them up via `_meta/index.json`.

## Key mappings

| Memory key | Wiki slug |
| --- | --- |
| `test-commands` | [[flows/test-commands]] |
| `risk-areas` | [[areas/risk-areas]] |
| `code-ownership-map` | [[areas/code-ownership]] |
| `dependency-graph` | [[areas/dependency-graph]] |
| `repo-map` | [[areas/repo-layout]] |

Package paths in `areasTouched` also resolve to `packages/*` articles.

## Rules

- `MemoryUpdateEnvelope` only — never full transcripts
- Contradictions in test commands or risk areas → escalate to [[agents/admin-agent]]
- Background sync (Cursor, ChatGPT, repo index) also attributes writes to `memory-curator`

## Related

- [[flows/pipeline]]
- [[packages/agents]]
- [[packages/memory]]
- [[areas/repo-layout]]
