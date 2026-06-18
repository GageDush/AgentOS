#!/usr/bin/env node
/**
 * AgentOS functionalization runner — phases 0–7 with gate checks.
 *
 * Interactive (Cursor chat):
 *   pnpm functional:start    # reset + first task prompt
 *   pnpm functional:next     # advance after gates pass
 *   pnpm functional:prompt   # reprint current task
 *   pnpm functional:status   # progress
 *   pnpm functional:gates    # run gates for current task
 *
 * Autonomous (requires CURSOR_API_KEY in .env):
 *   pnpm functional:run      # SDK: current task → gates → next until blocked
 *   pnpm functional:loop     # SDK loop until program complete or max cycles
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runOpenAiTask } from "./functionalization/openai-driver.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const manifestPath = join(repoRoot, ".agentos", "functionalization", "manifest.json");
const statePath = join(repoRoot, ".agentos", "state", "functionalization-state.json");
const envelopeDir = join(repoRoot, ".agentos", "state", "functionalization-envelopes");

function loadEnv() {
  const envPath = join(repoRoot, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function loadManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function defaultState() {
  return {
    version: 1,
    phaseIndex: 0,
    taskIndex: 0,
    completedTasks: [],
    completedPhases: [],
    history: [],
    startedAt: null,
    completedAt: null
  };
}

function loadState() {
  if (!existsSync(statePath)) return defaultState();
  return { ...defaultState(), ...JSON.parse(readFileSync(statePath, "utf8")) };
}

function saveState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeState(state);
}

function writeState(state) {
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function flatTasks(manifest) {
  const items = [];
  for (const phase of manifest.phases) {
    for (const task of phase.tasks) {
      items.push({ phase, task });
    }
  }
  return items;
}

function currentPointer(manifest, state) {
  const phase = manifest.phases[state.phaseIndex];
  if (!phase) return null;
  const task = phase.tasks[state.taskIndex];
  if (!task) return null;
  return { phase, task };
}

function collectGateCommands(task, phase, kind = "all") {
  const buckets = kind === "all" ? ["functionality", "performance", "security"] : [kind];
  const commands = [];
  for (const bucket of buckets) {
    for (const cmd of task.gates?.[bucket] ?? []) commands.push({ bucket, cmd, scope: "task" });
  }
  if (kind === "all" || kind === "phase") {
    for (const bucket of buckets) {
      for (const cmd of phase.phaseGates?.[bucket] ?? []) commands.push({ bucket, cmd, scope: "phase" });
    }
  }
  return commands;
}

function runCommand(cmd, { label } = {}) {
  const started = Date.now();
  const result = spawnSync(cmd, {
    cwd: repoRoot,
    shell: true,
    stdio: "pipe",
    encoding: "utf8",
    env: process.env
  });
  const ms = Date.now() - started;
  const ok = (result.status ?? 1) === 0;
  return {
    cmd,
    label: label ?? cmd,
    ok,
    exitCode: result.status ?? 1,
    ms,
    stdout: (result.stdout ?? "").slice(0, 4000),
    stderr: (result.stderr ?? "").slice(0, 4000)
  };
}

function runGates(manifest, state, { phaseOnly = false } = {}) {
  const pointer = currentPointer(manifest, state);
  if (!pointer) {
    return { ok: true, results: [], message: "Program complete — no gates to run." };
  }
  const { phase, task } = pointer;
  const gateList = phaseOnly
    ? collectGateCommands({ gates: {} }, phase, "all").filter((g) => g.scope === "phase")
    : collectGateCommands(task, phase, "all");

  const results = [];
  for (const gate of gateList) {
    if (gate.cmd.startsWith("pnpm ") || gate.cmd.startsWith("node ")) {
      results.push(runCommand(gate.cmd, { label: `[${gate.scope}/${gate.bucket}] ${gate.cmd}` }));
      continue;
    }
    results.push(runCommand(gate.cmd, { label: `[${gate.scope}/${gate.bucket}] ${gate.cmd}` }));
  }
  const ok = results.length === 0 || results.every((r) => r.ok);
  return { ok, results, taskId: task.id, phaseId: phase.id };
}

function formatGateReport(report) {
  const lines = [];
  lines.push(`Gates for ${report.phaseId ?? "?"} / ${report.taskId ?? "program"}: ${report.ok ? "PASS" : "FAIL"}`);
  for (const r of report.results) {
    lines.push(`  ${r.ok ? "✓" : "✗"} ${r.label} (${r.ms}ms, exit ${r.exitCode})`);
    if (!r.ok && r.stderr.trim()) {
      lines.push(`    stderr: ${r.stderr.trim().split("\n").slice(-3).join(" | ")}`);
    }
  }
  return lines.join("\n");
}

function gatesSummary(task, phase) {
  const all = collectGateCommands(task, phase, "all");
  if (!all.length) return "(no automated gates — manual verification required)";
  return all.map((g) => `- [${g.bucket}] ${g.cmd}`).join("\n");
}

function buildKickoffPrompt(pointer, manifest) {
  const { phase, task } = pointer;
  return [
    `AgentOS functionalization — start ${task.id}: ${task.title}`,
    `Phase ${phase.id}: ${phase.title}`,
    "",
    task.scope,
    "",
    "Primary files:",
    ...task.files.map((f) => `- ${f}`),
    "",
    "Pass these gates before `pnpm functional:next`:",
    gatesSummary(task, phase),
    "",
    "Rules: AGENTS.md, minimal focused diff, tests for security behavior, no git commit unless user asks.",
    "",
    "When done: run `pnpm functional:gates`. If green, run `pnpm functional:next` and continue the chain."
  ].join("\n");
}

function buildChainPrompt(pointer, manifest, priorTaskId) {
  const { phase, task } = pointer;
  return manifest.chainPromptTemplate
    .replaceAll("{id}", task.id)
    .replaceAll("{title}", task.title)
    .replaceAll("{priorId}", priorTaskId)
    .replaceAll("{scope}", task.scope)
    .replaceAll("{files}", task.files.map((f) => `- ${f}`).join("\n"))
    .replaceAll("{gates}", gatesSummary(task, phase));
}

function writeEnvelope(state, pointer, prompt, kind) {
  mkdirSync(envelopeDir, { recursive: true });
  const file = join(envelopeDir, `${pointer.task.id}-${Date.now()}.md`);
  writeFileSync(file, prompt, "utf8");
  state.history.push({
    at: new Date().toISOString(),
    kind,
    phaseId: pointer.phase.id,
    taskId: pointer.task.id,
    envelope: file
  });
  return file;
}

function printPrompt(text, label) {
  console.log("\n" + "=".repeat(72));
  console.log(label);
  console.log("=".repeat(72));
  console.log(text);
  console.log("=".repeat(72) + "\n");
}

function status(manifest, state) {
  const totalTasks = flatTasks(manifest).length;
  const pointer = currentPointer(manifest, state);
  console.log(`Functionalization: ${state.completedTasks.length}/${totalTasks} tasks complete`);
  console.log(`Phases complete: ${state.completedPhases.length}/${manifest.phases.length}`);
  if (pointer) {
    console.log(`Current: ${pointer.task.id} — ${pointer.task.title} (${pointer.phase.id})`);
  } else {
    console.log("Current: PROGRAM COMPLETE");
  }
  if (state.completedTasks.length) {
    console.log("Done:", state.completedTasks.join(", "));
  }
}

function advancePointer(manifest, state) {
  const phase = manifest.phases[state.phaseIndex];
  if (!phase) return false;

  const completedTask = phase.tasks[state.taskIndex];
  if (completedTask) {
    state.completedTasks.push(completedTask.id);
  }

  if (state.taskIndex + 1 < phase.tasks.length) {
    state.taskIndex += 1;
    saveState(state);
    return true;
  }

  state.completedPhases.push(phase.id);
  state.phaseIndex += 1;
  state.taskIndex = 0;

  if (state.phaseIndex >= manifest.phases.length) {
    state.completedAt = new Date().toISOString();
    saveState(state);
    return false;
  }

  saveState(state);
  return true;
}

function cmdStart(manifest) {
  const state = defaultState();
  state.startedAt = new Date().toISOString();
  const pointer = currentPointer(manifest, state);
  const prompt = buildKickoffPrompt(pointer, manifest);
  writeEnvelope(state, pointer, prompt, "start");
  saveState(state);
  printPrompt(prompt, `PASTE IN CURSOR CHAT (${pointer.task.id} kickoff)`);
  return prompt;
}

function cmdGates(manifest, state, { phaseOnly = false } = {}) {
  const report = runGates(manifest, state, { phaseOnly });
  console.log(formatGateReport(report));
  state.history.push({
    at: new Date().toISOString(),
    kind: "gates",
    taskId: report.taskId,
    phaseId: report.phaseId,
    ok: report.ok,
    results: report.results.map((r) => ({ cmd: r.cmd, ok: r.ok, exitCode: r.exitCode, ms: r.ms }))
  });
  saveState(state);
  if (!report.ok) process.exitCode = 1;
  return report;
}

function cmdNext(manifest, state, { skipGates = false } = {}) {
  const pointer = currentPointer(manifest, state);
  if (!pointer) {
    console.log("Program already complete.");
    return null;
  }

  if (!skipGates) {
    const report = runGates(manifest, state);
    console.log(formatGateReport(report));
    if (!report.ok) {
      console.error("\nGates failed — fix implementation and re-run: pnpm functional:gates\n");
      process.exitCode = 1;
      return null;
    }
  }

  const priorId = pointer.task.id;
  const hasMore = advancePointer(manifest, state);
  if (!hasMore) {
    console.log(`\nFinished ${priorId}. All functionalization tasks complete.\n`);
    status(manifest, state);
    return null;
  }

  const nextPointer = currentPointer(manifest, loadState());
  const prompt = buildChainPrompt(nextPointer, manifest, priorId);
  writeEnvelope(loadState(), nextPointer, prompt, "chain");
  const updated = loadState();
  updated.history = [...(updated.history ?? []), { at: new Date().toISOString(), kind: "advance", from: priorId, to: nextPointer.task.id }];
  saveState(updated);
  printPrompt(prompt, `PASTE IN CURSOR CHAT (${priorId} → ${nextPointer.task.id})`);
  return prompt;
}

function cmdPrompt(manifest, state) {
  const pointer = currentPointer(manifest, state);
  if (!pointer) {
    console.log("Program complete.");
    return null;
  }
  const prompt =
    state.completedTasks.length === 0 && state.history.every((h) => h.kind !== "chain")
      ? buildKickoffPrompt(pointer, manifest)
      : buildChainPrompt(pointer, manifest, state.completedTasks.at(-1) ?? "start");
  printPrompt(prompt, `CURRENT PROMPT (${pointer.task.id})`);
  return prompt;
}

function cmdReset() {
  saveState(defaultState());
  console.log("Functionalization state reset. Run: pnpm functional:start");
}

function cmdList(manifest) {
  for (const phase of manifest.phases) {
    console.log(`\n${phase.id}: ${phase.title}`);
    for (const task of phase.tasks) {
      console.log(`  ${task.id} — ${task.title}`);
    }
  }
}

async function loadCursorAgent() {
  const candidates = [
    join(repoRoot, "apps", "api", "node_modules", "@cursor", "sdk", "dist", "esm", "index.js"),
    join(repoRoot, "node_modules", "@cursor", "sdk", "dist", "esm", "index.js")
  ];
  for (const entry of candidates) {
    if (!existsSync(entry)) continue;
    const mod = await import(pathToFileURL(entry).href);
    if (mod.Agent) return mod.Agent;
  }
  try {
    const mod = await import("@cursor/sdk");
    return mod.Agent;
  } catch {
    return undefined;
  }
}

function resolveTaskRunner(task) {
  if (task.runner) return task.runner;
  return process.env.AGENTOS_FUNCTIONAL_DRIVER?.trim() || "cursor";
}

async function runShellTask(task) {
  const cmds = Array.isArray(task.shell) ? task.shell : task.shell ? [task.shell] : [];
  if (!cmds.length) {
    throw new Error(`Task ${task.id} runner=shell but no shell commands defined`);
  }
  for (const cmd of cmds) {
    console.log(`\n> ${cmd}\n`);
    const result = spawnSync(cmd, { cwd: repoRoot, shell: true, stdio: "inherit" });
    if ((result.status ?? 1) !== 0) {
      throw new Error(`Shell command failed (${result.status}): ${cmd}`);
    }
  }
  return { status: "finished", summary: `Shell OK: ${cmds.join(" && ")}` };
}

async function runOpenAiPrompt(prompt, pointer) {
  loadEnv();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set — add it to .env or use AGENTOS_FUNCTIONAL_DRIVER=cursor");
    process.exit(1);
  }
  const model = process.env.AGENTOS_FUNCTIONAL_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  console.log(`\n>>> OpenAI run ${pointer.task.id} (${model}): ${pointer.task.title}\n`);
  try {
    const result = await runOpenAiTask({ prompt, repoRoot, apiKey, model });
    console.log(`\n<<< ${pointer.task.id} status: ${result.status}\n`);
    console.log((result.summary ?? "").slice(0, 2000));
    if (result.status !== "finished") {
      throw new Error(`OpenAI run ${result.status} for ${pointer.task.id}`);
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("quota") || message.includes("billing")) {
      console.warn("\nOpenAI quota/billing blocked — falling back to Cursor SDK (default model).\n");
      return runSdkPrompt(prompt, pointer);
    }
    throw error;
  }
}

async function runTaskImplementation(prompt, pointer) {
  loadEnv();
  const runner = resolveTaskRunner(pointer.task);
  if (runner === "shell") return runShellTask(pointer.task);
  if (runner === "openai") return runOpenAiPrompt(prompt, pointer);
  return runSdkPrompt(prompt, pointer);
}

async function runSdkPrompt(prompt, pointer) {
  loadEnv();
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.error("CURSOR_API_KEY not set — use interactive mode (pnpm functional:prompt)");
    process.exit(1);
  }

  const Agent = await loadCursorAgent();
  if (!Agent) {
    console.error("Could not load @cursor/sdk — run pnpm install in apps/api");
    process.exit(1);
  }

  const model = process.env.AGENTOS_FUNCTIONAL_MODEL?.trim() || "default";
  const cwd = process.env.AGENTOS_CURSOR_REPO_CWD?.trim() || repoRoot;

  console.log(`\n>>> SDK run ${pointer.task.id}: ${pointer.task.title}\n`);
  const result = await Agent.prompt(prompt, {
    apiKey,
    model: { id: model },
    local: { cwd, settingSources: [] }
  });
  const summary =
    typeof result.result === "string"
      ? result.result
      : result.result != null
        ? JSON.stringify(result.result)
        : `(no result; status=${result.status}, id=${result.id ?? "?"})`;
  console.log(`\n<<< ${pointer.task.id} status: ${result.status}\n`);
  console.log(summary.slice(0, 2000) + (summary.length > 2000 ? "\n…(truncated)" : ""));
  if (result.status === "error" || result.status === "cancelled") {
    const err = new Error(`SDK run ${result.status} for ${pointer.task.id}`);
    err.sdkResult = result;
    throw err;
  }
  return { status: result.status, summary };
}

async function cmdRun(manifest, state) {
  const pointer = currentPointer(manifest, state);
  if (!pointer) {
    console.log("Program complete.");
    return;
  }

  const prompt =
    state.completedTasks.length === 0
      ? buildKickoffPrompt(pointer, manifest)
      : buildChainPrompt(pointer, manifest, state.completedTasks.at(-1) ?? "start");

  const sdkResult = await runTaskImplementation(prompt, pointer);
  state.history.push({
    at: new Date().toISOString(),
    kind: "task-run",
    taskId: pointer.task.id,
    runner: resolveTaskRunner(pointer.task),
    status: sdkResult.status,
    summary: (sdkResult.summary ?? "").slice(0, 2000)
  });
  saveState(state);

  const gateReport = runGates(manifest, loadState());
  console.log("\n" + formatGateReport(gateReport));
  if (!gateReport.ok) {
    console.error("\nStopped: gates failed after SDK run. Fix and re-run: pnpm functional:run\n");
    process.exit(1);
  }

  cmdNext(manifest, loadState(), { skipGates: true });
}

async function cmdLoop(manifest, state) {
  const maxCycles = Number(process.env.AGENTOS_FUNCTIONAL_MAX_CYCLES ?? 50);
  let cycles = 0;

  while (cycles < maxCycles) {
    const pointer = currentPointer(manifest, loadState());
    if (!pointer) {
      console.log("\nFunctionalization loop: PROGRAM COMPLETE\n");
      status(manifest, loadState());
      return;
    }

    cycles += 1;
    console.log(`\n——— Loop cycle ${cycles}/${maxCycles} ———\n`);
    await cmdRun(manifest, loadState());

    const after = loadState();
    if (!currentPointer(manifest, after)) break;

    const pauseMs = Number(process.env.AGENTOS_FUNCTIONAL_LOOP_PAUSE_MS ?? 5000);
    if (pauseMs > 0) {
      console.log(`Pausing ${pauseMs}ms before next cycle…`);
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }

  if (cycles >= maxCycles) {
    console.error(`Loop stopped at max cycles (${maxCycles}). Resume with: pnpm functional:loop`);
    process.exit(1);
  }
}

const cmd = process.argv[2] || "help";
const manifest = loadManifest();
let state = loadState();

switch (cmd) {
  case "start":
    cmdStart(manifest);
    break;
  case "next":
    cmdNext(manifest, state);
    break;
  case "prompt":
    cmdPrompt(manifest, state);
    break;
  case "status":
    status(manifest, state);
    break;
  case "gates":
    cmdGates(manifest, state, { phaseOnly: process.argv.includes("--phase") });
    break;
  case "reset":
    cmdReset();
    break;
  case "list":
    cmdList(manifest);
    break;
  case "run":
    await cmdRun(manifest, state);
    break;
  case "loop":
    await cmdLoop(manifest, state);
    break;
  default:
    console.log(`Usage: node scripts/functionalization-runner.mjs <command>

Commands:
  start   Reset program and print first task prompt
  next    Run gates; advance to next task prompt
  prompt  Reprint current task prompt
  gates   Run gates for current task (+ phase gates)
  status  Show progress
  reset   Reset state
  list    List all phases and tasks
  run     One SDK cycle: implement → gates → advance
  loop    SDK loop until complete or AGENTOS_FUNCTIONAL_MAX_CYCLES
`);
    process.exit(cmd === "help" ? 0 : 1);
}
