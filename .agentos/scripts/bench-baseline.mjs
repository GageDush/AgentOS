import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const benchmarksDir = path.join(repoRoot, ".agentos", "benchmarks");
const snapshotPath = path.join(benchmarksDir, "baseline-snapshot.json");
const missionsPath = path.join(benchmarksDir, "pipeline-missions.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function runNodeScript(scriptName) {
  return spawnSync("node", [path.join(repoRoot, ".agentos", "scripts", scriptName)], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

function runMissionSmoke() {
  return spawnSync("node", [path.join(repoRoot, "scripts", "mission-execution-smoke.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      AGENTOS_CLASSIFIER_TIER2: "false"
    }
  });
}

function runPipelineBench() {
  return spawnSync("node", [path.join(repoRoot, ".agentos", "scripts", "bench-pipeline.mjs")], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

function captureRoutingSnapshot() {
  const missions = readJson(missionsPath).missions ?? [];
  const routingMissions = {};
  for (const mission of missions) {
    routingMissions[mission.id] = {
      expectPrimary: mission.expectPrimary,
      ...(mission.maxSupporting !== undefined ? { maxSupporting: mission.maxSupporting } : {})
    };
  }
  return routingMissions;
}

function buildSnapshot(profileReport) {
  return {
    version: 1,
    description: "Committed AgentOS bench regression baseline. Refresh with: pnpm agentos:bench-baseline --write",
    capturedAt: new Date().toISOString(),
    profiles: {
      benchmark: profileReport.benchmark ?? "agent-md-v1",
      minAverageOverall: profileReport.summary.averageOverall,
      meetsPolicyCount: profileReport.summary.meetsPolicy.length,
      totalAgents: profileReport.results.length,
      belowPolicy: profileReport.summary.belowPolicy ?? []
    },
    pipeline: {
      gateFidelityScenarios: readJson(path.join(benchmarksDir, "gate-fidelity.json")).scenarios?.length ?? 0,
      routingMissions: captureRoutingSnapshot()
    },
    missionSmoke: {
      testFile: "packages/runtime/src/mission-execution-smoke.test.ts",
      testCount: 2
    }
  };
}

function compareSnapshots(expected, actual, errors) {
  if (actual.profiles.meetsPolicyCount < expected.profiles.meetsPolicyCount) {
    errors.push(
      `Profile policy regression: ${actual.profiles.meetsPolicyCount}/${expected.profiles.totalAgents} meet policy (baseline ${expected.profiles.meetsPolicyCount}).`
    );
  }
  if (actual.profiles.minAverageOverall < expected.profiles.minAverageOverall) {
    errors.push(
      `Profile score regression: average ${actual.profiles.minAverageOverall} < baseline floor ${expected.profiles.minAverageOverall}.`
    );
  }
  if ((actual.profiles.belowPolicy ?? []).length > 0) {
    errors.push(`Profiles below policy: ${actual.profiles.belowPolicy.join(", ")}`);
  }

  for (const [missionId, baselineMission] of Object.entries(expected.pipeline.routingMissions)) {
    const current = actual.pipeline.routingMissions[missionId];
    if (!current) {
      errors.push(`Missing routing mission in fixtures: ${missionId}`);
      continue;
    }
    if (current.expectPrimary !== baselineMission.expectPrimary) {
      errors.push(
        `Routing regression for ${missionId}: expected ${baselineMission.expectPrimary}, got ${current.expectPrimary}.`
      );
    }
    if (JSON.stringify(current) !== JSON.stringify(baselineMission)) {
      errors.push(
        `Routing fixture drift for ${missionId}: expected ${JSON.stringify(baselineMission)}, got ${JSON.stringify(current)}. Run pnpm agentos:bench-baseline --write after intentional changes.`
      );
    }
  }

  const expectedMissionIds = Object.keys(expected.pipeline.routingMissions).sort();
  const currentMissionIds = Object.keys(actual.pipeline.routingMissions).sort();
  if (JSON.stringify(expectedMissionIds) !== JSON.stringify(currentMissionIds)) {
    errors.push("Pipeline mission fixture set changed without baseline refresh.");
  }
}

function main() {
  const writeMode = process.argv.includes("--write");

  const profileRun = runNodeScript("bench-agent-profiles.mjs");
  if (profileRun.status !== 0) {
    console.error(profileRun.stdout || profileRun.stderr);
    process.exit(profileRun.status ?? 1);
  }

  let profileReport;
  try {
    profileReport = JSON.parse(profileRun.stdout.trim());
  } catch {
    console.error("Failed to parse profile bench JSON.");
    process.exit(1);
  }

  const pipelineRun = runPipelineBench();
  if (pipelineRun.status !== 0) {
    console.error("Pipeline bench failed.");
    process.exit(pipelineRun.status ?? 1);
  }

  const smokeRun = runMissionSmoke();
  if (smokeRun.status !== 0) {
    console.error("Mission smoke failed.");
    process.exit(smokeRun.status ?? 1);
  }

  const current = buildSnapshot(profileReport);

  if (writeMode) {
    fs.writeFileSync(snapshotPath, `${JSON.stringify(current, null, 2)}\n`);
    console.log(`Updated baseline snapshot: ${snapshotPath}`);
    process.exit(0);
  }

  if (!fs.existsSync(snapshotPath)) {
    console.error(`Missing baseline snapshot at ${snapshotPath}. Run with --write once to create it.`);
    process.exit(1);
  }

  const expected = readJson(snapshotPath);
  const errors = [];
  compareSnapshots(expected, current, errors);

  if (errors.length > 0) {
    console.error("Baseline regression check: FAIL\n");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("Baseline regression check: PASS");
  console.log(`  Profiles: ${current.profiles.meetsPolicyCount}/${current.profiles.totalAgents} meet policy (avg ${current.profiles.minAverageOverall})`);
  console.log(`  Pipeline missions: ${Object.keys(current.pipeline.routingMissions).length}`);
  console.log(`  Mission smoke: ${current.missionSmoke.testCount} tests`);
}

main();
