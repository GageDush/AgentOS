---
slug: docs/design/wiki-graph-view-spec
title: Wiki Graph View Spec
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Wiki Graph View Spec

Source: `docs/design/wiki-graph-view-spec.md` (excerpt; secrets redacted).

## Excerpt

# Memory Wiki — Interactive Graph View (Spec)

**Status:** Draft for implementation  
**Author:** Cursor (AgentOS)  
**Date:** 2026-06-16  
**Audience:** Implementer (Cursor/Codex), Claude Design (optional polish pass)

## Problem

| Today | Gap |
|-------|-----|
| Wiki articles are linked via `[[wikilinks]]` | Relationships are only visible as flat lists (“Linked articles”, “Backlinks”) |
| `buildWikiGraph()` + `graph.json` exist | No API endpoint or UI consumes the full graph |
| Category chips in sidebar | No spatial overview of how agents, flows, docs, and sessions connect |
| User liked a topic map elsewhere | Need a dedicated **explore** mode alongside **read** mode |

Operators and agents need to **see structure at a glance** before diving into an article.

---

## Goals

1. **Explore** wiki connectivity interactively (pan, zoom, click node → open article).
2. **Reuse** existing `WikiGraph` — no new storage format in Phase 1.
3. **Match** orange Forge theme (`forge-wiki.css`, `agentos-forge.css`).
4. **Perform** acceptably with current corpus (~100–300 nodes; must degrade gracefully at 500+).
5. **Coexist** with current `ForgeWikiView` browse UX (sidebar + article reader).

## Non-goals (Phase 1)

- Integrating Browsegraph extension or forking its repo
- Capturing external browser history
- LLM entity extraction or vector similarity edges
- Editing articles or wikilinks from the graph
- Replacing Icepanel / architecture diagrams (`areas/diagrams/`)
- Indexing `apps/command-center/src/content/docs/` (flous OSINT docs) — separate initiative

---

## User stories

| As a… | I want to… | So that… |
|--------|------------|----------|
| Operator | Open a graph map of all wiki articles | I understand how memory is organized |
| Operator | Click a node | I land on that article in the reader |
| Operator | See the current article highlighted on the map | I know where I am in the network |
| Operator | Filter by category (Agents, Flows, Sessions…) | The graph isn’t overwhelming |
| Agent (via UI) | Focus graph on 1–2 hops from a seed slug | I explore context around a topic |
| Developer | Hit one API for graph JSON | The UI doesn’t read the filesystem directly |

---

## Existing system (do not duplicate)

### Data pipeline

[code block omitted]

**Types** (`packages/memory/src/wiki/types.ts`):

[code block omitted]

### Current UI

- **Component:** `apps/comma

## Related

- [[index]]
- [[areas/repo-layout]]
