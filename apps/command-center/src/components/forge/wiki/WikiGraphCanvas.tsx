/* eslint-disable */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WikiGraphNode } from "./WikiGraphNode";
import { buildWikiGraphElements, type WikiFlowNode, type WikiGraph, type WikiNodeData } from "./wiki-graph-layout";
import { categoryColor, wikiCategory, WIKI_CATEGORY_ORDER } from "./wiki-category";
import "./wiki-graph.css";

const nodeTypes = { wiki: WikiGraphNode };

type WikiGraphCanvasProps = {
  graph: WikiGraph;
  selectedSlug: string;
  category: string;
  onSelect: (slug: string) => void;
  onOpen: (slug: string) => void;
  onCategoryChange: (category: string) => void;
};

function CanvasInner({ graph, selectedSlug, category, onSelect, onOpen, onCategoryChange }: WikiGraphCanvasProps) {
  const [search, setSearch] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const [showOrphans, setShowOrphans] = useState(false);

  const layout = useMemo(
    () =>
      buildWikiGraphElements(graph, {
        category,
        search,
        focusSlug: selectedSlug || undefined,
        showSessions,
        showOrphans,
      }),
    [graph, category, search, selectedSlug, showSessions, showOrphans]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<WikiFlowNode>(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layout.edges);

  useEffect(() => {
    setNodes(layout.nodes.map((n) => ({ ...n, selected: n.id === selectedSlug })));
    setEdges(layout.edges);
  }, [layout, selectedSlug, setNodes, setEdges]);

  const presentCategories = useMemo(() => {
    const set = new Set<string>();
    for (const slug of Object.keys(graph.articles)) set.add(wikiCategory(slug));
    return ["all", ...WIKI_CATEGORY_ORDER.filter((c) => set.has(c))];
  }, [graph]);

  const onNodeClick: NodeMouseHandler = (_, node) => onSelect(node.id);
  const onNodeDoubleClick: NodeMouseHandler = (_, node) => onOpen(node.id);

  const selected = selectedSlug ? graph.articles[selectedSlug] : undefined;
  const outbound = selected ? graph.outbound[selectedSlug] ?? [] : [];
  const inbound = selected ? graph.inbound[selectedSlug] ?? [] : [];

  return (
    <div className="wgmap">
      <div className="wgmap-toolbar">
        <div className="wgmap-cats">
          {presentCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`wgmap-chip${category === cat ? " on" : ""}`}
              style={cat !== "all" ? { ["--wg-color" as any]: categoryColor(cat) } : undefined}
              onClick={() => onCategoryChange(cat)}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
        <div className="wgmap-tools">
          <input
            type="search"
            className="wgmap-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dim by title / slug…"
            aria-label="Search graph nodes"
          />
          <label className="wgmap-toggle">
            <input type="checkbox" checked={showSessions} onChange={(e) => setShowSessions(e.target.checked)} />
            Sessions
          </label>
          <label className="wgmap-toggle">
            <input type="checkbox" checked={showOrphans} onChange={(e) => setShowOrphans(e.target.checked)} />
            Orphans
          </label>
        </div>
      </div>

      {(layout.capped || layout.hiddenSessions > 0) && (
        <div className="wgmap-banner">
          {layout.capped ? `Showing ${layout.shown} of ${layout.total} — narrow the filter. ` : `${layout.shown} of ${layout.total} articles. `}
          {layout.hiddenSessions > 0 ? `${layout.hiddenSessions} sessions hidden.` : ""}
        </div>
      )}

      <div className="wgmap-body">
        <div className="wgmap-canvas" aria-label="Wiki link graph">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={() => onSelect("")}
            fitView
            minZoom={0.15}
            maxZoom={1.8}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.06)" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => (n.data as WikiNodeData)?.color ?? "#6F665E"}
              maskColor="rgba(10,9,8,0.7)"
              style={{ background: "var(--forge-bg-raised, #131110)" }}
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className="wgmap-inspector" aria-live="polite">
          {selected ? (
            <>
              <div className="wgmap-insp-cat" style={{ ["--wg-color" as any]: categoryColor(wikiCategory(selectedSlug)) }}>
                {wikiCategory(selectedSlug)}
              </div>
              <h3 className="wgmap-insp-title">{selected.title}</h3>
              <div className="wgmap-insp-slug">{selectedSlug}</div>
              {selected.tags?.length ? (
                <div className="wgmap-insp-tags">
                  {selected.tags.map((t) => (
                    <span key={t} className="wgmap-tag">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="wgmap-insp-counts">
                <span>
                  <b>{inbound.length}</b> in
                </span>
                <span>
                  <b>{outbound.length}</b> out
                </span>
              </div>
              <button type="button" className="wgmap-open" onClick={() => onOpen(selectedSlug)}>
                Open article →
              </button>

              {outbound.length ? (
                <div className="wgmap-insp-links">
                  <p className="wgmap-insp-h">Links to</p>
                  <ul>
                    {outbound.map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => onSelect(s)}>
                          {graph.articles[s]?.title ?? s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {inbound.length ? (
                <div className="wgmap-insp-links">
                  <p className="wgmap-insp-h">Linked from</p>
                  <ul>
                    {inbound.map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => onSelect(s)}>
                          {graph.articles[s]?.title ?? s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <div className="wgmap-insp-empty">
              <p className="wgmap-insp-h">Wiki link graph</p>
              <p>
                Click a node to inspect it, double-click to open the article. {layout.shown} nodes ·{" "}
                {edges.length} links shown.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function WikiGraphCanvas(props: WikiGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default WikiGraphCanvas;
