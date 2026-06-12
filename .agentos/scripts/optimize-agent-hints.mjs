import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stateDir = path.join(repoRoot, ".agentos", "state");
const hintsPath = path.join(stateDir, "optimizer-hints.json");
const sourcesPath = path.join(repoRoot, ".agentos", "benchmarks", "optimizer-sources.json");

function runBench(script) {
  const result = spawnSync("node", [path.join(repoRoot, ".agentos", "scripts", script)], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const profileBench = runBench("bench-agent-profiles.mjs");
const hints = {
  generatedAt: new Date().toISOString(),
  profileBenchExitCode: profileBench.status,
  suggestions: [],
  optimizerSources: fs.existsSync(sourcesPath) ? JSON.parse(fs.readFileSync(sourcesPath, "utf8")) : null
};

const failLines = `${profileBench.stdout}\n${profileBench.stderr}`
  .split(/\r?\n/)
  .filter((line) => /FAIL|below floor|missing/i.test(line));

if (profileBench.status !== 0) {
  hints.suggestions.push({
    area: "agent-md-v1",
    action: "Run pnpm agentos:min-maxed-profiles or tighten Runtime Excerpt for failing agents.",
    evidence: failLines.slice(0, 8)
  });
} else {
  hints.suggestions.push({
    area: "agent-md-v1",
    action: "Profiles meet tier policy. Consider GEPA/meta-agent on control-plane agents only.",
    evidence: []
  });
}

hints.suggestions.push({
  area: "routing",
  action: "Tune inferProviderLaneSmart thresholds using RouteLLM-style offline eval on pipeline-missions.json.",
  evidence: ["packages/orchestrator/src/lane-router.ts"]
});

hints.suggestions.push({
  area: "topology",
  action: "Adjust shouldPruneSupportingAgent when AgentDropout-style eval shows quality regressions.",
  evidence: ["packages/orchestrator/src/lane-router.ts"]
});

if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
fs.writeFileSync(hintsPath, `${JSON.stringify(hints, null, 2)}\n`);

console.log(`Wrote optimizer hints to ${hintsPath}`);
for (const item of hints.suggestions) {
  console.log(`- [${item.area}] ${item.action}`);
}

process.exit(profileBench.status);
