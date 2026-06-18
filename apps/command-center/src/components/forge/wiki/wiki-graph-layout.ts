/* ────────────────────────────────────────────────────────────────────────
   wiki-graph-layout — turn a WikiGraph (+ filters) into React Flow nodes and
   edges with deterministic positions.

   Layout is a dependency-free category-cluster shelf pack (no dagre / d3):
   nodes group by category, each category block flows left→right and wraps to
   a new shelf — stable for the same input, readable at ~100–300 nodes.
   ──────────────────────────────────────────────────────────────────────── */

import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { categoryColor, wikiCategory, WIKI_CATEGORY_ORDER } from "./wiki-category";

export type WikiArticleSummary = {
  slug: string;
  title: string;
  tags: string[];
  path: string;
  updatedAt: string;
  archived: boolean;
};

export type WikiGraph = {
  articles: Record<string, WikiArticleSummary>;
  outbound: Record<string, string[]>;
  inbound: Record<string, string[]>;
};

export const EMPTY_WIKI_GRAPH: WikiGraph = { articles: {}, outbound: {}, inbound: {} };

export type WikiNodeData = {
  slug: string;
  title: string;
  category: string;
  color: string;
  inCount: number;
  outCount: number;
  dim: boolean;
  focused: boolean;
  [key: string]: unknown;
};

export type WikiFlowNode = Node<WikiNodeData>;

export type LayoutOptions = {
  category?: string; // "all" or a category label
  search?: string;
  focusSlug?: string; // ego-network seed
  hops?: number; // ego hops (default 2)
  showSessions?: boolean; // include sessions/cursor (default false)
  showOrphans?: boolean; // include zero-degree nodes (default false)
  maxNodes?: number; // hard cap (default 200)
};

export type LayoutResult = {
  nodes: WikiFlowNode[];
  edges: Edge[];
  total: number;
  shown: number;
  capped: boolean;
  hiddenSessions: number;
};

const NODE_W = 150;
const NODE_H = 52;
const GAP_X = 26;
const GAP_Y = 22;
const INNER_COLS = 4;
const CLUSTER_GAP = 76;
const HEADER_PAD = 30;
const MAX_SHELF_W = 1500;

function degreeOf(graph: WikiGraph, slug: string): number {
  return (graph.outbound[slug]?.length ?? 0) + (graph.inbound[slug]?.length ?? 0);
}

