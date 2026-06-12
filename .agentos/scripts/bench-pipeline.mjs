import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const benchmarksDir = path.join(repoRoot, ".agentos", "benchmarks");

function readJson(name) {
  const file = path.join(benchmarksDir, name);
  if (!fs.existsSync(file)) {
    console.error(`Missing benchmark file: ${file}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function runVitest(target) {
  const result = spawnSync("pnpm", ["exec", "vitest", "run", target], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true
  });
  return result.status ?? 1;
}

console.log("AgentOS pipeline bench\n");

const missions = readJson("pipeline-missions.json");
const gates = readJson("gate-fidelity.json");
const optimizers = readJson("optimizer-sources.json");

console.log(`Loaded ${missions.missions.length} pipeline missions`);
console.log(`Loaded ${gates.scenarios.length} gate-fidelity scenarios`);
console.log(
  `Optimizer registry: ${Object.values(optimizers.tiers).flat().length} external sources\n`
);

let exitCode = 0;
exitCode |= runVitest("packages/orchestrator/src/pipeline-bench.test.ts");
exitCode |= runVitest("packages/agents/src/governance.test.ts");
exitCode |= runVitest("packages/agents/src/qa-gate.test.ts");
exitCode |= runVitest("packages/orchestrator/src/lane-router.test.ts");

if (exitCode === 0) {
  console.log("\nPipeline bench: PASS");
} else {
  console.error("\nPipeline bench: FAIL");
  process.exit(exitCode);
}
