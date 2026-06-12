/**
 * Routine scheduler — polls API for due routines and triggers mission runs.
 * Hosted cron/BullMQ repeat jobs can replace this loop when AGENTOS_QUEUE_BACKEND=redis.
 */
export {};

const apiBase = process.env.AGENTOS_API_URL ?? "http://127.0.0.1:8787";
const intervalMs = Number(process.env.AGENTOS_SCHEDULER_INTERVAL_MS ?? 60_000);

async function tick() {
  try {
    const routines = (await fetch(`${apiBase}/routines`).then((r) => r.json())) as Array<{
      id: string;
      title: string;
      enabled: boolean;
      frequency: string;
      nextRunAt?: string;
    }>;
    const now = Date.now();
    const due = routines.filter(
      (routine) =>
        routine.enabled &&
        routine.frequency !== "manual" &&
        routine.nextRunAt &&
        new Date(routine.nextRunAt).getTime() <= now
    );
    for (const routine of due) {
      const response = await fetch(`${apiBase}/routines/${routine.id}/run`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      console.log(
        JSON.stringify({
          service: "AgentOS Scheduler",
          event: "routine.run",
          routineId: routine.id,
          title: routine.title,
          ok: response.ok,
          payload,
          timestamp: new Date().toISOString()
        })
      );
    }
    if (due.length === 0) {
      console.log(
        JSON.stringify({
          service: "AgentOS Scheduler",
          event: "tick",
          due: 0,
          routines: routines.length,
          timestamp: new Date().toISOString()
        })
      );
    }
  } catch (cause) {
    console.error(
      JSON.stringify({
        service: "AgentOS Scheduler",
        event: "error",
        message: cause instanceof Error ? cause.message : "scheduler tick failed",
        timestamp: new Date().toISOString()
      })
    );
  }
}

await tick();
setInterval(() => {
  void tick();
}, intervalMs);
