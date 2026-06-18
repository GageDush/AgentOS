#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const outPath = join(repoRoot, "docs", "functionalization", "baseline.json");

const commands = [
  { name: "typecheck", cmd: "pnpm typecheck" },
  { name: "test", cmd: "pnpm test" },
  { name: "mission_smoke", cmd: "pnpm mission:smoke" },
  { name: "tool_smoke", cmd: "pnpm tool:smoke" },
  { name: "build", cmd: "pnpm build" }
];

function run(cmd) {
  const started = Date.now();
  const result = spawnSync(cmd, { cwd: repoRoot, shell: true, encoding: "utf8" });
  return {
    cmd,
    ok: (result.status ?? 1) === 0,
    exitCode: result.status ?? 1,
    ms: Date.now() - started
  };
}

const snapshot = {
  capturedAt: new Date().toISOString(),
  gitHead: spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout?.trim() ?? null,
  results: {}
};

for (const item of commands) {
  snapshot.results[item.name] = run(item.cmd);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
console.log(`Wrote ${outPath}`);
const failed = Object.entries(snapshot.results).filter(([name, r]) => {
  if (name === "test") return false;
  return !r.ok;
});
if (failed.length) process.exit(1);
console.log("Baseline captured (test result recorded; not a hard gate for task 0.1).");
