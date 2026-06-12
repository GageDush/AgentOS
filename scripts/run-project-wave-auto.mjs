#!/usr/bin/env node
/**
 * Run P1–P10 automatically via @cursor/sdk (requires CURSOR_API_KEY).
 * Usage: pnpm project:wave:run-all
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(__dirname, "project-wave.manifest.json"), "utf8"));
const statePath = join(repoRoot, ".agentos", "state", "project-wave-state.json");

function loadEnv() {
  const envPath = join(repoRoot, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function buildStartPrompt(project) {
  return [
    `Start ${project.id} — ${project.title}.`,
    project.summary,
    `Execute all 10 steps in ${manifest.scopingDoc}.`,
    "When finished, summarize what was done and what was not done."
  ].join("\n");
}

function buildChainPrompt(project) {
  return manifest.chainPromptTemplate.replace("{id}", project.id);
}

loadEnv();
const apiKey = process.env.CURSOR_API_KEY?.trim();
if (!apiKey) {
  console.error("Set CURSOR_API_KEY in .env");
  process.exit(1);
}

const { Agent } = await import(join(repoRoot, "apps/api/node_modules/@cursor/sdk"));
const model = process.env.AGENTOS_CURSOR_MODEL?.trim() || "composer-2.5";
const cwd = process.env.AGENTOS_CURSOR_REPO_CWD?.trim() || repoRoot;

const state = { index: 0, completed: [], history: [], startedAt: new Date().toISOString() };

for (let i = 0; i < manifest.projects.length; i++) {
  const project = manifest.projects[i];
  const prompt = i === 0 ? buildStartPrompt(project) : buildChainPrompt(project);
  console.log(`\n>>> ${project.id}\n`);
  const result = await Agent.prompt(prompt, { apiKey, model: { id: model }, local: { cwd } });
  state.completed.push(project.id);
  state.index = i + 1;
  state.history.push({
    at: new Date().toISOString(),
    id: project.id,
    status: result.status,
    summary: String(result.result ?? "").slice(0, 1500)
  });
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

state.completedAt = new Date().toISOString();
writeFileSync(statePath, JSON.stringify(state, null, 2));
console.log("\nProject wave P1–P10 complete.\n");
