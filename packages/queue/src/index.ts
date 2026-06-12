export type QueueBackend = "local" | "redis";

export type MissionRunJob = {
  runId: string;
  enqueuedAt: string;
};

const localQueue: MissionRunJob[] = [];

export function getQueueBackend(): QueueBackend {
  const raw = process.env.AGENTOS_QUEUE_BACKEND?.trim().toLowerCase();
  if (raw === "redis" && process.env.REDIS_URL?.trim()) return "redis";
  return "local";
}

export async function enqueueMissionRun(runId: string) {
  const job: MissionRunJob = { runId, enqueuedAt: new Date().toISOString() };
  if (getQueueBackend() === "redis") {
    // Redis/BullMQ dispatch is deferred until hosted AGENTOS_QUEUE_BACKEND=redis is configured.
    // Local dev continues to use the in-process worker poll loop.
    localQueue.push(job);
    return { backend: "redis" as const, queued: true, job, note: "Redis adapter stub — job mirrored to local queue." };
  }
  localQueue.push(job);
  return { backend: "local" as const, queued: true, job };
}

export function dequeueMissionRunJobs(limit = 10) {
  return localQueue.splice(0, limit);
}

export function peekMissionRunQueue() {
  return [...localQueue];
}
