import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const agentosRoot = path.join(repoRoot, ".agentos");
const registryPath = path.join(agentosRoot, "agent-registry.json");
const contractsRoot = path.join(agentosRoot, "contracts");
const agentsRoot = path.join(agentosRoot, "agents");

const requiredSections = [
  "Mission",
  "Use When",
  "Do Not Use When",
  "Inputs Expected",
  "Workflow",
  "Output Contract",
  "Escalation Rules",
  "Token Rules",
  "Failure Behavior"
];

const expectedPipeline = [
  "admin-agent",
  "task-classifier",
  "context-minimizer?",
  "quota-steward",
  "planner-partitioner?",
  "specialists?",
  "qa-agent?",
  "security-auditor?",
  "code-reviewer?",
  "release-manager?",
  "admin-agent"
];

function fail(message) {
  throw new Error(message);
}

function parseJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${label} failed to parse: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseFrontmatter(markdown, filePath) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    fail(`${filePath} is missing YAML frontmatter.`);
  }

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(":");
    if (parts.length < 2) continue;
    const key = parts.shift().trim();
    const value = parts.join(":").trim();
    frontmatter[key] = value;
  }

  if (!frontmatter.name) fail(`${filePath} frontmatter is missing "name".`);
  if (!frontmatter.version) fail(`${filePath} frontmatter is missing "version".`);
  return frontmatter;
}

function validateSections(markdown, filePath) {
  for (const section of requiredSections) {
    const pattern = new RegExp(`^# ${section}$`, "m");
    if (!pattern.test(markdown)) {
      fail(`${filePath} is missing required section "${section}".`);
    }
  }
}

function validateProfile(agentName) {
  const filePath = path.join(agentsRoot, `${agentName}.md`);
  if (!fs.existsSync(filePath)) {
    fail(`Registered agent "${agentName}" is missing profile file ${filePath}.`);
  }
  const markdown = fs.readFileSync(filePath, "utf8");
  parseFrontmatter(markdown, filePath);
  validateSections(markdown, filePath);
}

function main() {
  if (!fs.existsSync(registryPath)) fail(`Missing registry: ${registryPath}`);
  const registry = parseJson(registryPath, "agent-registry.json");

  parseJson(path.join(contractsRoot, "task-envelope.schema.json"), "task-envelope.schema.json");
  parseJson(path.join(contractsRoot, "agent-report.schema.json"), "agent-report.schema.json");

  const allAgents = [...(registry.coreAgents ?? []), ...(registry.addonAgents ?? [])];
  if (allAgents.length === 0) {
    fail("agent-registry.json does not list any agents.");
  }

  if ((registry.memoryCuratorStatus ?? "") !== "excluded_for_later_design") {
    fail('memoryCuratorStatus must stay "excluded_for_later_design".');
  }

  if (allAgents.includes("memory-curator")) {
    fail("memory-curator should not be required in this phase.");
  }

  const pipeline = registry.conditionalPipeline ?? [];
  if (JSON.stringify(pipeline) !== JSON.stringify(expectedPipeline)) {
    fail("conditionalPipeline does not match the expected token-optimized AgentOS flow.");
  }

  const principles = new Set(registry.principles ?? []);
  for (const principle of [
    "conditional_not_linear",
    "agents_receive_envelopes_not_transcripts",
    "reviewers_do_not_implement",
    "deterministic_checks_beat_llm_opinions",
    "no_agent_self_approval"
  ]) {
    if (!principles.has(principle)) {
      fail(`agent-registry.json is missing principle "${principle}".`);
    }
  }

  for (const agentName of allAgents) {
    validateProfile(agentName);
  }

  const installedProfiles = fs
    .readdirSync(agentsRoot)
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => entry.replace(/\.md$/, ""));
  const unknownProfiles = installedProfiles.filter((entry) => !allAgents.includes(entry));
  if (unknownProfiles.includes("memory-curator")) {
    fail("memory-curator profile should not be installed yet.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        registryPath,
        profilesValidated: allAgents.length,
        contractsValidated: 2,
        conditionalPipeline: pipeline
      },
      null,
      2
    )
  );
}

main();
