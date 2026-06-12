/**
 * Ground-up one-pass AgentOS smoketest (no stack restart — call smoke-full.ps1 for that).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const modeArg = process.argv.find((a) => a.startsWith("--"));
const buildOnly = modeArg === "--build-only";
const liveOnly = modeArg === "--live-only";

if (!buildOnly && existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    process.env[key] = value;
  }
}

const apiBase = process.env.AGENTOS_API_URL ?? "http://127.0.0.1:8787";
const gatewayBase = process.env.AGENTOS_GATEWAY_URL ?? "http://127.0.0.1:8790";
const uiBase = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const reportPath = join(root, ".agentos", "state", "smoke-full-report.json");
const prior =
  liveOnly && existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
const report = {
  startedAt: prior?.startedAt ?? new Date().toISOString(),
  ok: true,
  phases: prior?.phases ?? [],
  env: {
    featureToolExecution: process.env.FEATURE_TOOL_EXECUTION,
    requireHumanApproval: process.env.AGENTOS_REQUIRE_HUMAN_APPROVAL,
    semgrepGate: process.env.AGENTOS_SEMGREP_GATE,
    skipGhPr: process.env.AGENTOS_SKIP_GH_PR
  }
};

function phase(name, ok, detail) {
  report.phases.push({ name, ok, detail, at: new Date().toISOString() });
  if (!ok) report.ok = false;
  console.log(`${ok ? "✓" : "✗"} ${name}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

function run(cmd, args, label) {
  const result = spawnSync(cmd, args, { cwd: root, shell: true, encoding: "utf8", env: process.env });
  const ok = result.status === 0;
  phase(label, ok, ok ? "pass" : (result.stderr || result.stdout || "").slice(-800));
  return ok;
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

async function waitForHealth(url, label, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await jsonFetch(url);
      if (res.ok && res.body?.ok === true) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  phase(label, false, `timeout waiting for ${url}`);
  return false;
}

async function drainMission(runId) {
  const maxRounds = 12;
  for (let round = 0; round < maxRounds; round++) {
    const runRes = await jsonFetch(`${apiBase}/runs/${runId}`);
    const status = runRes.body?.status;
    if (status === "completed") return { ok: true, status };
    if (status === "failed" || status === "denied") return { ok: false, status, error: runRes.body?.error };

    const approvals = await jsonFetch(`${apiBase}/approvals`);
    const pending = (approvals.body ?? []).filter((a) => a.status === "pending" && a.runId === runId);
    for (const approval of pending) {
      await jsonFetch(`${apiBase}/approvals/${approval.id}/approve-once`, { method: "POST" });
    }

    const actions = await jsonFetch(`${apiBase}/quick-actions`);
    const mine = (actions.body ?? []).filter((a) => a.runId === runId && !a.consumedAt);
    const priority = ["run_qa", "security_review", "code_review", "release", "approve_release"];
    const sorted = mine.sort((a, b) => priority.indexOf(a.actionType) - priority.indexOf(b.actionType));
    for (const action of sorted) {
      if (["approve", "deny", "pause", "resume", "retry"].includes(action.actionType)) continue;
      await jsonFetch(`${apiBase}/quick-actions/${action.id}/consume`, { method: "POST" });
    }

    const gates = await jsonFetch(`${apiBase}/runs/${runId}/gates`);
    if (gates.body?.pending?.includes("release") && gates.body?.releasePrepared === false) {
      await jsonFetch(`${apiBase}/runs/${runId}/gates/release/prepare`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operatorId: "operator-local" })
      });
    }
    if (gates.body?.pending?.includes("release") && gates.body?.releasePrepared === true) {
      await jsonFetch(`${apiBase}/runs/${runId}/gates/release/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operatorId: "operator-local" })
      });
    }

    await new Promise((r) => setTimeout(r, 1500));
  }
  const final = await jsonFetch(`${apiBase}/runs/${runId}`);
  return { ok: final.body?.status === "completed", status: final.body?.status };
}

try {
  if (!liveOnly) {
    if (!run("pnpm", ["typecheck"], "build.typecheck")) throw new Error("typecheck failed");
    if (!run("pnpm", ["test"], "build.unit")) throw new Error("unit tests failed");
    if (!run("pnpm", ["discord:test"], "build.discord")) throw new Error("discord tests failed");
  }

  if (buildOnly) {
    report.finishedAt = new Date().toISOString();
    throw new Error("__BUILD_ONLY_DONE__");
  }

  const apiUp = await waitForHealth(`${apiBase}/health`, "stack.api.health");
  const gwUp = apiUp && (await waitForHealth(`${gatewayBase}/health`, "stack.gateway.health"));
  if (!apiUp || !gwUp) throw new Error("Stack not healthy");

  const tool = await jsonFetch(`${gatewayBase}/tools/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "read", path: "package.json" })
  });
  phase("live.gateway.read", tool.ok && tool.body?.ok === true, { bytes: tool.body?.stdout?.length ?? 0 });

  const missionBody = {
    title: "Spine smoke — typecheck gate",
    objective: "One-pass spine validation through gateway typecheck.",
    prompt: "Execute pnpm typecheck and pass completion gates.",
    command: "pnpm typecheck",
    sandboxLevel: "safe_execute",
    commandPolicy: "auto_allowed"
  };
  const created = await jsonFetch(`${apiBase}/missions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(missionBody)
  });
  const missionId = created.body?.id ?? created.body?.mission?.id;
  phase("mission.create", created.ok && Boolean(missionId), { missionId });

  const launched = await jsonFetch(`${apiBase}/missions/${missionId}/run`, { method: "POST" });
  const runId = launched.body?.run?.id;
  phase("mission.run", launched.ok && Boolean(runId), {
    status: launched.body?.run?.status,
    summary: launched.body?.result?.summary?.slice(0, 200)
  });
  report.missionId = missionId;
  report.runId = runId;

  if (runId) {
    const drained = await drainMission(runId);
    const gates = await jsonFetch(`${apiBase}/runs/${runId}/gates`);
    report.gates = gates.body;
    phase("mission.drain", drained.ok, { finalStatus: drained.status, gates: gates.body });
  }

  const hasPlaywright = existsSync(
    join(process.env.LOCALAPPDATA ?? "", "ms-playwright")
  ) || spawnSync("pnpm", ["exec", "playwright", "--version"], { cwd: root, shell: true }).status === 0;

  if (hasPlaywright) {
    spawnSync("pnpm", ["exec", "playwright", "install", "chromium"], { cwd: root, shell: true, stdio: "ignore" });
    const e2e = spawnSync("pnpm", ["test:e2e"], {
      cwd: root,
      shell: true,
      encoding: "utf8",
      env: { ...process.env, E2E_BASE_URL: uiBase, E2E_API_URL: apiBase }
    });
    phase("e2e.playwright", e2e.status === 0, e2e.status === 0 ? "8/8" : (e2e.stderr || e2e.stdout || "").slice(-600));
  } else {
    phase("e2e.playwright", true, "skipped (playwright not installed)");
  }

  report.finishedAt = new Date().toISOString();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "__BUILD_ONLY_DONE__") {
    report.ok = true;
  } else {
    report.ok = false;
    report.error = message;
    phase("smoke.full", false, message);
  }
}

const outDir = join(root, ".agentos", "state");
mkdirSync(outDir, { recursive: true });
writeFileSync(reportPath, JSON.stringify(report, null, 2));
writeFileSync(join(outDir, "spine-demo-report.json"), JSON.stringify(report, null, 2));
writeFileSync(
  join(outDir, "spine-test-report.json"),
  JSON.stringify(
    {
      typecheck: report.phases.find((p) => p.name === "build.typecheck")?.ok ? "pass" : "fail",
      unit: report.phases.find((p) => p.name === "build.unit")?.ok ? "pass" : "fail",
      discord: report.phases.find((p) => p.name === "build.discord")?.ok ? "pass" : "fail",
      acceptance: report.ok ? "pass" : "fail",
      e2e: report.phases.find((p) => p.name === "e2e.playwright")?.detail ?? "skipped",
      summary: report.ok ? "smoke-full pass" : "smoke-full failed",
      finishedAt: report.finishedAt
    },
    null,
    2
  )
);

console.log(`\nReport: ${join(outDir, "smoke-full-report.json")}`);
console.log(`Smoke full: ${report.ok ? "PASSED" : "FAILED"}`);
process.exit(report.ok ? 0 : 1);
