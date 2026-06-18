# Memory Wiki — Interactive Graph View (Spec)

**Status:** Draft for implementation  
**Author:** Cursor (AgentOS)  
**Date:** 2026-06-16  
**Audience:** Implementer (Cursor/Codex), Claude Design (optional polish pass)

---

## Summary

Add an interactive **Map** view to the Memory wiki (`/wiki`) that visualizes the existing wiki link graph — the same data already written to `.agentos/memory/wiki/_meta/graph.json` by `buildWikiGraph()`.

Inspired by [Browsegraph](https://github.com/talperetz/browsegraph) **UX** (pan/zoom graph, click-to-explore, focus on current node), **not** its Chrome-extension browsing capture or GraphRAG pipeline.

**Phase 1 (this spec):** Wikilink graph visualization on existing data.  
**Phase 2 (out of scope):** Semantic GraphRAG, embeddings, auto-extracted entities.

---

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

```text
Markdown articles (.agentos/memory/wiki/**/*.md)
  → parseWikilinks() on load
  → buildWikiGraph(repoRoot)
  → graph.json + index.json (on rebuild)
```

**Types** (`packages/memory/src/wiki/types.ts`):

```ts
type WikiGraph = {
  articles: Record<string, WikiArticleSummary>;
  outbound: Record<string, string[]>;
  inbound: Record<string, string[]>;
};
```

### Current UI

- **Component:** `apps/command-center/src/components/forge/ForgeWikiView.tsx`
- **Route:** `/wiki?slug=...`
- **API:** `GET /memory/wiki`, `GET /memory/wiki/article`, `POST /memory/wiki/search`, etc.
- **Missing:** graph endpoint; graph renderer

### Category helper (reuse)

`wikiCategory(slug)` in `ForgeWikiView.tsx` — map slug prefix → human label:

| Prefix / slug | Category |
|---------------|----------|
| `index` | Home |
| `sessions/cursor` | Cursor sessions |
| `product` | Product |
| `flows` | Flows |
| `agents` | Agents |
| `packages` | Packages |
| `docs` | Documentation |
| `areas` | Areas |
| other | Other |

Use the same function (extract to shared util) for node colors/grouping.

---

## Proposed UX

### View modes (tabs in wiki toolbar)

| Tab | Existing? | Behavior |
|-----|-----------|----------|
| **Browse** | Yes (default) | Current sidebar + article layout |
| **Map** | **New** | Full-width interactive graph canvas |

**URL state:**

- Browse: `/wiki?slug=flows/pipeline` (unchanged)
- Map: `/wiki?view=map`  
- Map + focus: `/wiki?view=map&slug=flows/pipeline` (highlight node, center viewport, optional 1-hop neighborhood emphasis)
- Map + filter: `/wiki?view=map&category=agents`

Do **not** use `view=graph` if `map` is clearer in nav copy (“Map” tab label).

### Map layout (wireframe)

```text
┌─────────────────────────────────────────────────────────────┐
│ [Search wiki…]  [Browse] [Map]   Sync | Rebuild | Wiki home │
├─────────────────────────────────────────────────────────────┤
│ Category: [All] [Agents] [Flows] [Sessions] [Docs] …        │
│ Layout: [Force] [Radial]   Show: [x] labels  [x] orphans    │
├──────────────────────────────┬──────────────────────────────┤
│                              │  Inspector (when node selected)│
│     Interactive graph        │  Title, category, tags         │
│     (pan / zoom / minimap)   │  In: 3  Out: 5                 │
│                              │  [Open article]                │
│                              │  Linked list (fallback a11y)   │
└──────────────────────────────┴──────────────────────────────┘
```

### Interactions

| Action | Result |
|--------|--------|
| Click node | Select node; update `slug` query param; show inspector panel |
| Double-click node | Navigate to Browse tab with that `slug` |
| Click background | Clear selection |
| Scroll / pinch | Zoom (React Flow default) |
| Drag canvas | Pan |
| Hover node | Tooltip: title + inbound/outbound counts |
| Search (toolbar) | Dim non-matching nodes; optionally pan to first match |
| Category filter | Hide nodes outside category; hide edges with no visible endpoints |

### Visual design (Forge)

- Canvas background: `#0A0908` with subtle dot grid (optional, match home hero)
- Nodes: rounded rect, `border: 1px solid rgba(255,255,255,0.07)`, surface `#1C1A17`
- Selected node: accent border `rgba(255,106,53,0.55)`, soft orange glow
- Edges: `rgba(255,255,255,0.12)` default; accent tint for edges touching selected node
- Category colors: distinct hues **derived from orange-adjacent palette** — no blue/violet primaries
- Labels: JetBrains Mono for slug snippet optional; Inter for title on zoom ≥ threshold
- Minimap: bottom-right, low opacity

### Topic map vs link graph

| Lens | Phase | Representation |
|------|-------|----------------|
| **Link graph (Map tab)** | **1** | Nodes = articles; edges = explicit `[[wikilinks]]` |
| **Topic map** | 1.5 optional | Tree/treemap by category + tags (hierarchy, not force graph) |
| **Semantic graph** | 2 | Edges from embeddings / GraphRAG |

Phase 1 ships **link graph only**. Topic map can be a third tab later if hierarchy is still desired.

---

## API

### New endpoint

```
GET /memory/wiki/graph
```

**Response:** `WikiGraph` (same shape as `graph.json`)

```json
{
  "articles": { "flows/pipeline": { "slug", "title", "tags", "path", "updatedAt", "archived" } },
  "outbound": { "flows/pipeline": ["agents/admin-agent", "packages/memory"] },
  "inbound": { "packages/memory": ["flows/pipeline", "flows/memory-curator"] }
}
```

**Implementation:**

```ts
// apps/api/src/index.ts
import { buildWikiGraph } from "@agentos/memory/wiki";

app.get("/memory/wiki/graph", async () => buildWikiGraph(repoRoot));
```

**Notes:**

- Filter `archived: true` articles server-side (consistent with list endpoint).
- Optionally strip articles with zero in+out links unless `?includeOrphans=true`.
- Cache: `Cache-Control: private, max-age=30` acceptable; graph rebuilds are infrequent.
- Do **not** expose raw filesystem paths beyond existing `path` field on summaries.

### Client fetch

```ts
apiGet<WikiGraph>("/memory/wiki/graph", fallbackEmptyGraph)
```

Proxy already routes `/agentos-api` → API `:8787`.

---

## Frontend architecture

### New files

| File | Responsibility |
|------|----------------|
| `apps/command-center/src/components/forge/wiki/WikiGraphCanvas.tsx` | React Flow canvas, layout, events |
| `apps/command-center/src/components/forge/wiki/WikiGraphNode.tsx` | Custom node component |
| `apps/command-center/src/components/forge/wiki/wiki-graph-layout.ts` | Graph → nodes/edges + layout positions |
| `apps/command-center/src/components/forge/wiki/wiki-category.ts` | Shared `wikiCategory()` |
| `apps/command-center/src/components/forge/wiki/wiki-graph.css` | Map-specific styles |

### Modified files

| File | Change |
|------|--------|
| `ForgeWikiView.tsx` | Tab switch Browse/Map; render `WikiGraphCanvas` when `view=map` |
| `forge-wiki.css` | Tab bar + map shell layout |
| `apps/command-center/package.json` | Add `@xyflow/react` (Browsegraph uses React Flow / xyflow) |

### Dependency

```json
"@xyflow/react": "^12.x"
```

Layout helper (optional):

```json
"dagre": "^0.8.5",
"@types/dagre": "^0.7.52"
```

Use **dagre** for deterministic hierarchical layout; **force** mode can use React Flow’s `useNodesState` + simple initial positions by category cluster (no d3 required in v1).

### Graph build algorithm (client)

```text
Input: WikiGraph, filters
1. Filter articles by category + orphan toggle
2. For each article slug → node { id: slug, data: { title, category, inCount, outCount } }
3. For each outbound[target] where both endpoints visible → edge { id, source, target }
4. Run layout (dagre LR or TB; or cluster by category on a grid for perf)
5. Pass to <ReactFlow nodes edges />
```

**Edge direction:** outbound links render as directed edges (arrow). Tooltip: “A links to B”.

**Broken links:** Target slug not in `articles` → skip edge (or render dashed “ghost” node in Phase 1.5).

---

## Performance & limits

| Metric | Target |
|--------|--------|
| Articles displayed (default) | Cap at **200** nodes; show banner “Showing 200 of N — narrow filter” |
| Initial render | < 500ms on dev machine for 150 nodes |
| Re-layout on filter | < 200ms |
| Memory | Avoid re-fetching graph on every slug change; SWR/cache in component |

**Large graph strategy:**

1. Default filter: hide `sessions/cursor/*` leaf nodes unless category = Cursor sessions  
2. “Focus mode”: when `slug` set, show only ego network (seed + hops=1 or 2)  
3. Virtualization: if React Flow struggles, fall back to cluster summary nodes (“12 cursor sessions”) — Phase 1.5

---

## Accessibility

- Map tab keyboard-focusable; inspector lists all visible nodes as fallback
- `aria-label` on canvas: “Wiki link graph”
- Selected node announced via live region
- Double-click / Enter on focused node opens article
- Respect `prefers-reduced-motion`: disable animated layout transitions

---

## Testing

### Unit (`packages/memory` — already exists)

- `buildWikiGraph` correctness — keep `wiki.test.ts`

### New unit (`apps/command-center` or `packages/memory`)

- `wiki-graph-layout.ts`: given fixture graph → expected node/edge counts after filter
- Category filter removes correct nodes

### Manual QA checklist

- [ ] `/wiki?view=map` loads graph without slug
- [ ] Click node updates URL and inspector
- [ ] Double-click opens Browse with article body
- [ ] Category filter Agents shows only agent slugs
- [ ] Rebuild index → refresh map shows new nodes
- [ ] Orange Forge theme; no blue/violet accents
- [ ] Works with stack: `pnpm stack:background`, port 3000

### Optional E2E (Playwright)

- Navigate to map, assert canvas visible, click node with known slug, assert URL contains slug

---

## Acceptance criteria (Phase 1 done when…)

1. `GET /memory/wiki/graph` returns valid `WikiGraph` JSON.
2. Wiki toolbar has **Browse** and **Map** tabs; Map is full-width graph.
3. Graph renders articles as nodes and wikilinks as directed edges.
4. Click/select node shows inspector; double-click opens article in Browse.
5. Category filter and search dim/limit nodes.
6. Styling matches Forge orange dark theme.
7. No regression to existing wiki search, sync, rebuild, or memory queue panel.
8. `pnpm typecheck` passes.

---

## Implementation plan (suggested order)

| Step | Effort | Deliverable |
|------|--------|-------------|
| 1 | S | API `GET /memory/wiki/graph` |
| 2 | S | Extract `wikiCategory()` shared util |
| 3 | M | `wiki-graph-layout.ts` + fixture test |
| 4 | M | `WikiGraphCanvas` + custom node |
| 5 | M | Integrate tabs into `ForgeWikiView` |
| 6 | S | CSS + inspector panel |
| 7 | S | URL param sync (`view`, `slug`, `category`) |
| 8 | S | Manual QA + screenshot for PR |

**Estimated size:** one focused PR (~400–700 LOC).

---

## Phase 2 — Semantic graph (future spec)

Not part of this implementation. Capture intent only:

| Feature | Approach |
|---------|----------|
| Embeddings | Ollama `nomic-embed-text` via existing local stack |
| Storage | SQLite table or pgvector sidecar; not in markdown files |
| Edges | `similar_to` above threshold + explicit wikilinks |
| Retrieval | Extend `expandWikiContext` with vector seeds |
| UI | Toggle “Semantic edges” on Map; dashed lines |

Reference Browsegraph patterns: cmdk search over chunks, side panel graph for current page — map to “current article ego network + semantic neighbors.”

---

## Open questions (resolve before or during implement)

1. **Default map scope:** Full graph vs ego-network when opening Map from an article?  
   - **Recommendation:** If `slug` present → focus 2-hop ego; else category “Flows” or top-degree nodes only.

2. **Sessions noise:** Cursor session articles dominate count — default hidden?  
   - **Recommendation:** Yes; show count badge “48 sessions hidden.”

3. **Run Inspector sidebar:** Hide on Map tab (like wiki P1 polish)?  
   - **Recommendation:** Yes — map needs horizontal space.

4. **Package for React Flow:** `@agentos/command-center` only, not `packages/ui` yet.  
   - **Recommendation:** Keep in command-center until a second consumer exists.

---

## References

- Wiki graph builder: `packages/memory/src/wiki/graph.ts`
- Manifest rebuild: `packages/memory/src/wiki/index-manifest.ts`
- Wiki UI: `apps/command-center/src/components/forge/ForgeWikiView.tsx`
- Design tokens: `packages/ui/src/tokens/agentos-forge.css`
- Browsegraph (UX inspiration): https://github.com/talperetz/browsegraph
- React Flow: https://reactflow.dev/

---

## PR description template

```markdown
## Summary
Adds interactive Map view to Memory wiki — React Flow visualization of wikilink graph.

## Changes
- GET /memory/wiki/graph
- Browse | Map tabs on /wiki
- Category filter, node inspector, Forge styling

## Test plan
- [ ] pnpm stack:background → /wiki?view=map
- [ ] Click/double-click nodes
- [ ] Rebuild index updates graph
- [ ] typecheck
```
