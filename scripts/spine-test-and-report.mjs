/**
 * Run test suite and write spine-test-report.json for Discord summary.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const report = { startedAt: new Date().toISOString() };

function run(cmd, args, label) {
  const result = spawnSync(cmd, args, { cwd: root, shell: true, encoding: "utf8" });
  const ok = result.status === 0;
  report[label] = ok ? "pass" : "fail";
  if (!ok) {
    report[`${label}Output`] = (result.stderr || result.stdout || "").slice(-1500);
  }
  return ok;
}

const typecheck = run("pnpm", ["typecheck"], "typecheck");
const unit = typecheck && run("pnpm", ["test"], "unit");
const discord = unit && run("pnpm", ["discord:test"], "discord");

let acceptance = "skipped";
if (typecheck && unit && discord) {
  const acc = spawnSync("pnpm", ["acceptance:gate"], { cwd: root, shell: true, encoding: "utf8" });
  acceptance = acc.status === 0 ? "pass" : "fail";
  report.acceptance = acceptance;
  if (acc.status !== 0) report.acceptanceOutput = (acc.stderr || acc.stdout || "").slice(-1500);
}

report.summary = [typecheck, unit, discord].every(Boolean) ? "core tests green" : "failures detected";
report.finishedAt = new Date().toISOString();

const outDir = join(root, ".agentos", "state");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "spine-test-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(typecheck && unit && discord ? 0 : 1);
