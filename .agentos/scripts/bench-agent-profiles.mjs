import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const agentosRoot = path.join(repoRoot, ".agentos");
const registryPath = path.join(agentosRoot, "agent-registry.json");
const agentsRoot = path.join(agentosRoot, "agents");

const REQUIRED_SECTIONS = [
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

const FULL_TOKEN_RULE_MARKERS = [
  "Do not request or load full conversation history",
  "TaskEnvelope",
  "compact `AgentReport`",
  "Quota Steward",
  "Never expose private chain-of-thought"
];

const FAILURE_TEMPLATE_MARKERS = ["blockers", "neededFromHuman", "safeNextActions"];

const DEFAULT_TIER_POLICY = {
  "min-maxed": { lineCeiling: 130, scoreFloor: 78 },
  competitive: { lineCeiling: 140, scoreFloor: 76 },
  "control-plane": { lineCeiling: 165, scoreFloor: 78 }
};

function readRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function readRegistryAgents(registry) {
  return [...(registry.coreAgents ?? []), ...(registry.addonAgents ?? [])];
}

function tierPolicy(registry) {
  return { ...DEFAULT_TIER_POLICY, ...(registry.profileTierPolicy ?? {}) };
}

function normalizeMarkdown(markdown) {
  return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function sectionBody(markdown, title) {
  const normalized = normalizeMarkdown(markdown);
  const header = normalized.match(new RegExp(`^# ${title}$`, "m"));
  if (!header || header.index === undefined) return "";

  const bodyStart = normalized.indexOf("\n", header.index);
  if (bodyStart < 0) return "";

  const rest = normalized.slice(bodyStart + 1);
  const nextHeader = rest.search(/^# /m);
  return (nextHeader < 0 ? rest : rest.slice(0, nextHeader)).trim();
}

function countNumberedSteps(workflow) {
  return (workflow.match(/^\d+\.\s+/gm) ?? []).length;
}

function countChecklistItems(checklist) {
  return (checklist.match(/^-\s+/gm) ?? []).length;
}

function scoreStructural(markdown) {
  const normalized = normalizeMarkdown(markdown);
  let points = 0;
  for (const section of REQUIRED_SECTIONS) {
    if (new RegExp(`^# ${section}$`, "m").test(normalized)) points += 10;
  }
  const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(normalized);
  if (hasFrontmatter) points += 4;
  if (/^description:/m.test(normalized)) points += 2;
  if (/^handoff_to:/m.test(normalized)) points += 2;
  if (/^permission:/m.test(normalized)) points += 1;
  if (/^model_lane:/m.test(normalized)) points += 1;
  return Math.min(100, points);
}

function scoreRuntimeExcerpt(markdown) {
  const excerpt = sectionBody(markdown, "Runtime Excerpt");
  if (!excerpt) return { score: 0, chars: 0, present: false };

  let score = 20;
  const len = excerpt.length;
  if (len >= 180 && len <= 900) score += 25;
  else if (len > 900) score += 10;
  else score += 8;

  if (/TaskEnvelope|AgentReport|ContextPacket|MemoryUpdateEnvelope/.test(excerpt)) score += 15;
  if (/(must|never|only|return|escalate|hand off)/i.test(excerpt)) score += 10;
  if (excerpt.split(/\.\s+/).length >= 3) score += 10;
  if (/askHuman|blocked|approval/i.test(excerpt)) score += 10;

  return { score: Math.min(100, score), chars: len, present: true };
}

function scoreWorkflow(markdown, profileTier) {
  const workflow = sectionBody(markdown, "Workflow");
  const steps = countNumberedSteps(workflow);
  let score = Math.min(40, steps * 8);
  if (/deterministic|command|pnpm|git /i.test(workflow)) score += 20;
  if (/hand off|escalate|return/i.test(workflow)) score += 15;

  if (profileTier === "control-plane" && /approval|askHuman|gate/i.test(workflow)) {
    score += 10;
  }

  return Math.min(100, score);
}

function scoreOutputContract(markdown) {
  const contract = sectionBody(markdown, "Output Contract");
  if (!contract.includes("```json")) return 20;
  let score = 45;
  if (/"agent":/i.test(contract)) score += 15;
  if (/"status":/i.test(contract)) score += 15;
  if (/"nextActions":/i.test(contract)) score += 10;
  if (contract.split("\n").length >= 8) score += 15;
  return Math.min(100, score);
}

function scoreGates(markdown, profileTier) {
  const failure = sectionBody(markdown, "Failure Behavior");
  const checklist = sectionBody(markdown, "Test Deployment Checklist");
  let score = 0;

  if (FAILURE_TEMPLATE_MARKERS.every((marker) => failure.includes(marker))) score += 45;
  else if (failure.includes("blocked")) score += 20;

  const checklistItems = countChecklistItems(checklist);
  const checklistTarget = profileTier === "control-plane" ? 3 : 3;
  if (checklistItems >= checklistTarget) score += 40;
  else if (checklistItems >= 1) score += 15;

  if (/```json/.test(failure)) score += 15;
  if (profileTier === "control-plane" && /approval_required|askHuman/i.test(failure)) {
    score += 5;
  }
  return Math.min(100, score);
}

function scoreTokenRules(markdown) {
  const rules = sectionBody(markdown, "Token Rules");
  const hits = FULL_TOKEN_RULE_MARKERS.filter((marker) => rules.includes(marker)).length;
  return Math.min(100, hits * 20);
}

function profilePromptExcerpt(markdown, maxChars = 1200) {
  const runtime = sectionBody(markdown, "Runtime Excerpt");
  if (runtime) return runtime.slice(0, maxChars);

  const mission = sectionBody(markdown, "Mission");
  const workflow = sectionBody(markdown, "Workflow");
  return [mission, workflow].filter(Boolean).join("\n\n").slice(0, maxChars);
}

function resolveProfileTier(registry, agentId) {
  const tiers = registry.profileTiers ?? {};
  return tiers[agentId] ?? "min-maxed";
}

function benchProfile(agentId, registry, policyByTier) {
  const profileTier = resolveProfileTier(registry, agentId);
  const policy = policyByTier[profileTier] ?? policyByTier["min-maxed"];
  const filePath = path.join(agentsRoot, `${agentId}.md`);
  const markdown = normalizeMarkdown(fs.readFileSync(filePath, "utf8"));
  const lines = markdown.split("\n").length;

  const structural = scoreStructural(markdown);
  const runtime = scoreRuntimeExcerpt(markdown);
  const workflow = scoreWorkflow(markdown, profileTier);
  const outputContract = scoreOutputContract(markdown);
  const gates = scoreGates(markdown, profileTier);
  const tokenRules = scoreTokenRules(markdown);

  const weighted =
    structural * 0.2 +
    runtime.score * 0.25 +
    workflow * 0.15 +
    outputContract * 0.15 +
    gates * 0.15 +
    tokenRules * 0.1;

  const withinTierLines = lines <= policy.lineCeiling;
  const efficiencyBonus =
    profileTier === "min-maxed" && withinTierLines && weighted >= policy.scoreFloor
      ? 5
      : profileTier === "competitive" && lines <= 130 && weighted >= policy.scoreFloor
        ? 3
        : 0;

  const overall = Math.min(100, Math.round(weighted + efficiencyBonus));
  const meetsPolicy = overall >= policy.scoreFloor && withinTierLines;

  let tier = "needs-work";
  if (meetsPolicy) {
    tier = profileTier;
  } else if (overall >= 60) {
    tier = "below-policy";
  }

  const excerpt = profilePromptExcerpt(markdown);
  const missing = [];
  if (!runtime.present) missing.push("Runtime Excerpt");
  if (gates < 70) missing.push("gates (failure template + checklist)");
  if (tokenRules < 80) missing.push("full Token Rules boilerplate");
  if (!withinTierLines) missing.push(`line count > ${policy.lineCeiling} for ${profileTier}`);
  if (overall < policy.scoreFloor) missing.push(`score < ${policy.scoreFloor} for ${profileTier}`);

  return {
    agentId,
    profileTier,
    lines,
    lineCeiling: policy.lineCeiling,
    scoreFloor: policy.scoreFloor,
    excerptChars: excerpt.length,
    scores: {
      structural: Math.round(structural),
      runtimeExcerpt: runtime.score,
      workflow: Math.round(workflow),
      outputContract: Math.round(outputContract),
      gates: Math.round(gates),
      tokenRules: Math.round(tokenRules),
      efficiencyBonus,
      overall
    },
    meetsPolicy,
    tier,
    missing
  };
}

function main() {
  const registry = readRegistry();
  const agents = readRegistryAgents(registry);
  const policyByTier = tierPolicy(registry);
  const tiers = registry.profileTiers ?? {};

  const unassigned = agents.filter((agentId) => !tiers[agentId]);
  if (unassigned.length > 0) {
    console.error(
      JSON.stringify(
        { ok: false, error: "Agents missing profileTiers entry", agents: unassigned },
        null,
        2
      )
    );
    process.exit(1);
  }

  const results = agents
    .map((agentId) => benchProfile(agentId, registry, policyByTier))
    .sort((a, b) => b.scores.overall - a.scores.overall);

  const byTier = {
    "min-maxed": results.filter((r) => r.profileTier === "min-maxed"),
    competitive: results.filter((r) => r.profileTier === "competitive"),
    "control-plane": results.filter((r) => r.profileTier === "control-plane")
  };

  const needsWork = results.filter((r) => !r.meetsPolicy);

  const report = {
    ok: needsWork.length === 0,
    benchmark: "agent-md-v1",
    profileTierPolicy: policyByTier,
    summary: {
      averageOverall: Math.round(results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length),
      meetsPolicy: results.filter((r) => r.meetsPolicy).map((r) => r.agentId),
      belowPolicy: needsWork.map((r) => r.agentId),
      byTier: Object.fromEntries(
        Object.entries(byTier).map(([tier, entries]) => [
          tier,
          {
            assigned: entries.length,
            meetsPolicy: entries.filter((e) => e.meetsPolicy).length
          }
        ])
      )
    },
    results
  };

  console.log(JSON.stringify(report, null, 2));

  if (needsWork.length > 0) {
    process.exitCode = 1;
  }
}

main();
