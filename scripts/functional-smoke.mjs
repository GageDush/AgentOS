#!/usr/bin/env node
/** Chains smokes for the functional profile (expanded in phase 2.4). */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const chain = ["pnpm mission:smoke", "pnpm tool:smoke", "pnpm llm:smoke"];

for (const cmd of chain) {
  console.log(`\n> ${cmd}\n`);
  const result = spawnSync(cmd, { cwd: repoRoot, shell: true, stdio: "inherit" });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}
console.log("\nfunctional:smoke PASS\n");
