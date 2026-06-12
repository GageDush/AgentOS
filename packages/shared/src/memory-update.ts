import type { WikiEditProposal } from "./wiki-edit";

export type MemoryUpdateEnvelope = {
  sourceAgent: string;
  missionId?: string;
  runId?: string;
  areasTouched: string[];
  artifacts: string[];
  suggestedMemoryKeys: string[];
  confidence: number;
  summary?: string;
  wikiEdits?: WikiEditProposal[];
};

export type MemoryCuratorResult = {
  agent: "memory-curator";
  status: "complete" | "queued" | "skipped";
  summary: string;
  appliedKeys: string[];
  queuedKeys: string[];
  appliedWikiSlugs?: string[];
  queuedWikiEdits?: WikiEditProposal[];
};
