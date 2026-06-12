/**
 * Drop timestamp-only drift in wiki manifest files before commit.
 * Background cursor sync rewrites updatedAt/generatedAt without semantic changes.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const targets = [
  ".agentos/memory/wiki/_meta/graph.json",
  ".agentos/memory/wiki/_meta/index.json"
];

function stripTimestampFields(value) {
  if (Array.isArray(value)) return value.map(stripTimestampFields);
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === "updatedAt" || key === "generatedAt") continue;
      next[key] = stripTimestampFields(child);
    }
    return next;
  }
  return value;
}

function readHead(relPath) {
  try {
    return execSync(`git show HEAD:"${relPath.replace(/\\/g, "/")}"`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch {
    return null;
  }
}

function isTracked(relPath) {
  try {
    execSync(`git ls-files --error-unmatch "${relPath.replace(/\\/g, "/")}"`, {
      cwd: root,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}

let reset = 0;

for (const relPath of targets) {
  const absPath = join(root, relPath);
  if (!isTracked(relPath)) continue;

  let working;
  try {
    working = readFileSync(absPath, "utf8");
  } catch {
    continue;
  }

  const head = readHead(relPath);
  if (!head) continue;

  let workingParsed;
  let headParsed;
  try {
    workingParsed = JSON.parse(working);
    headParsed = JSON.parse(head);
  } catch {
    continue;
  }

  const workingSemantic = JSON.stringify(stripTimestampFields(workingParsed));
  const headSemantic = JSON.stringify(stripTimestampFields(headParsed));

  if (workingSemantic === headSemantic && working !== head) {
    writeFileSync(absPath, head, "utf8");
    reset += 1;
    console.log(`reset-wiki-meta: restored ${relPath} (timestamp-only drift)`);
  }
}

if (reset === 0) {
  console.log("reset-wiki-meta: no timestamp-only drift detected");
}
