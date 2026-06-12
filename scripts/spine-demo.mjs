/**
 * AgentOS spine demo: API + gateway tools + mission + gates.
 * Usage: node scripts/spine-demo.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const apiBase = process.env.AGENTOS_API_URL ?? "http://127.0.0.1:8787";
const gatewayBase = process.env.AGENTOS_GATEWAY_URL ?? "http://127.0.0.1:8790";
const report = {
  startedAt: new Date().toISOString(),
  ok: true,
  steps: [],
  env: {
    featureToolExecution: process.env.FEATURE_TOOL_EXECUTION ?? "unset",
    featureLlmToolLoop: process.env.FEATURE_LLM_TOOL_LOOP ?? "unset",
    implementerMode: process.env.AGENTOS_IMPLEMENTER_MODE ?? "gateway"
  }
};

function step(name, ok, detail) {
  report.steps.push({ name, ok, detail, at: new Date().toISOString() });
  if (!ok) report.ok = false;
  console.log(`${ok ? "✓" : "✗"} ${name}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

async function jsonFetch(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, body };
}

try {
  const health = await jsonFetch(`${apiBase}/health`);
  step("api.health", health.ok && health.body?.ok === true, health.body ?? health.status);

  const gwHealth = await jsonFetch(`${gatewayBase}/health`);
  step("gateway.health", gwHealth.ok && gwHealth.body?.ok === true, gwHealth.body ?? gwHealth.status);

  const tool = await jsonFetch(`${gatewayBase}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "read", path: "package.json" })
  });
  step(
    "gateway.tool.read",
    tool.ok && tool.body?.ok === true && Boolean(tool.body?.stdout?.includes("agentos")),
    { exitOk: tool.body?.ok, bytes: tool.body?.stdout?.length ?? 0 }
  );

  const gitStatus = await jsonFetch(`${gatewayBase}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "git.status" })
  });
  step("gateway.tool.git.status", gitStatus.ok && gitStatus.body?.ok === true, {
    preview: String(gitStatus.body?.stdout ?? "").slice(0, 120)
  });

  const demo = await jsonFetch(`${apiBase}/mission/demo/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  });
  const demoRunId = demo.body?.run?.id;
  step("mission.demo.run", demo.ok && Boolean(demoRunId), {
    missionId: demo.body?.mission?.id,
    runId: demoRunId,
    status: demo.body?.run?.status,
    summary: demo.body?.result?.summary?.slice(0, 200)
  });

  if (demoRunId) {
    const gates = await jsonFetch(`${apiBase}/runs/${demoRunId}/gates`);
    step("run.gates", gates.ok, {
      required: gates.body?.required,
      passed: gates.body?.passed,
      pending: gates.body?.pending,
      resultCount: gates.body?.results?.length ?? 0
    });
    report.demoRunId = demoRunId;
    report.gates = gates.body;
  }

  const memory = await jsonFetch(`${apiBase}/memory/queue`);
  step("memory.queue", memory.ok && Array.isArray(memory.body?.items), { count: memory.body?.items?.length ?? 0 });

  const roster = await jsonFetch(`${apiBase}/agents/roster`);
  const ids = roster.body?.agents?.map((a) => a.id) ?? [];
  step("agents.roster", roster.ok && ids.includes("code-implementer"), { count: ids.length });

  report.finishedAt = new Date().toISOString();
} catch (error) {
  report.ok = false;
  report.error = error instanceof Error ? error.message : String(error);
  step("spine.demo", false, report.error);
}

const outDir = join(root, ".agentos", "state");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "spine-demo-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\nReport: ${outPath}`);
console.log(`Spine demo: ${report.ok ? "PASSED" : "FAILED"}`);
process.exit(report.ok ? 0 : 1);
