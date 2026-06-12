import type { MemoryRecord, MemoryType } from "@agentos/shared";
import { nowIso } from "@agentos/shared";

export type MemoryInput = {
  type?: MemoryType;
  title: string;
  content: string;
  source?: string;
  agentId?: string;
  taskId?: string;
  tags?: string[];
  importance?: number;
};

export const createMemory = (input: MemoryInput): MemoryRecord => ({
  id: `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type: input.type ?? "project_memory",
  title: input.title,
  content: input.content,
  source: input.source ?? "dashboard",
  agentId: input.agentId,
  taskId: input.taskId,
  tags: input.tags ?? [],
  importance: input.importance ?? 5,
  archived: false,
  createdAt: nowIso(),
  updatedAt: nowIso()
});

function memoryHaystack(memory: MemoryRecord) {
  return [memory.title, memory.content, memory.source, memory.type, ...memory.tags].join(" ").toLowerCase();
}

export const searchMemories = (memories: MemoryRecord[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return memories.filter((memory) => !memory.archived);

  return rankMemories(
    memories.filter((memory) => !memory.archived),
    normalized
  );
};

/** Keyword rank (Phase A). Phase B: swap for pgvector adapter. */
export function rankMemories(memories: MemoryRecord[], query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return memories
    .map((memory) => {
      const haystack = memoryHaystack(memory);
      let termScore = 0;
      for (const term of terms) {
        if (haystack.includes(term)) termScore += 10;
        if (memory.title.toLowerCase().includes(term)) termScore += 5;
      }
      const score = termScore + (termScore > 0 ? (memory.importance ?? 0) : 0);
      return { memory, score, termScore };
    })
    .filter((entry) => terms.length === 0 || entry.termScore > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.memory);
}

export type VectorMemoryAdapter = {
  search: (query: string, limit: number) => Promise<MemoryRecord[]>;
};

export const pgvectorMemoryAdapter: VectorMemoryAdapter = {
  async search(_query, _limit) {
    return [];
  }
};

export * from "./wiki/index";
