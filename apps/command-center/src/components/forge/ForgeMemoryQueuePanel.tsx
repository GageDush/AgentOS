"use client";

import { useCallback, useEffect, useState } from "react";
import { MagneticButton } from "@agentos/ui";
import { apiGet, apiPost } from "../../lib/agentos-api";

export type MemoryQueueItem = {
  id: string;
  queuedAt: string;
  memoryKeys: string[];
  wikiEdits?: Array<{ targetSlug: string; section?: string; markdownPatch: string }>;
  summary?: string;
  sourceAgent?: string;
  missionId?: string;
  runId?: string;
};

type MemoryQueueResponse = {
  items: MemoryQueueItem[];
};

export function ForgeMemoryQueuePanel({ runId }: { runId?: string }) {
  const [items, setItems] = useState<MemoryQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    const path = runId ? `/memory/queue?runId=${encodeURIComponent(runId)}` : "/memory/queue";
    const data = await apiGet<MemoryQueueResponse>(path, { items: [] });
    setItems(data.items ?? []);
    setLoading(false);
  }, [runId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function resolveItem(id: string, action: "approve" | "dismiss") {
    setBusyId(id);
    try {
      await apiPost(`/memory/queue/${id}/${action}`, {});
      await refresh();
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <div className="forge-memory-queue">
      <div className="forge-memory-queue-header">
        <strong>Memory curator queue</strong>
        <MagneticButton size="sm" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </MagneticButton>
      </div>
      {loading ? <p className="forge-muted-copy">Loading queued memory updates…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="forge-muted-copy">No queued memory updates for this run.</p>
      ) : null}
      {items.map((item) => (
        <div className="forge-memory-queue-item" key={item.id}>
          <div>
            <span className="forge-mono" style={{ fontSize: "0.68rem" }}>
              {item.wikiEdits?.length
                ? item.wikiEdits.map((edit) => `[[${edit.targetSlug}]]`).join(" · ")
                : item.memoryKeys.join(", ")}
            </span>
            <p>{item.summary ?? "Pending memory update"}</p>
            <p className="forge-muted-copy" style={{ fontSize: "0.75rem" }}>
              {item.sourceAgent ?? "memory-curator"} · {new Date(item.queuedAt).toLocaleString()}
            </p>
          </div>
          <div className="button-row forge-button-row">
            <MagneticButton
              size="sm"
              variant="primary"
              disabled={busyId === item.id}
              onClick={() => void resolveItem(item.id, "approve")}
            >
              Apply
            </MagneticButton>
            <MagneticButton size="sm" disabled={busyId === item.id} onClick={() => void resolveItem(item.id, "dismiss")}>
              Dismiss
            </MagneticButton>
          </div>
        </div>
      ))}
    </div>
  );
}
