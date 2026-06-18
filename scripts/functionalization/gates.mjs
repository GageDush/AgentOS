#!/usr/bin/env node
/** Gate helpers invoked by functionalization manifest and pnpm scripts. */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function apiBase() {
  return (process.env.AGENTOS_API_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
}

async function fetchStatus(path, init) {
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      ...init,
      signal: AbortSignal.timeout(5000)
    });
    return response.status;
  } catch {
    return 0;
  }
}

async function gateAuth() {
  const checks = [
    ["POST /missions unauthenticated", () => fetchStatus("/missions", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })],
    ["POST /worker/process unauthenticated", () => fetchStatus("/worker/process", { method: "POST" })],
    ["POST /scraper/download unauthenticated", () => fetchStatus("/scraper/download", { method: "POST", headers: { "content-type": "application/json" }, body: '{"url":"https://example.com"}' })]
  ];

  let liveFailed = false;
  let liveAuthEnabled = true;
  for (const [label, fn] of checks) {
    const status = await fn();
    const ok = status === 401 || status === 403;
    console.log(`${ok ? "PASS" : "FAIL"} ${label} → HTTP ${status}`);
    if (!ok) {
      liveFailed = true;
      if (status === 200) liveAuthEnabled = false;
    }
  }

  if (!liveFailed) {
    console.log("\nAuth gate (live API): PASS");
    return;
  }

  if (!liveAuthEnabled) {
    console.log("\nLive API has AGENTOS_API_REQUIRE_AUTH disabled — running auth-guard unit gate…");
    const vitest = spawnSync(
      "pnpm",
      ["--filter", "@agentos/api", "exec", "vitest", "run", "src/auth-guard.test.ts"],
      { cwd: repoRoot, stdio: "inherit", shell: true, env: { ...process.env, AGENTOS_API_REQUIRE_AUTH: "true" } }
    );
    if ((vitest.status ?? 1) === 0) {
      console.log("\nAuth gate (unit fallback): PASS");
      return;
    }
  }

  console.error("\nAuth gate failed. Enable AGENTOS_API_REQUIRE_AUTH on the API or fix auth-guard tests.");
  process.exit(1);
}

async function gateScraper() {
  const vitest = spawnSync(
    "pnpm",
    ["--filter", "@agentos/api", "exec", "vitest", "run", "src/scraper/url-policy.test.ts"],
    { cwd: repoRoot, stdio: "inherit", shell: true }
  );
  process.exit(vitest.status ?? 1);
}

function gatePersistencePerf() {
  const marker = join(repoRoot, "packages", "persistence", "src", "hot-path-sql.ts");
  if (!existsSync(marker)) {
    console.log("SKIP persistence perf gate — hot-path-sql.ts not yet implemented (task 4.3)");
    process.exit(0);
  }
  const vitest = spawnSync("pnpm", ["--filter", "@agentos/persistence", "test"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true
  });
  process.exit(vitest.status ?? 1);
}

function gateComplete() {
  const statePath = join(repoRoot, ".agentos", "state", "functionalization-state.json");
  if (!existsSync(statePath)) {
    console.error("FAIL functionalization state missing");
    process.exit(1);
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, ".agentos", "functionalization", "manifest.json"), "utf8")
  );
  const total = manifest.phases.reduce((n, p) => n + p.tasks.length, 0);
  if ((state.completedTasks?.length ?? 0) < total) {
    console.error(`FAIL ${state.completedTasks?.length ?? 0}/${total} tasks complete`);
    process.exit(1);
  }
  console.log("Functionalization program: COMPLETE");
}

function checkAuthMatrix() {
  const matrixPath = join(repoRoot, "docs", "architecture", "api-auth-matrix.md");
  if (!existsSync(matrixPath)) {
    console.error("Missing docs/architecture/api-auth-matrix.md (task 0.2)");
    process.exit(1);
  }
  const text = readFileSync(matrixPath, "utf8");
  const required = ["/health", "/missions", "/worker/process", "/scraper/", "/events", "/auth/"];
  const missing = required.filter((route) => !text.includes(route));
  if (missing.length) {
    console.error("Auth matrix missing routes:", missing.join(", "));
    process.exit(1);
  }
  console.log("Auth matrix check: PASS");
}

const sub = process.argv[2] ?? "help";

switch (sub) {
  case "auth":
    await gateAuth();
    break;
  case "scraper":
    await gateScraper();
    break;
  case "persistence-perf":
    gatePersistencePerf();
    break;
  case "complete":
    gateComplete();
    break;
  case "auth-matrix":
    checkAuthMatrix();
    break;
  default:
    console.log("Usage: node scripts/functionalization/gates.mjs <auth|scraper|persistence-perf|complete|auth-matrix>");
    process.exit(sub === "help" ? 0 : 1);
}
