/**
 * Patch .env for spine smoketest (idempotent).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

const PATCH = {
  FEATURE_TOOL_EXECUTION: "true",
  FEATURE_LLM_TOOL_LOOP: "true",
  AGENTOS_IMPLEMENTER_MODE: "gateway",
  AGENTOS_REQUIRE_HUMAN_APPROVAL: "false",
  AGENTOS_SEMGREP_GATE: "false",
  AGENTOS_SKIP_GH_PR: "true",
  AGENTOS_REPO_ROOT: root.replace(/\\/g, "/")
};

if (!existsSync(envPath)) {
  console.error("Missing .env — copy from .env.example first.");
  process.exit(1);
}

const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
const keys = new Set(Object.keys(PATCH));

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
  if (keys.has(key)) {
    lines[i] = `${key}=${PATCH[key]}`;
    keys.delete(key);
  }
}

for (const key of keys) {
  lines.push(`${key}=${PATCH[key]}`);
}

writeFileSync(envPath, `${lines.join("\n").replace(/\n*$/, "")}\n`, "utf8");
console.log(JSON.stringify({ ok: true, patched: Object.keys(PATCH) }, null, 2));
