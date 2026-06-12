import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "@agentos/persistence";
import type { MemoryUpdateEnvelope, WikiEditProposal } from "@agentos/shared";
import { nowIso } from "@agentos/shared";

export type QueuedMemoryUpdate = MemoryUpdateEnvelope & {
  id: string;
  queuedAt: string;
  memoryKeys: string[];
  wikiEdits?: WikiEditProposal[];
};

type MemoryQueueFile = {
  version: 1;
  items: QueuedMemoryUpdate[];
};

function queuePath(repoRoot: string) {
  return join(repoRoot, ".agentos", "state", "memory-queue.json");
}

function loadQueue(repoRoot: string): MemoryQueueFile {
  const path = queuePath(repoRoot);
  if (!existsSync(path)) return { version: 1, items: [] };
  try {
    return JSON.parse(readFileSync(path, "utf8")) as MemoryQueueFile;
  } catch {
    return { version: 1, items: [] };
  }
}

function saveQueue(repoRoot: string, file: MemoryQueueFile) {
  const path = queuePath(repoRoot);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(file, null, 2), "utf8");
}

export function enqueueMemoryUpdates(
  updates: Array<{ envelope: MemoryUpdateEnvelope; keys: string[]; wikiEdits?: WikiEditProposal[] }>,
  repoRoot = findRepoRoot()
): QueuedMemoryUpdate[] {
  const file = loadQueue(repoRoot);
  const queued: QueuedMemoryUpdate[] = [];

  for (const item of updates) {
    if (!item.keys.length) continue;
    const entry: QueuedMemoryUpdate = {
      ...item.envelope,
      id: `memq-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      queuedAt: nowIso(),
      memoryKeys: item.keys,
      wikiEdits: item.wikiEdits ?? item.envelope.wikiEdits
    };
    file.items.unshift(entry);
    queued.push(entry);
  }

  file.items = file.items.slice(0, 100);
  saveQueue(repoRoot, file);
  return queued;
}

export function listQueuedMemoryUpdates(repoRoot = findRepoRoot(), runId?: string) {
  const file = loadQueue(repoRoot);
  if (!runId) return file.items;
  return file.items.filter((item) => item.runId === runId);
}

export function resolveQueuedMemoryUpdate(queueId: string, repoRoot = findRepoRoot()) {
  const file = loadQueue(repoRoot);
  const index = file.items.findIndex((item) => item.id === queueId);
  if (index < 0) return undefined;
  const [item] = file.items.splice(index, 1);
  saveQueue(repoRoot, file);
  return item;
}
