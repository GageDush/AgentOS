import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const benchmarksDir = path.join(repoRoot, ".agentos", "benchmarks");
const stateDir = path.join(repoRoot, ".agentos", "state");
const reportJsonPath = path.join(stateDir, "bench-report.json");

const PIPELINE_TESTS = [
  "packages/orchestrator/src/pipeline-bench.test.ts",
  "packages/agents/src/governance.test.ts",
  "packages/agents/src/qa-gate.test.ts",
  "packages/orchestrator/src/lane-router.test.ts"
];

function readBenchmark(name) {
  const file = path.join(benchmarksDir, name);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing benchmark file: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function runProfileBench() {
  const result = spawnSync("node", [path.join(repoRoot, ".agentos", "scripts", "bench-agent-profiles.mjs")], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  const raw = `${result.stdout ?? ""}`.trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: "Failed to parse profile bench JSON",
      exitCode: result.status ?? 1,
      stderr: result.stderr ?? ""
    };
  }
  return { ok: parsed.ok === true, data: parsed, exitCode: result.status ?? (parsed.ok ? 0 : 1) };
}

function runPipelineVitest() {
  const outputFile = path.join(stateDir, "vitest-bench-output.json");
  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

  const result = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", ...PIPELINE_TESTS, "--reporter=json", `--outputFile=${outputFile}`],
    { cwd: repoRoot, encoding: "utf8", shell: true }
  );

  let vitestJson;
  if (fs.existsSync(outputFile)) {
    try {
      vitestJson = JSON.parse(fs.readFileSync(outputFile, "utf8"));
    } catch {
      vitestJson = undefined;
    }
  }

  const suites =
    vitestJson?.testResults?.map((suite) => ({
      file: suite.name.replace(/\\/g, "/").split("/").slice(-1)[0],
      status: suite.status,
      failed: suite.assertionResults?.filter((a) => a.status === "failed").map((a) => a.fullName) ?? []
    })) ?? [];

  const passed = suites.filter((s) => s.status === "passed").length;
  const failed = suites.filter((s) => s.status === "failed");

  return {
    ok: (result.status ?? 1) === 0 && failed.length === 0,
    exitCode: result.status ?? 1,
    suites,
    passed,
    total: PIPELINE_TESTS.length,
    failed
  };
}

function weakestProfiles(results, limit = 5) {
  return [...results]
    .sort((a, b) => a.scores.overall - b.scores.overall)
    .slice(0, limit)
    .map((r) => ({
      agentId: r.agentId,
      tier: r.profileTier,
      overall: r.scores.overall,
      weakDimension: weakestDimension(r.scores)
    }));
}

function weakestDimension(scores) {
  const dims = [
    ["runtimeExcerpt", scores.runtimeExcerpt],
    ["workflow", scores.workflow],
    ["outputContract", scores.outputContract],
    ["gates", scores.gates],
    ["tokenRules", scores.tokenRules],
    ["structural", scores.structural]
  ];
  dims.sort((a, b) => a[1] - b[1]);
  return `${dims[0][0]} (${dims[0][1]})`;
}

function belowPolicyProfiles(results) {
  return results.filter((r) => !r.meetsPolicy);
}

function buildRecommendations(profileData, pipeline, missions) {
  const recs = [];

  for (const profile of belowPolicyProfiles(profileData?.results ?? [])) {
    recs.push({
      priority: "high",
      area: "profiles",
      message: `Fix ${profile.agentId} (${profile.profileTier}): ${profile.missing.join("; ") || "below score floor"}`
    });
  }

  if (!pipeline.ok) {
    for (const suite of pipeline.failed) {
      recs.push({
        priority: "high",
        area: "pipeline",
        message: `Repair ${suite.file}: ${suite.failed.join(", ") || "suite failed"}`
      });
    }
  }

  for (const mission of missions.missions.filter((m) => m.note)) {
    recs.push({
      priority: "medium",
      area: "routing",
      message: `${mission.id}: ${mission.note}`
    });
  }

  const weakRuntime = (profileData?.results ?? [])
    .filter((r) => r.scores.runtimeExcerpt < 70)
    .map((r) => r.agentId);
  if (weakRuntime.length > 0) {
    recs.push({
      priority: "medium",
      area: "optimization",
      message: `Strengthen Runtime Excerpt for: ${weakRuntime.join(", ")} (GEPA/DSPy candidates)`
    });
  }

  if (recs.length === 0) {
    recs.push({
      priority: "low",
      area: "optimization",
      message: "All benches green. Run pnpm agentos:optimize-hints before external optimizer experiments."
    });
  }

  return recs;
}

