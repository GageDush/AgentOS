/**
 * Benchmark AgentOS memory wiki: search, section expand, context minimizer, API.
 * Writes .agentos/state/wiki-memory-benchmark.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.FEATURE_MEMORY_WIKI = "true";

const {
  buildWikiContextForEnvelope,
  expandWikiContext,
  isMemoryWikiEnabled,
  loadWikiManifest,
  searchWikiArticles
} = await import("../packages/memory/src/wiki/index.ts");
const { buildContextPacket } = await import("../packages/orchestrator/src/context-minimizer.ts");

const repoRoot = root;
const apiPort = process.env.AGENTOS_API_PORT ?? "8787";
const apiBase = `http://127.0.0.1:${apiPort}`;

const QUERIES = [
  {
    id: "runtime-gates",
    query: "runtime mission gates qa release",
    envelope: {
      taskId: "bench-runtime",
      createdAt: new Date().toISOString(),
      userGoal: "Fix runtime gate regression",
      normalizedGoal: "Repair runtime mission gate handling",
      taskType: "bug_fix",
      complexity: "moderate",
      riskLevel: "medium",
      requiresRepoContext: true,
      requiresCodeChange: true,
      requiresPlanning: false,
      requiresQa: true,
      requiresCodeReview: true,
      requiresSecurityReview: false,
      requiresReleaseGate: false,
      filesInScope: ["packages/runtime/src/index.ts"],
      inScope: ["pnpm test"],
      outOfScope: [],
      relevantMemoryKeys: ["risk-areas", "test-commands"],
      contextBudgetTokens: 8000,
      acceptanceCriteria: [],
      requiredGates: ["qa", "code_review"],
      mode: "assisted",
      notes: []
    }
  },
  {
    id: "qa-typecheck",
    query: "typecheck test acceptance smoke",
    envelope: {
      taskId: "bench-qa",
      createdAt: new Date().toISOString(),
      userGoal: "Verify QA commands",
      normalizedGoal: "Run canonical test and typecheck stack",
      taskType: "qa",
      complexity: "simple",
      riskLevel: "low",
      requiresRepoContext: true,
      requiresCodeChange: false,
      requiresPlanning: false,
      requiresQa: true,
      requiresCodeReview: false,
      requiresSecurityReview: false,
      requiresReleaseGate: false,
      filesInScope: [],
      inScope: ["pnpm typecheck", "pnpm test"],
      outOfScope: [],
      relevantMemoryKeys: ["test-commands"],
      contextBudgetTokens: 6000,
      acceptanceCriteria: [],
      requiredGates: ["qa"],
      mode: "assisted",
      notes: []
    }
  },
  {
    id: "orchestrator-context",
    query: "context minimizer wiki manifest routing",
    envelope: {
      taskId: "bench-orch",
      createdAt: new Date().toISOString(),
      userGoal: "Improve context minimizer",
      normalizedGoal: "Scope orchestrator context packet for wiki missions",
      taskType: "code_change",
      complexity: "moderate",
      riskLevel: "low",
      requiresRepoContext: true,
      requiresCodeChange: true,
      requiresPlanning: true,
      requiresQa: true,
      requiresCodeReview: true,
      requiresSecurityReview: false,
      requiresReleaseGate: false,
      filesInScope: ["packages/orchestrator/src/context-minimizer.ts"],
      inScope: ["pnpm --filter @agentos/orchestrator test"],
      outOfScope: [],
      relevantMemoryKeys: ["repo-map"],
      contextBudgetTokens: 10000,
      acceptanceCriteria: [],
      requiredGates: ["qa", "code_review"],
      mode: "assisted",
      notes: []
    }
  }
];

function bench(label, fn) {
  const start = performance.now();
  const result = fn();
  const ms = Math.round((performance.now() - start) * 100) / 100;
  return { label, ms, result };
}

async function benchApi(path, init) {
  const start = performance.now();
  try {
    const response = await fetch(`${apiBase}${path}`, init);
    const body = await response.json();
    return {
      ok: response.ok,
      status: response.status,
      ms: Math.round((performance.now() - start) * 100) / 100,
      body
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Math.round((performance.now() - start) * 100) / 100,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function legacyMemoryChars() {
  const memoryDir = join(repoRoot, ".agentos", "memory");
  const files = [
    "repo-map.md",
    "test-commands.md",
    "dependency-graph.md",
    "code-ownership-map.md",
    "risk-areas.md"
  ];
  let chars = 0;
  let count = 0;
  for (const file of files) {
    const path = join(memoryDir, file);
    if (!existsSync(path)) continue;
    chars += readFileSync(path, "utf8").length;
    count += 1;
  }
  return { chars, count };
}

const manifest = loadWikiManifest(repoRoot);
const legacy = legacyMemoryChars();
const runs = [];

for (const scenario of QUERIES) {
  const search = bench(`search:${scenario.id}`, () =>
    searchWikiArticles(repoRoot, scenario.query, 8)
  );

  const expandSection = bench(`expand-section:${scenario.id}`, () =>
    expandWikiContext(repoRoot, scenario.query, {
      maxChars: 8000,
      maxSections: 8,
      sectionLevel: true,
      signals: {
        repoPaths: scenario.envelope.filesInScope,
        taskType: scenario.envelope.taskType
      }
    })
  );

  const expandFull = bench(`expand-full:${scenario.id}`, () =>
    expandWikiContext(repoRoot, scenario.query, {
      maxChars: 8000,
      maxArticles: 8,
      sectionLevel: false
    })
  );

  const bridge = bench(`context-bridge:${scenario.id}`, () =>
    buildWikiContextForEnvelope(repoRoot, scenario.envelope, {
      command: scenario.envelope.inScope[0],
      repoPaths: scenario.envelope.filesInScope
    })
  );

  const packet = bench(`context-packet:${scenario.id}`, () =>
    buildContextPacket(scenario.envelope, {
      repoRoot,
      command: scenario.envelope.inScope[0]
    })
  );

  const sectionResult = expandSection.result;
  const fullResult = expandFull.result;
  const packetResult = packet.result;

  runs.push({
    id: scenario.id,
    query: scenario.query,
    timingsMs: {
      search: search.ms,
      expandSection: expandSection.ms,
      expandFull: expandFull.ms,
      contextBridge: bridge.ms,
      contextPacket: packet.ms
    },
    searchHits: search.result.length,
    sectionExpand: {
      slugs: sectionResult.slugs,
      sectionCount: sectionResult.sectionCount,
      chars: sectionResult.chars,
      topSections: sectionResult.sections.slice(0, 4).map((row) => ({
        slug: row.slug,
        heading: row.heading,
        score: row.score
      }))
    },
    fullExpand: {
      slugs: fullResult.slugs,
      chars: fullResult.chars,
      articleCount: fullResult.articles.length
    },
    savingsVsFull: {
      charReduction: fullResult.chars - sectionResult.chars,
      charReductionPct:
        fullResult.chars > 0
          ? Math.round(((fullResult.chars - sectionResult.chars) / fullResult.chars) * 1000) / 10
          : 0
    },
    contextPacket: {
      wikiSlugs: packetResult.wikiSlugs,
      wikiSectionCount: packetResult.wikiSectionCount,
      wikiChars: packetResult.wikiChars,
      memoryIncluded: packetResult.memoryIncluded.length,
      notes: packetResult.notes
    }
  });
}

const api = {
  health: await benchApi("/health"),
  manifest: await benchApi("/memory/wiki/manifest"),
  search: await benchApi("/memory/wiki/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "runtime gates typecheck", limit: 8 })
  }),
  expand: await benchApi("/memory/wiki/expand", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: "runtime mission gates",
      maxChars: 8000,
      repoPaths: ["packages/runtime/src/index.ts"],
      taskType: "bug_fix"
    })
  })
};

const report = {
  generatedAt: new Date().toISOString(),
  repoRoot,
  featureMemoryWiki: isMemoryWikiEnabled(),
  manifest: {
    loaded: Boolean(manifest),
    articleCount: manifest?.articles.length ?? 0,
    sectionCount: manifest?.articles.reduce((sum, row) => sum + (row.sections?.length ?? 0), 0) ?? 0,
    generatedAt: manifest?.generatedAt
  },
  legacyFlatMemory: legacy,
  runs,
  api,
  summary: {
    avgSectionExpandMs: Math.round((runs.reduce((s, r) => s + r.timingsMs.expandSection, 0) / runs.length) * 100) / 100,
    avgContextPacketMs: Math.round((runs.reduce((s, r) => s + r.timingsMs.contextPacket, 0) / runs.length) * 100) / 100,
    avgCharSavingsPct: Math.round((runs.reduce((s, r) => s + r.savingsVsFull.charReductionPct, 0) / runs.length) * 10) / 10,
    apiLive: api.health.ok
  }
};

const outDir = join(repoRoot, ".agentos", "state");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "wiki-memory-benchmark.json");
writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

console.log(JSON.stringify({ ok: true, reportPath: outPath, summary: report.summary }, null, 2));