/** Ego network: all slugs within `hops` of the seed over both edge directions. */
export function egoNetwork(graph: WikiGraph, seed: string, hops: number): Set<string> {
  const seen = new Set<string>([seed]);
  let frontier = [seed];
  for (let h = 0; h < hops; h += 1) {
    const next: string[] = [];
    for (const slug of frontier) {
      const neighbours = [...(graph.outbound[slug] ?? []), ...(graph.inbound[slug] ?? [])];
      for (const n of neighbours) {
        if (!seen.has(n) && graph.articles[n]) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return seen;
}

export function buildWikiGraphElements(graph: WikiGraph, opts: LayoutOptions = {}): LayoutResult {
  const {
    category = "all",
    search = "",
    focusSlug,
    hops = 2,
    showSessions = false,
    showOrphans = false,
    maxNodes = 200,
  } = opts;

  const allSlugs = Object.keys(graph.articles);
  const total = allSlugs.length;

  // 1. candidate set (ego network when focused)
  let candidate =
    focusSlug && graph.articles[focusSlug] ? Array.from(egoNetwork(graph, focusSlug, hops)) : [...allSlugs];

  // 2. category filter
  if (category && category !== "all") {
    candidate = candidate.filter((slug) => wikiCategory(slug) === category);
  }

  // 3. sessions noise — hidden by default unless that category is selected
  let hiddenSessions = 0;
  if (!showSessions && category !== "Cursor sessions") {
    candidate = candidate.filter((slug) => {
      const isSession = wikiCategory(slug) === "Cursor sessions";
      if (isSession && slug !== focusSlug) {
        hiddenSessions += 1;
        return false;
      }
      return true;
    });
  }

  // 4. orphans (degree 0 in the full graph) hidden by default
  if (!showOrphans) {
    candidate = candidate.filter((slug) => slug === focusSlug || degreeOf(graph, slug) > 0);
  }

  // 5. cap by degree, always keeping the focus node
  let capped = false;
  if (candidate.length > maxNodes) {
    capped = true;
    const sorted = [...candidate].sort((a, b) => degreeOf(graph, b) - degreeOf(graph, a));
    const kept = sorted.slice(0, maxNodes);
    if (focusSlug && graph.articles[focusSlug] && !kept.includes(focusSlug)) {
      kept[kept.length - 1] = focusSlug;
    }
    candidate = kept;
  }

  const visible = new Set(candidate);
  const term = search.trim().toLowerCase();

  // 6. positions — category-cluster shelf pack
  const byCategory = new Map<string, string[]>();
  for (const slug of candidate) {
    const cat = wikiCategory(slug);
    const list = byCategory.get(cat) ?? [];
    list.push(slug);
    byCategory.set(cat, list);
  }
  const orderedCats = [
    ...WIKI_CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !WIKI_CATEGORY_ORDER.includes(c as never)),
  ];

  const positions = new Map<string, { x: number; y: number }>();
  let shelfX = 0;
  let shelfY = 0;
  let shelfH = 0;
  for (const cat of orderedCats) {
    const slugs = (byCategory.get(cat) ?? []).sort((a, b) => degreeOf(graph, b) - degreeOf(graph, a));
    const cols = Math.min(INNER_COLS, slugs.length) || 1;
    const rows = Math.ceil(slugs.length / cols);
    const blockW = cols * (NODE_W + GAP_X);
    const blockH = HEADER_PAD + rows * (NODE_H + GAP_Y);
    if (shelfX > 0 && shelfX + blockW > MAX_SHELF_W) {
      shelfX = 0;
      shelfY += shelfH + CLUSTER_GAP;
      shelfH = 0;
    }
    slugs.forEach((slug, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      positions.set(slug, { x: shelfX + c * (NODE_W + GAP_X), y: shelfY + HEADER_PAD + r * (NODE_H + GAP_Y) });
    });
    shelfX += blockW + CLUSTER_GAP;
    shelfH = Math.max(shelfH, blockH);
  }

  // 7. nodes
  const nodes: WikiFlowNode[] = candidate.map((slug) => {
    const summary = graph.articles[slug];
    const cat = wikiCategory(slug);
    const matches = !term || summary.title.toLowerCase().includes(term) || slug.toLowerCase().includes(term);
    return {
      id: slug,
      type: "wiki",
      position: positions.get(slug) ?? { x: 0, y: 0 },
      data: {
        slug,
        title: summary.title,
        category: cat,
        color: categoryColor(cat),
        inCount: graph.inbound[slug]?.length ?? 0,
        outCount: graph.outbound[slug]?.length ?? 0,
        dim: Boolean(term) && !matches,
        focused: slug === focusSlug,
      },
    };
  });

  // 8. edges (directed outbound; both endpoints visible)
  const edges: Edge[] = [];
  for (const slug of candidate) {
    for (const target of graph.outbound[slug] ?? []) {
      if (!visible.has(target)) continue;
      const touchesFocus = slug === focusSlug || target === focusSlug;
      edges.push({
        id: `${slug}->${target}`,
        source: slug,
        target,
        type: "default",
        animated: false,
        style: {
          stroke: touchesFocus ? "rgba(255,106,53,0.55)" : "rgba(255,255,255,0.12)",
          strokeWidth: touchesFocus ? 1.6 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: touchesFocus ? "rgba(255,106,53,0.55)" : "rgba(255,255,255,0.18)",
        },
      });
    }
  }

  return { nodes, edges, total, shown: nodes.length, capped, hiddenSessions };
}