function formatHumanReport(report) {
  const lines = [];
  const divider = "─".repeat(60);

  lines.push("AgentOS Bench Report");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(divider);

  const profileOk = report.profiles.ok;
  const pipelineOk = report.pipeline.ok;
  const overallOk = profileOk && pipelineOk;

  lines.push(`Overall: ${overallOk ? "PASS" : "FAIL"}`);
  lines.push(`  Profiles (agent-md-v1): ${profileOk ? "PASS" : "FAIL"}`);
  lines.push(`  Pipeline + governance:  ${pipelineOk ? "PASS" : "FAIL"}`);
  lines.push("");

  if (report.profiles.data) {
    const { summary, results } = report.profiles.data;
    lines.push("## Profiles");
    lines.push(
      `Average score: ${summary.averageOverall}/100 | Meets policy: ${summary.meetsPolicy.length}/${results.length}`
    );

    const byTier = summary.byTier ?? {};
    for (const [tier, stats] of Object.entries(byTier)) {
      lines.push(`  ${tier}: ${stats.meetsPolicy}/${stats.assigned} meet policy`);
    }

    const below = summary.belowPolicy ?? [];
    if (below.length > 0) {
      lines.push(`Below policy: ${below.join(", ")}`);
    } else {
      lines.push("Below policy: none");
    }

    lines.push("");
    lines.push("Weakest profiles (by overall score):");
    for (const entry of report.weakestProfiles) {
      lines.push(`  • ${entry.agentId} [${entry.tier}] ${entry.overall}/100 — weak: ${entry.weakDimension}`);
    }
    lines.push("");
  } else if (report.profiles.error) {
    lines.push("## Profiles");
    lines.push(`ERROR: ${report.profiles.error}`);
    if (report.profiles.stderr) lines.push(report.profiles.stderr.slice(0, 400));
    lines.push("");
  }

  lines.push("## Pipeline & governance");
  lines.push(`Vitest suites: ${report.pipeline.passed}/${report.pipeline.total} passed`);
  for (const suite of report.pipeline.suites) {
    const mark = suite.status === "passed" ? "✓" : "✗";
    lines.push(`  ${mark} ${suite.file}`);
    for (const fail of suite.failed) {
      lines.push(`      ↳ ${fail}`);
    }
  }
  lines.push(`Gate-fidelity scenarios: ${report.gateFidelityCount} defined in gate-fidelity.json`);
  lines.push("");

  lines.push("## Routing missions (regression fixtures)");
  for (const mission of report.missions) {
    const gateText = mission.requiredGates?.length ? ` gates: ${mission.requiredGates.join(", ")}` : "";
    lines.push(`  • ${mission.id} → ${mission.expectPrimary}${gateText}`);
    if (mission.note) lines.push(`      note: ${mission.note}`);
  }
  lines.push("");

  lines.push("## Recommendations");
  for (const rec of report.recommendations) {
    lines.push(`  [${rec.priority}/${rec.area}] ${rec.message}`);
  }

  lines.push("");
  lines.push(divider);
  lines.push(`JSON artifact: ${reportJsonPath}`);

  return lines.join("\n");
}

function main() {
  const args = new Set(process.argv.slice(2));
  const jsonOnly = args.has("--json");

  const missions = readBenchmark("pipeline-missions.json");
  const gates = readBenchmark("gate-fidelity.json");

  const profiles = runProfileBench();
  const pipeline = runPipelineVitest();

  const report = {
    generatedAt: new Date().toISOString(),
    ok: profiles.ok && pipeline.ok,
    profiles,
    pipeline,
    gateFidelityCount: gates.scenarios?.length ?? 0,
    missions: missions.missions ?? [],
    weakestProfiles: profiles.data ? weakestProfiles(profiles.data.results) : [],
    recommendations: buildRecommendations(profiles.data, pipeline, missions)
  };

  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatHumanReport(report));
  }

  if (!report.ok) process.exitCode = 1;
}

main();
