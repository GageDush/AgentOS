/**
 * Index the AgentOS monorepo into .agentos/memory/wiki/ (structure + safe metadata only).
 * Never reads .env or credential files. Redacts token-like strings in excerpts.
 *
 * Usage: pnpm wiki:index-repo
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wikiRoot = join(root, ".agentos", "memory", "wiki");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "coverage",
  "_meta",
  ".turbo",
  ".agentos",
  "AgentOS_Project_Bundle"
]);

const SKIP_FILE_NAMES = new Set([".env", ".env.local", ".env.production"]);
const SKIP_FILE_PATTERN =
  /\.(pem|key|p12|pfx|crt|cer|sqlite|db|log)$/i;

const SECRET_PATH_PREFIXES = [
  ".env",
  "apps/api/src/discord-auth",
  "packages/persistence/",
  ".agentos/state/",
  "apps/api/src/github"
];

const REDACT_PATTERNS = [
  [/sk-[a-zA-Z0-9_-]{8,}/g, "[REDACTED_OPENAI_KEY]"],
  [/gho_[a-zA-Z0-9]+/g, "[REDACTED_GH_TOKEN]"],
  [/ghp_[a-zA-Z0-9]+/g, "[REDACTED_GH_TOKEN]"],
  [/github_pat_[a-zA-Z0-9_]+/gi, "[REDACTED_GH_TOKEN]"],
  [/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED]"],
  [/postgresql:\/\/[^\s"'`]+/gi, "postgresql://[REDACTED]"],
  [/redis:\/\/[^\s"'`]+/gi, "redis://[REDACTED]"],
  [/CURSOR_API_KEY=[^\s]+/gi, "CURSOR_API_KEY=[REDACTED]"],
  [/SESSION_SECRET=[^\s]+/gi, "SESSION_SECRET=[REDACTED]"],
  [/DISCORD_CLIENT_SECRET=[^\s]+/gi, "DISCORD_CLIENT_SECRET=[REDACTED]"],
  [/OPENAI_API_KEY=[^\s]+/gi, "OPENAI_API_KEY=[REDACTED]"],
  [/AUTH_CLIENT_SECRET=[^\s]+/gi, "AUTH_CLIENT_SECRET=[REDACTED]"],
  [/GH_TOKEN=[^\s]+/gi, "GH_TOKEN=[REDACTED]"]
];

function redact(text) {
  let next = text;
  for (const [pattern, replacement] of REDACT_PATTERNS) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromSlug(slug) {
  const leaf = slug.split("/").pop() ?? slug;
  return leaf
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function writeArticle(slug, title, tags, body, { overwrite = "auto-indexed" } = {}) {
  const relPath = slug === "index" ? "index.md" : `${slug}.md`;
  const absPath = join(wikiRoot, relPath);
  const existing = existsSync(absPath) ? readFileSync(absPath, "utf8") : "";

  if (existing && overwrite === "never") return false;
  if (existing && overwrite !== "always" && !existing.includes("auto-indexed")) {
    return false;
  }

  mkdirSync(dirname(absPath), { recursive: true });
  const tagList = [...new Set([...(tags ?? []), "auto-indexed"])];
  const frontmatter = [
    "---",
    `slug: ${slug}`,
    `title: ${title}`,
    `tags: [${tagList.join(", ")}]`,
    "archived: false",
    `valid_from: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    ""
  ].join("\n");

  writeFileSync(absPath, `${frontmatter}${body.trimEnd()}\n`, "utf8");
  return true;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    meta[key] = value;
  }
  return meta;
}

function extractSection(markdown, heading) {
  const pattern = new RegExp(`^## ${heading}\\s*$([\\s\\S]*?)(?=^## |\\Z)`, "m");
  const match = markdown.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function listTree(dir, base = dir, depth = 0, maxDepth = 3) {
  if (!existsSync(dir) || depth > maxDepth) return [];
  const rows = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    if (SKIP_FILE_NAMES.has(entry.name) || SKIP_FILE_PATTERN.test(entry.name)) continue;
    const abs = join(dir, entry.name);
    const rel = relative(base, abs).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      rows.push(`${"  ".repeat(depth)}- \`${rel}/\``);
      rows.push(...listTree(abs, base, depth + 1, maxDepth));
    } else if (/\.(ts|tsx|js|mjs|json|md|sql|css)$/.test(entry.name)) {
      rows.push(`${"  ".repeat(depth)}- \`${rel}\``);
    }
  }
  return rows;
}

function readPackageJson(relDir) {
  const path = join(root, relDir, "package.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function workspaceDeps(pkg) {
  return Object.keys(pkg?.dependencies ?? {}).filter((name) => name.startsWith("@agentos/"));
}

function listExports(relDir) {
  const indexCandidates = ["src/index.ts", "src/index.tsx", "index.ts"];
  for (const candidate of indexCandidates) {
    const path = join(root, relDir, candidate);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    const exports = [];
    for (const match of content.matchAll(/^export (?:type |interface |function |const |class |async function )?([A-Za-z0-9_]+)/gm)) {
      exports.push(match[1]);
    }
    for (const match of content.matchAll(/^export \{([^}]+)\}/gm)) {
      for (const part of match[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0]?.trim();
        if (name) exports.push(name);
      }
    }
    return [...new Set(exports)].slice(0, 24);
  }
  return [];
}

function loadEnvVarNames() {
  const example = join(root, ".env.example");
  if (!existsSync(example)) return [];
  return readFileSync(example, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")).trim())
    .filter(Boolean);
}

function safeDocExcerpt(relPath, maxChars = 2400) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) return "";
  const raw = readFileSync(abs, "utf8");
  const stripped = raw
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/```[\s\S]*?```/g, "[code block omitted]")
    .slice(0, maxChars);
  return redact(stripped).trim();
}

function indexWorkspaceUnits(kind) {
  const baseDir = kind === "apps" ? join(root, "apps") : join(root, "packages");
  const written = [];
  if (!existsSync(baseDir)) return written;

  for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const relDir = `${kind}/${entry.name}`;
    const pkg = readPackageJson(relDir);
    if (!pkg) continue;

    const slug = `${kind}/${entry.name}`;
    const deps = workspaceDeps(pkg);
    const exports = listExports(relDir);
    const tree = listTree(join(root, relDir, "src"), join(root, relDir), 0, 2);
    const pkgSlug = kind === "packages" ? `packages/${entry.name}` : `apps/${entry.name}`;

    const body = [
      `# ${pkg.name ?? titleFromSlug(entry.name)}`,
      "",
      pkg.description ? redact(pkg.description) : `AgentOS ${kind.slice(0, -1)} workspace unit.`,
      "",
      "## Role",
      "",
      kind === "apps"
        ? `Runnable service under \`${relDir}/\`.`
        : `Shared library under \`${relDir}/\`.`,
      "",
      "## Workspace dependencies",
      "",
      deps.length ? deps.map((dep) => `- \`${dep}\``).join("\n") : "- _(none)_",
      "",
      exports.length ? "## Key exports\n\n" + exports.map((name) => `- \`${name}\``).join("\n") : "",
      "",
      tree.length ? "## Source layout\n\n" + tree.slice(0, 40).join("\n") : "",
      "",
      "## Related",
      "",
      `- [[areas/repo-layout]]`,
      `- [[areas/dependency-graph]]`,
      kind === "packages" ? `- [[packages/runtime]]` : `- [[apps/api]]`
    ]
      .filter(Boolean)
      .join("\n");

    if (writeArticle(slug, titleFromSlug(entry.name), [kind.slice(0, -1), "monorepo"], body)) {
      written.push(slug);
    }
  }
  return written;
}

function indexAgents() {
  const agentsDir = join(root, ".agentos", "agents");
  const written = [];
  for (const file of readdirSync(agentsDir).filter((name) => name.endsWith(".md"))) {
    const agentId = file.replace(/\.md$/, "");
    const raw = readFileSync(join(agentsDir, file), "utf8");
    const meta = parseFrontmatter(raw);
    const runtime = extractSection(raw, "Runtime Excerpt");
    const useWhen = extractSection(raw, "Use When").split(/\r?\n/).slice(0, 8).join("\n");
    const handoff = Array.isArray(meta.handoff_to) ? meta.handoff_to : [];

    const body = [
      `# ${meta.name ?? agentId}`,
      "",
      meta.description ? redact(String(meta.description)) : "AgentOS specialist profile.",
      "",
      "## Runtime excerpt",
      "",
      runtime ? redact(runtime) : "_No runtime excerpt._",
      "",
      handoff.length
        ? "## Handoff\n\n" + handoff.map((id) => `- [[agents/${id}]]`).join("\n")
        : "",
      "",
      useWhen ? "## Use when\n\n" + redact(useWhen) : "",
      "",
      "## Profile path",
      "",
      `- \`.agentos/agents/${file}\``,
      "",
      "## Related",
      "",
      "- [[index]]",
      "- [[flows/pipeline]]",
      "- [[packages/agents]]"
    ]
      .filter(Boolean)
      .join("\n");

    const slug = `agents/${agentId}`;
    if (writeArticle(slug, titleFromSlug(agentId), ["agent", "profile"], body)) {
      written.push(slug);
    }
  }
  return written;
}

function indexDocs() {
  const written = [];
  const docRoots = ["docs"];
  const files = [];

  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (entry.name.endsWith(".md")) {
        files.push(relative(root, join(dir, entry.name)).replace(/\\/g, "/"));
      }
    }
  }

  for (const docRoot of docRoots) walk(join(root, docRoot));

  for (const relPath of files.sort()) {
    if (relPath.includes("AGENTOS_AGENT_PROFILES_COMBINED")) continue;
    const slug = `docs/${slugify(relPath.replace(/^docs\//, "").replace(/\.md$/, ""))}`;
    const title = titleFromSlug(basename(relPath, ".md"));
    const excerpt = safeDocExcerpt(relPath);
    if (!excerpt) continue;

    const body = [
      `# ${title}`,
      "",
      `Source: \`${relPath}\` (excerpt; secrets redacted).`,
      "",
      "## Excerpt",
      "",
      excerpt,
      "",
      "## Related",
      "",
      "- [[index]]",
      "- [[areas/repo-layout]]"
    ].join("\n");

    if (writeArticle(slug, title, ["docs"], body)) written.push(slug);
  }
  return written;
}

function indexAreas(registry) {
  const apps = readdirSync(join(root, "apps"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `apps/${e.name}`);
  const packages = readdirSync(join(root, "packages"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `packages/${e.name}`);

  const repoLayout = [
    "# Repository layout",
    "",
    "Auto-indexed monorepo map (paths only; no secrets).",
    "",
    "## Applications",
    "",
    ...apps.map((path) => `- [[${path}]] — \`${path}/\``),
    "",
    "## Packages",
    "",
    ...packages.map((path) => `- [[${path}]] — \`${path}/\``),
    "",
    "## Agent profiles",
    "",
    ...registry.coreAgents.map((id) => `- [[agents/${id}]]`),
    "",
    "## Other paths",
    "",
    "- `scripts/` — stack control, smoke, wiki indexing",
    "- `.agentos/agents/` — agent profile markdown",
    "- `.agentos/memory/wiki/` — this wiki",
    "- `e2e/` — Playwright acceptance tests",
    "",
    "## Related",
    "",
    "- [[index]]",
    "- [[areas/dependency-graph]]"
  ].join("\n");

  const depLines = ["# Dependency graph", "", "Workspace `dependencies` ( @agentos/* only ).", ""];
  for (const relDir of [...apps, ...packages]) {
    const pkg = readPackageJson(relDir);
    if (!pkg) continue;
    const deps = workspaceDeps(pkg);
    depLines.push(`## ${relDir}`, "", deps.length ? deps.map((d) => `- \`${d}\``).join("\n") : "- _(no workspace deps)_", "");
  }
  depLines.push("## Related", "", "- [[index]]", "- [[areas/repo-layout]]");

  const ownership = [
    "# Code ownership map",
    "",
    "Routing hints from agent registry (not formal CODEOWNERS).",
    "",
    "## By area",
    "",
    "| Area | Primary agent |",
    "| --- | --- |",
    "| `apps/api/` | [[agents/backend-service-agent]] |",
    "| `apps/command-center/` | [[agents/frontend-ui-agent]] |",
    "| `apps/gateway/` | [[agents/backend-service-agent]] |",
    "| `apps/worker/` | [[agents/backend-service-agent]] |",
    "| `apps/scheduler/` | [[agents/backend-service-agent]] |",
    "| `packages/runtime/` | [[agents/code-implementer]] |",
    "| `packages/agents/` | [[agents/code-implementer]] |",
    "| `packages/orchestrator/` | [[agents/architect-agent]] |",
    "| `packages/memory/` | [[agents/memory-curator]] |",
    "| `.agentos/agents/` | [[agents/architect-agent]] |",
    "| `docs/` | [[agents/docs-agent]] |",
    "",
    "## Related",
    "",
    "- [[areas/risk-areas]]",
    "- [[packages/agents]]"
  ].join("\n");

  const risk = [
    "# Risk areas",
    "",
    "Elevated-risk paths and policies. **Values and credentials are never stored in the wiki.**",
    "",
    "## High sensitivity (paths only)",
    "",
    ...SECRET_PATH_PREFIXES.map((path) => `- \`${path}\``),
    "",
    "## Policy",
    "",
    "- Default sandbox requires approval for `workspace_write` missions.",
    "- Release Manager gates commits; `AGENTOS_NO_SELF_APPROVAL` blocks implementer self-approve.",
    "- Run `pnpm sanitize:check` before release.",
    "",
    "## Related",
    "",
    "- [[packages/runtime]]",
    "- [[flows/test-commands]]"
  ].join("\n");

  const always = { overwrite: "always" };
  writeArticle("areas/repo-layout", "Repository layout", ["navigation", "monorepo"], repoLayout, always);
  writeArticle("areas/dependency-graph", "Dependency graph", ["monorepo", "packages"], depLines.join("\n"), always);
  writeArticle("areas/code-ownership", "Code ownership map", ["ownership", "navigation"], ownership, always);
  writeArticle("areas/risk-areas", "Risk areas", ["security", "policy"], risk, always);

  return ["areas/repo-layout", "areas/dependency-graph", "areas/code-ownership", "areas/risk-areas"];
}

function indexPipeline(registry) {
  const body = [
    "# Agent pipeline",
    "",
    "Conditional control flow from `.agentos/agent-registry.json` (not a fixed assembly line).",
    "",
    "## Default pipeline",
    "",
    ...registry.conditionalPipeline.map((step, index) => `${index + 1}. \`${step}\``),
    "",
    "## Core agents",
    "",
    ...registry.coreAgents.map((id) => `- [[agents/${id}]]`),
    "",
    "## Addon agents",
    "",
    ...registry.addonAgents.map((id) => `- [[agents/${id}]]`),
    "",
    "## Principles",
    "",
    ...registry.principles.map((item) => `- ${item}`),
    "",
    "## Related",
    "",
    "- [[packages/runtime]]",
    "- [[packages/orchestrator]]",
    "- [[index]]"
  ].join("\n");

  writeArticle("flows/pipeline", "Agent pipeline", ["pipeline", "routing"], body, { overwrite: "always" });
  return ["flows/pipeline"];
}

function indexConfig() {
  const envVars = loadEnvVarNames();
  const scripts = readdirSync(join(root, "scripts"))
    .filter((name) => /\.(mjs|ps1|ts)$/.test(name))
    .slice(0, 40);

  const body = [
    "# Configuration reference",
    "",
    "Environment variable **names** from `.env.example` only (no values).",
    "",
    "## Feature flags",
    "",
    ...envVars.filter((name) => name.startsWith("FEATURE_")).map((name) => `- \`${name}\``),
    "",
    "## AgentOS runtime",
    "",
    ...envVars.filter((name) => name.startsWith("AGENTOS_")).map((name) => `- \`${name}\``),
    "",
    "## Scripts",
    "",
    ...scripts.map((name) => `- \`scripts/${name}\``),
    "",
    "## Related",
    "",
    "- [[areas/risk-areas]]",
    "- [[flows/test-commands]]",
    "- [[index]]"
  ].join("\n");

  writeArticle("areas/config", "Configuration reference", ["config", "env"], body, { overwrite: "always" });
  return ["areas/config"];
}

function indexRootScripts() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const scripts = Object.entries(pkg.scripts ?? {})
    .filter(([name]) => !name.startsWith("project:wave"))
    .slice(0, 50);

  const body = [
    "# Root scripts",
    "",
    "Key `pnpm` scripts from root `package.json`.",
    "",
    "## Development",
    "",
    ...scripts
      .filter(([name]) => /^(dev|stack|control)/.test(name))
      .map(([name, cmd]) => `- \`pnpm ${name}\` — \`${cmd}\``),
    "",
    "## Verification",
    "",
    ...scripts
      .filter(([name]) => /^(test|typecheck|sanitize|env|wiki|memory|smoke|acceptance)/.test(name))
      .map(([name, cmd]) => `- \`pnpm ${name}\` — \`${cmd}\``),
    "",
    "## Related",
    "",
    "- [[flows/test-commands]]",
    "- [[index]]"
  ].join("\n");

  writeArticle("flows/root-scripts", "Root scripts", ["tooling", "pnpm"], body, { overwrite: "always" });
  return ["flows/root-scripts"];
}

function indexHome(registry, counts) {
  const body = [
    "# AgentOS Memory Wiki",
    "",
    "Full-repo index (auto-generated, secrets excluded). Curator merges still apply via [[flows/memory-curator]].",
    "",
    "## Start here",
    "",
    "- [[flows/test-commands]] — verification",
    "- [[flows/pipeline]] — agent routing",
    "- [[areas/repo-layout]] — monorepo map",
    "- [[areas/config]] — env var names (no values)",
    "- [[packages/runtime]] — mission spine",
    "",
    "## Applications",
    "",
    ...readdirSync(join(root, "apps"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => `- [[apps/${e.name}]]`),
    "",
    "## Packages",
    "",
    ...readdirSync(join(root, "packages"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => `- [[packages/${e.name}]]`),
    "",
    "## Agents",
    "",
    ...registry.coreAgents.map((id) => `- [[agents/${id}]]`),
    "",
    "## Documentation",
    "",
    "- [[docs/overview]]",
    "- [[docs/architecture]]",
    "- [[docs/troubleshooting]]",
    "- [[docs/gates]]",
    "",
    "## Index stats",
    "",
    `- Articles indexed this run: **${counts.total}**`,
    `- Generated at: ${new Date().toISOString()}`,
    "",
    "## How it works",
    "",
    "1. `pnpm wiki:index-repo` rebuilds structure from the repo (paths + safe excerpts).",
    "2. Context minimizer loads manifest + section-ranked [[wikilinks]].",
    "3. Mission curator proposes merges; operator approves in Forge."
  ].join("\n");

  writeArticle("index", "AgentOS Memory Wiki", ["home", "agentos"], body, { overwrite: "always" });
}

const registry = JSON.parse(readFileSync(join(root, ".agentos", "agent-registry.json"), "utf8"));
mkdirSync(wikiRoot, { recursive: true });

const report = {
  apps: indexWorkspaceUnits("apps"),
  packages: indexWorkspaceUnits("packages"),
  agents: indexAgents(),
  docs: indexDocs(),
  areas: indexAreas(registry),
  flows: [...indexPipeline(registry), ...indexRootScripts()],
  config: indexConfig()
};

const total =
  report.apps.length +
  report.packages.length +
  report.agents.length +
  report.docs.length +
  report.areas.length +
  report.flows.length +
  report.config.length;

indexHome(registry, { total });

const { rebuildWikiManifest } = await import("../packages/memory/src/wiki/index-manifest.ts");
const manifest = rebuildWikiManifest(root);

console.log(
  JSON.stringify(
    {
      ok: true,
      written: report,
      totalArticles: manifest.articles.length,
      totalSections: manifest.articles.reduce((sum, row) => sum + (row.sections?.length ?? 0), 0),
      generatedAt: manifest.generatedAt
    },
    null,
    2
  )
);
