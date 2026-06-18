#!/usr/bin/env node
/** UI route smoke — full implementation in phase 5.3. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const overridePath = join(repoRoot, ".agentos", "state", "command-center-port.override");

function uiPort() {
  if (existsSync(overridePath)) {
    const raw = readFileSync(overridePath, "utf8").trim();
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return Number(process.env.AGENTOS_UI_PORT ?? 3000);
}

const routes = ["/", "/missions", "/control-gate", "/settings", "/blackbox"];
const port = uiPort();
const base = `http://127.0.0.1:${port}`;

let failed = false;
for (const route of routes) {
  try {
    const response = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(8000) });
    const ok = response.status === 200;
    console.log(`${ok ? "PASS" : "FAIL"} ${route} → ${response.status}`);
    if (!ok) failed = true;
  } catch (error) {
    console.log(`FAIL ${route} → ${error instanceof Error ? error.message : "error"}`);
    failed = true;
  }
}

if (failed) {
  console.error("\nui:route-smoke failed — ensure command center is running on the active port.");
  process.exit(1);
}
console.log("\nui:route-smoke PASS\n");
