/* eslint-disable */
"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WikiFlowNode, WikiNodeData } from "./wiki-graph-layout";

export function WikiGraphNode({ data, selected }: NodeProps<WikiFlowNode>) {
  const d = data as WikiNodeData;
  const className = [
    "wgnode",
    selected ? "wgnode--selected" : "",
    d.dim ? "wgnode--dim" : "",
    d.focused ? "wgnode--focus" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className} style={{ ["--wg-color" as any]: d.color }} title={`${d.title}\n${d.category} · in ${d.inCount} · out ${d.outCount}`}>
      <Handle type="target" position={Position.Left} className="wgnode-handle" isConnectable={false} />
      <span className="wgnode-dot" aria-hidden="true" />
      <span className="wgnode-title">{d.title}</span>
      <span className="wgnode-meta">
        {d.category} · {d.inCount}↓ {d.outCount}↑
      </span>
      <Handle type="source" position={Position.Right} className="wgnode-handle" isConnectable={false} />
    </div>
  );
}

export default WikiGraphNode;
