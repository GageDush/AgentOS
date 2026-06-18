#!/usr/bin/env node
/** System review collector — full implementation in phase 7.2. */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(repoRoot, "docs", "reviews");
mkdirSync(outDir, { recursive: true });

const gates = ["pnpm typecheck", "pnpm test", "pnpm env:check", "pnpm sanitize:check"];
const results = {};

for (const cmd of gates) {
  const started = Date.now();
  const result = spawnSync(cmd, { cwd: repoRoot, shell: true, encoding: "utf8" });
  results[cmd] = { ok: (result.status ?? 1) === 0, ms: Date.now() - started, exitCode: result.status ?? 1 };
}

const stamp = new Date().toISOString().slice(0, 10);
const outFile = join(outDir, `${stamp}-system-review.json`);
writeFileSync(
  outFile,
  JSON.stringify({ capturedAt: new Date().toISOString(), gates: results, note: "Stub collector — expand in phase 7.2" }, null, 2)
);
console.log(`Wrote ${outFile}`);

const failed = Object.values(results).some((r) => !r.ok);
process.exit(failed ? 1 : 0);
