import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultAgents, type AgentProfile } from "@agentos/shared";
import { findRepoRoot } from "@agentos/persistence";

export const productionTeam = defaultAgents;

export type AgentRegistry = {
  version: string;
  memoryCuratorStatus?: string;
  coreAgents: string[];
  addonAgents: string[];
  conditionalPipeline: string[];
  principles: string[];
};

export type InstalledAgentProfile = {
  id: string;
  frontmatter: Record<string, string | string[]>;
  body: string;
  sections: string[];
};

export type InstalledAgentProfileSet = {
  rootDir: string;
  registry: AgentRegistry;
  profiles: InstalledAgentProfile[];
};

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: {}, body: markdown };
  const frontmatter: Record<string, string | string[]> = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      frontmatter[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      frontmatter[key] = value;
    }
  }
  return { frontmatter, body: markdown.slice(match[0].length) };
}

function extractSections(body: string) {
  return [...body.matchAll(/^#\s+(.+)$/gm)].map((match) => match[1].trim());
}

export { executeAgentPipelineStep, executeAgentStep } from "./executor";
export type { AgentReport } from "@agentos/shared";

export function loadInstalledAgentProfiles(rootDir = findRepoRoot()) {
  const registryPath = join(rootDir, ".agentos", "agent-registry.json");
  const agentsDir = join(rootDir, ".agentos", "agents");
  if (!existsSync(registryPath)) {
    throw new Error(`Agent registry not found at ${registryPath}`);
  }

  const registry = JSON.parse(readFileSync(registryPath, "utf8")) as AgentRegistry;
  const profileIds = [...registry.coreAgents, ...registry.addonAgents];
  const profiles = profileIds.map((id) => {
    const profilePath = join(agentsDir, `${id}.md`);
    if (!existsSync(profilePath)) {
      throw new Error(`Registered agent profile is missing: ${profilePath}`);
    }
    const markdown = readFileSync(profilePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(markdown);
    return {
      id,
      frontmatter,
      body,
      sections: extractSections(body)
    } satisfies InstalledAgentProfile;
  });

  return {
    rootDir,
    registry,
    profiles
  } satisfies InstalledAgentProfileSet;
}
