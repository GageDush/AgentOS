#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadAndValidateAuthMatrix, repoRoot } from "./auth-matrix-lib.mjs";

const matrixPath = join(repoRoot, "docs", "architecture", "api-auth-matrix.md");

if (!existsSync(matrixPath)) {
  console.error(`Missing ${matrixPath}`);
  process.exit(1);
}

const result = loadAndValidateAuthMatrix();
if (!result.ok) {
  console.error("Auth matrix check: FAIL");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`Auth matrix check: PASS (${result.routeCount} routes, ${result.matrixCount} matrix rows)`);
