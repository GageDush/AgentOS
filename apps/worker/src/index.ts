import { buildDefaultRuntimeOptions, processPendingMissionRuns } from "@agentos/runtime";

const workerId = process.env.AGENTOS_WORKER_ID ?? "worker-local";
const intervalMs = Number(process.env.AGENTOS_WORKER_INTERVAL_MS ?? 4000);

async function heartbeat() {
  const results = await processPendingMissionRuns(buildDefaultRuntimeOptions({ workerId }));
  console.log(
    JSON.stringify({
      service: "AgentOS Worker",
      mode: "local-safe",
      workerId,
      processed: results.length,
      timestamp: new Date().toISOString()
    })
  );
}

await heartbeat();
setInterval(() => {
  void heartbeat();
}, intervalMs);
