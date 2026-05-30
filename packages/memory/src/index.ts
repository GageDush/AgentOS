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

export const searchMemories = (memories: MemoryRecord[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return memories.filter((memory) => !memory.archived);

  return memories.filter((memory) => {
    if (memory.archived) return false;
    const haystack = [
      memory.title,
      memory.content,
      memory.source,
      memory.type,
      ...memory.tags
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
};
