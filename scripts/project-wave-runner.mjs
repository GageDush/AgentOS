#!/usr/bin/env node
/**
 * AgentOS project wave runner — P1 through P10 in order.
 *
 * Interactive (Cursor chat):
 *   pnpm project:wave          # print P1 prompt, copy on Windows via .ps1
 *   pnpm project:wave:next     # after agent finishes, get next chain prompt
 *
 * Automated (requires CURSOR_API_KEY in .env):
 *   pnpm project:wave:run      # run all projects via @cursor/sdk
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const manifestPath = join(__dirname, "project-wave.manifest.json");
const statePath = join(repoRoot, ".agentos", "state", "project-wave-state.json");

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

function loadState() {
  if (!existsSync(statePath)) {
    return { index: 0, completed: [], history: [] };
  }
  return JSON.parse(readFileSync(statePath, "utf8"));
}

function saveState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function buildStartPrompt(project, manifest) {
  return [
    `Start ${project.id} — ${project.title}.`,
    "",
    project.summary,
    "",
    `Execute all 10 steps for ${project.id} in ${manifest.scopingDoc} (10-step gameplan section).`,
    "Follow AGENTS.md rules. Run relevant tests before marking steps complete.",
    "Do not advance a step until its success parameters are met.",
    "",
    "When finished, give a clear summary:",
    "- What was done (with file paths)",
    "- What was not done (and why)",
    "- Recommended next step if blocked"
  ].join("\n");
}

function buildChainPrompt(project, manifest) {
  return manifest.chainPromptTemplate.replace("{id}", project.id);
}

function promptForIndex(manifest, index, { isChain = false } = {}) {
  const project = manifest.projects[index];
  if (!project) return null;
  if (index === 0 && !isChain) {
    return buildStartPrompt(project, manifest);
  }
  return buildChainPrompt(project, manifest);
}

function printPrompt(text, label) {
  console.log("\n" + "=".repeat(72));
  console.log(label);
  console.log("=".repeat(72));
  console.log(text);
  console.log("=".repeat(72) + "\n");
}

function status(manifest, state) {
  const total = manifest.projects.length;
  const current = manifest.projects[state.index];
  console.log(`Project wave: ${state.completed.length}/${total} completed`);
  console.log(`Current index: ${state.index} (${current?.id ?? "done"})`);
  if (current) {
    console.log(`Next action: ${current.id} — ${current.title}`);
  } else {
    console.log("All projects complete.");
  }
  if (state.completed.length) {
    console.log("Completed:", state.completed.join(", "));
  }
}

function cmdStart(manifest, state) {
  state = { index: 0, completed: [], history: [], startedAt: new Date().toISOString() };
  const text = promptForIndex(manifest, 0);
  state.history.push({ at: new Date().toISOString(), id: "P1", kind: "start", prompt: text });
  saveState(state);
  printPrompt(text, "PASTE THIS IN CURSOR CHAT (P1 kickoff)");
  return text;
}

function cmdNext(manifest, state) {
  const current = manifest.projects[state.index];
  if (!current) {
    console.log("Wave already complete. Run: pnpm project:wave:reset");
    return null;
  }

  state.completed.push(current.id);
  state.index += 1;
  const next = manifest.projects[state.index];

  if (!next) {
    state.completedAt = new Date().toISOString();
    saveState(state);
    console.log(`\nFinished ${current.id}. All P1–P10 complete.\n`);
    status(manifest, state);
    return null;
  }

  const text = buildChainPrompt(next, manifest);
  state.history.push({
    at: new Date().toISOString(),
    id: next.id,
    kind: "chain",
    after: current.id,
    prompt: text
  });
  saveState(state);

  printPrompt(text, `PASTE THIS IN CURSOR CHAT (after ${current.id} → ${next.id})`);
  return text;
}

function cmdPrompt(manifest, state) {
  const project = manifest.projects[state.index];
  if (!project) {
    console.log("Wave complete.");
    return null;
  }
  const text =
    state.index === 0 && state.completed.length === 0
      ? buildStartPrompt(project, manifest)
      : buildChainPrompt(project, manifest);
  printPrompt(text, `CURRENT PROMPT (${project.id})`);
  return text;
}

function cmdReset() {
  if (existsSync(statePath)) {
    writeFileSync(
      statePath,
      JSON.stringify({ index: 0, completed: [], history: [], resetAt: new Date().toISOString() }, null, 2)
    );
  }
  console.log("Project wave state reset. Run: pnpm project:wave");
}

async function cmdRun(manifest, state) {
  loadEnv();
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.error("CURSOR_API_KEY not set in .env — use interactive mode (pnpm project:wave)");
    process.exit(1);
  }

  let Agent;
  const sdkCandidates = [
    "@cursor/sdk",
    join(repoRoot, "apps", "api", "node_modules", "@cursor", "sdk")
  ];
  for (const spec of sdkCandidates) {
    try {
      ({ Agent } = await import(spec));
      break;
    } catch {
      /* try next */
    }
  }
  if (!Agent) {
    console.error("Could not load @cursor/sdk — run: pnpm install (apps/api has the dependency)");
    process.exit(1);
  }

  const model = process.env.AGENTOS_CURSOR_MODEL?.trim() || "composer-2.5";
  const cwd = process.env.AGENTOS_CURSOR_REPO_CWD?.trim() || repoRoot;

  if (state.index >= manifest.projects.length && state.completed.length === manifest.projects.length) {
    console.log("Wave already complete. pnpm project:wave:reset to rerun.");
    return;
  }

  for (let i = state.index; i < manifest.projects.length; i++) {
    const project = manifest.projects[i];
    const prompt =
      i === 0 && state.completed.length === 0
        ? buildStartPrompt(project, manifest)
        : buildChainPrompt(project, manifest);

    console.log(`\n>>> Running ${project.id}: ${project.title}\n`);
    state.history.push({ at: new Date().toISOString(), id: project.id, kind: "sdk-run", prompt });

    try {
      const result = await Agent.prompt(prompt, {
        apiKey,
        model: { id: model },
        local: { cwd }
      });
      const summary = typeof result.result === "string" ? result.result : JSON.stringify(result.result);
      state.completed.push(project.id);
      state.index = i + 1;
      state.history.push({
        at: new Date().toISOString(),
        id: project.id,
        kind: "sdk-result",
        status: result.status,
        summary: summary.slice(0, 2000)
      });
      saveState(state);
      console.log(`\n<<< ${project.id} status: ${result.status}\n`);
      console.log(summary.slice(0, 1500) + (summary.length > 1500 ? "\n…(truncated)" : ""));
    } catch (err) {
      state.history.push({
        at: new Date().toISOString(),
        id: project.id,
        kind: "sdk-error",
        error: String(err)
      });
      saveState(state);
      console.error(`Failed on ${project.id}:`, err);
      process.exit(1);
    }
  }

  state.completedAt = new Date().toISOString();
  saveState(state);
  console.log("\nAll P1–P10 SDK runs finished.\n");
}

function cmdList(manifest) {
  manifest.projects.forEach((p, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${p.id} — ${p.title}`);
  });
}

const cmd = process.argv[2] || "prompt";
const manifest = loadManifest();
let state = loadState();

switch (cmd) {
  case "start":
    cmdStart(manifest, state);
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
  case "reset":
    cmdReset();
    break;
  case "list":
    cmdList(manifest);
    break;
  case "run":
    await cmdRun(manifest, state);
    break;
  default:
    console.log(`Usage: node scripts/project-wave-runner.mjs <command>

Commands:
  start   Reset wave and print P1 kickoff prompt
  next    Mark current project done; print chain prompt for next
  prompt  Reprint current prompt without advancing
  status  Show progress
  reset   Reset state only
  list    List P1–P10
  run     Automated run via CURSOR_API_KEY + @cursor/sdk
`);
    process.exit(cmd === "help" ? 0 : 1);
}
