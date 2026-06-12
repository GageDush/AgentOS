/**
 * Live tool execution proof: gateway tools + code-change mission through API/runtime.
 * Requires stack running (API :8787, gateway :8790).
 * Usage: pnpm tool:smoke:live
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

const apiBase = process.env.AGENTOS_API_URL ?? `http://127.0.0.1:${process.env.AGENTOS_API_PORT ?? "8787"}`;
const gatewayBase = process.env.AGENTOS_GATEWAY_URL ?? `http://127.0.0.1:${process.env.AGENTOS_GATEWAY_PORT ?? "8790"}`;

const report = {
  startedAt: new Date().toISOString(),
  ok: true,
  steps: [],
  env: {
    featureToolExecution: process.env.FEATURE_TOOL_EXECUTION ?? "unset",
    implementerMode: process.env.AGENTOS_IMPLEMENTER_MODE ?? "gateway"
  }
};

function step(name, ok, detail) {
  report.steps.push({ name, ok, detail, at: new Date().toISOString() });
  if (!ok) report.ok = false;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
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
  const gwHealth = await jsonFetch(`${gatewayBase}/health`);
  step("gateway.health", gwHealth.ok && gwHealth.body?.ok === true, gwHealth.body ?? gwHealth.status);

  const readTool = await jsonFetch(`${gatewayBase}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "read", path: "packages/agents/src/tool-broker.ts" })
  });
  step(
    "gateway.tool.read",
    readTool.ok && readTool.body?.ok === true && String(readTool.body?.stdout ?? "").includes("isToolExecutionEnabled"),
    { bytes: readTool.body?.stdout?.length ?? 0 }
  );

  const grepTool = await jsonFetch(`${gatewayBase}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "grep", pattern: "executeTool", path: "packages/agents/src/tool-broker.ts" })
  });
  step("gateway.tool.grep", grepTool.ok && grepTool.body?.ok === true, {
    preview: String(grepTool.body?.stdout ?? "").slice(0, 120)
  });

  const apiHealth = await jsonFetch(`${apiBase}/health`);
  step("api.health", apiHealth.ok && apiHealth.body?.ok === true, apiHealth.body ?? apiHealth.status);

  const mission = await jsonFetch(`${apiBase}/missions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Tool execution live smoke",
      objective: "Fix bug in tool broker export",
      prompt: "Fix bug in packages/agents/src/tool-broker.ts export function",
      command: "pnpm typecheck",
      sandboxLevel: "safe_execute",
      status: "queued"
    })
  });
  const missionId = mission.body?.id;
  step("mission.create", mission.ok && Boolean(missionId), { missionId });

  let runId;
  if (missionId) {
    const run = await jsonFetch(`${apiBase}/missions/${missionId}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    runId = run.body?.run?.id;
    const runStatus = run.body?.run?.status;
    const runSummary = String(run.body?.result?.summary ?? "");
    step("mission.run", run.ok && Boolean(runId), {
      runId,
      status: runStatus,
      summary: runSummary.slice(0, 200)
    });
    if (runStatus === "failed" && /QA gate failed/i.test(runSummary)) {
      step(
        "mission.qa.note",
        true,
        "Run failed on live QA/typecheck after implementer dispatch; gateway tool probe is the primary proof."
      );
    }
    report.missionId = missionId;
    report.runId = runId;
  }

  if (runId) {
    const audit = await jsonFetch(`${apiBase}/audit`);
    const events = Array.isArray(audit.body) ? audit.body : [];
    const dispatch = events.find((event) => event.runId === runId && event.event === "agent.implementer_dispatched");
    const implementerStep = events.find(
      (event) =>
        event.runId === runId && event.event === "agent.step_executed" && event.actor === "code-implementer"
    );
    const implementerReport = implementerStep?.metadata?.report ?? dispatch?.metadata?.report;
    const commandsRun = dispatch?.metadata?.commandsRun ?? implementerReport?.commandsRun ?? [];
    const dispatchMode = dispatch?.metadata?.dispatchMode ?? implementerReport?.dispatchMode;
    const toolProbe =
      Array.isArray(commandsRun) &&
      commandsRun.some((entry) => {
        const value = String(entry);
        return (
          value.startsWith("read:") ||
          value.includes(":read:") ||
          value === "git.status" ||
          value.includes("git.status")
        );
      });

    step("audit.tool_probe", Boolean(toolProbe) && dispatchMode === "gateway", {
      dispatchMode,
      commandsRun: commandsRun.slice(0, 8)
    });

    const gates = await jsonFetch(`${apiBase}/runs/${runId}/gates`);
    step("run.gates", gates.ok, {
      required: gates.body?.required,
      passed: gates.body?.passed,
      pending: gates.body?.pending
    });
    report.gates = gates.body;
  }

  report.finishedAt = new Date().toISOString();
} catch (error) {
  report.ok = false;
  report.error = error instanceof Error ? error.message : String(error);
  step("tool.live.smoke", false, report.error);
}

const outDir = join(root, ".agentos", "state");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "tool-execution-live-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\nReport: ${outPath}`);
console.log(`Tool execution live smoke: ${report.ok ? "PASS" : "FAIL"}`);
process.exit(report.ok ? 0 : 1);
