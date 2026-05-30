import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const forbidden = [
  "T3BlbkNsYXc=",
  "b3BlbmNsYXc=",
  "T1BFTkNMQVc=",
  "Q2xhd3dyaWdodA==",
  "Y2xhd3dyaWdodA==",
  "RmFjdG9yeS5haQ==",
  "RmFjdG9yeSBBSQ==",
  "RHJvaWQ=",
  "RHJvaWRz",
  "ZHJvaWQ=",
  "TWlzc2lvbiBDb250cm9s",
  "QmFzZU9wcw==",
  "QmFzZU9wcyBIUQ=="
].map((term) => Buffer.from(term, "base64").toString("utf8"));

const scanRoots = [
  "apps",
  "packages",
  "configs",
  "prompts",
  "scripts",
  "docker",
  ".github",
  "package.json",
  "pnpm-workspace.yaml",
  ".env.example",
  "README.md",
  "AGENTS.md"
];

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml"
]);

async function walk(target) {
  const full = path.join(root, target);
  const entries = [];
  try {
    const stats = await import("node:fs/promises").then((fs) => fs.stat(full));
    if (stats.isFile()) return [full];
    for (const entry of await readdir(full, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
      const child = path.join(target, entry.name);
      entries.push(...(await walk(child)));
    }
  } catch {
    return [];
  }
  return entries;
}

const files = (await Promise.all(scanRoots.map(walk))).flat();
const failures = [];

for (const file of files) {
  if (!textExtensions.has(path.extname(file))) continue;
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const content = await readFile(file, "utf8");
  for (const term of forbidden) {
    if (content.includes(term)) {
      failures.push(`${relative}: forbidden reference "${term}"`);
    }
  }
}

if (failures.length > 0) {
  console.error("AgentOS sanitization failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`AgentOS sanitization passed across ${files.length} product-facing files.`);
