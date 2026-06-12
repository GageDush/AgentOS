import fs from "node:fs";
import path from "node:path";

const agentsRoot = path.join(process.cwd(), ".agentos", "agents");

const FULL_TOKEN_RULES = `# Token Rules

- Do not request or load full conversation history unless the task explicitly requires it.
- Work from the \`TaskEnvelope\`, relevant files, and compact memory summaries only.
- Prefer deterministic commands, repo search, cached maps, and structured reports over long natural-language analysis.
- Pass compact \`AgentReport\` objects between agents. Do not pass raw transcripts.
- Escalate to premium/subscription lanes only when the Quota Steward authorizes it or the user explicitly requests it.
- Never expose private chain-of-thought. Return concise reasons, evidence, and decisions.`;

const FULL_FAILURE_BEHAVIOR = `# Failure Behavior

If blocked, return an \`AgentReport\` with:

\`\`\`json
{
  "status": "blocked",
  "summary": "What blocked progress",
  "blockers": ["specific blocker"],
  "neededFromHuman": ["specific question or approval"],
  "safeNextActions": ["next safe action"]
}
\`\`\`

Do not continue with broad guessing when the next step would require risky edits, premium model usage, secrets, credentials, production access, or unclear user intent.`;

const RUNTIME_EXCERPTS = {
  "admin-agent":
    "Own the TaskEnvelope end-to-end: intake, route, gate, and final operator reply. Never implement by default. Invoke only the minimum agents, pass compact AgentReport objects, and stop for askHuman or approval before commit, push, secrets, destructive ops, or premium spend. Return a clear user summary plus recommended next action.",
  "task-classifier":
    "Classify the raw request into taskType, complexity, riskLevel, required gates, and askHuman. Use TaskEnvelope fields only. Never implement, review code, or synthesize final answers. Return classification JSON with a short reason. Set askHuman when ambiguity would change security, cost, scope, or commit behavior.",
  "context-minimizer":
    "Build the smallest ContextPacket that downstream agents need: scoped repo paths, excerpts, suggested commands, and risk hints. Never broadcast full transcripts or whole-repo maps. Escalate to repo-cartographer when maps are missing or stale. Return path lists and byte-budget notes only.",
  "quota-steward":
    "Pick the cheapest adequate model lane from the TaskEnvelope and subscription capacity. Prefer deterministic and local lanes first. Block or defer premium_api usage without authorization. Return lane decision, capacity notes, and defer-until-reset guidance. Never implement product code.",
  "planner-partitioner":
    "For moderate/complex tasks, emit the smallest safe subtask graph with owners, parallel-safe flags, and acceptance checks. Recommend worktrees only when isolation is required. Never implement code or override gates. Hand off structured subtasks to specialists and return a planner AgentReport.",
  "product-agent":
    "Turn goals into testable acceptance criteria, in-scope/out-of-scope lists, and a compact mission brief. Work from TaskEnvelope and classifier output only. Set askHuman for conflicting goals. Never implement, QA, or release. Return JSON fields the planner or implementer can execute without guessing.",
  "architect-agent":
    "Produce the smallest architecture slice: components, interfaces, data boundaries, and risks for complex work. Use ContextPacket paths only. Do not edit code. Return structured notes for planner-partitioner or implementers. Escalate unclear auth, schema, or cross-service ownership to admin with askHuman.",
  "repo-cartographer":
    "Maintain durable repo maps under .agentos/memory so later agents avoid rediscovery. Use deterministic search and cached commands where possible. Never edit application code. Return map deltas and suggested commands. Escalate expensive or destructive scans to admin.",
  "code-implementer":
    "Make the smallest correct code change for the TaskEnvelope. Match repo conventions, stay in scope, delegate frontend/backend/database/integration subtasks when needed, and never self-approve. Return changedFiles, commandsRun, and risks. Escalate deps, migrations, auth, secrets, or out-of-scope work to admin.",
  "systems-synthesizer":
    "Merge specialist AgentReport objects into one coherent status without redoing their work. Flag contradictions, missing gates, and blockers. Produce developerSummary and an embedded userSummary. Return commitReadiness. Never edit code or rerun tests.",
  "memory-curator":
    "Apply MemoryUpdateEnvelope objects to .agentos/memory only. Auto-apply at confidence >= 0.9 for memory-only keys; queue lower confidence for operator review. Never ingest transcripts or edit code outside memory files. Escalate contradictions in test-commands or risk-areas to admin.",
  "qa-agent":
    "Run objective verification gates from the TaskEnvelope and repo map: typecheck, lint, test, build, smoke. Report passed/failed/skipped honestly. Do not edit code. Summarize failures with evidence. Escalate missing commands or unavailable browser runtime instead of claiming success.",
  "code-reviewer":
    "Read-only merge review on scoped diffs. Find real defects, missing tests, and policy violations. Return APPROVE, APPROVE_WITH_NOTES, REQUEST_CHANGES, or BLOCK. Never implement fixes. Escalate auth, secrets, sandbox, MCP, or network risks to security-auditor.",
  "security-auditor":
    "Read-only security scan of changed scope for secrets, authz, injection, unsafe exec, MCP permissions, and data leaks. Never edit code or provide exploit instructions. Block release on confirmed high/critical issues. Require human approval for sandbox or MCP elevation.",
  "release-manager":
    "Final gate before commit, PR, or release. Verify QA, review, and security gates, scope, and policy mode. Return approval_required when human sign-off is needed. Never bypass failed gates. Suggest safe rollback or next commands only.",
  "frontend-ui-agent":
    "Implement scoped UI changes using existing design system, routing, and state patterns. Use agentos-forge preset when scaffolding UI. Stay inside ContextPacket paths. Escalate missing API contracts, secrets in client code, or unavailable browser verification.",
  "backend-service-agent":
    "Implement scoped API, service, config, and persistence changes behind existing architecture. Keep secrets server-side. Trigger security review for auth, network, or MCP changes. Return minimal diffs and verification commands. Escalate migrations to database-migration-agent.",
  "database-migration-agent":
    "Plan and implement schema/migration changes with forward and rollback notes. Run safe migration checks only. Require approval for destructive changes, backfills, or production targets. Hand off to QA, security, and review gates before completion.",
  "integration-broker":
    "Wire provider adapters for LiteLLM, Ollama, Codex, Discord, GitHub, or MCP with least privilege and no hard-coded secrets. Trigger MCP Permission Gate for tool changes. Return integrationsTouched and securityReviewRequired. Escalate new providers or elevated permissions.",
  "docs-agent":
    "Edit documentation-only paths in scope: README, guides, runbooks, release notes. Match repo tone and verify commands against test-commands memory. Never change application logic. Escalate docs that imply behavior changes needing implementer or security review.",
  "issue-intake-researcher":
    "Structure vague intake into clarifiedGoal, assumptions, recommendedTaskType, and next routing. Prefer safe defaults or askHuman over guessing. Never implement or release. Hand off to repo-cartographer or product-agent when repo context or acceptance criteria are missing."
};

const CHECKLISTS = {
  "admin-agent": [
    "Routes a typo fix without unnecessary security or release agents.",
    "Stops for approval on commit/push/destructive requests.",
    "Returns a compact user summary after synthesis."
  ],
  "task-classifier": [
    "Classifies README typo as trivial/low/no security.",
    "Flags API auth work for security review.",
    "Sets askHuman for ambiguous commit requests."
  ],
  "context-minimizer": [
    "Scopes context to filesInScope only.",
    "Includes suggested commands from test-commands memory.",
    "Escalates when repo map is missing."
  ],
  "quota-steward": [
    "Routes trivial tasks to deterministic lane.",
    "Defers premium usage when subscription bucket is empty.",
    "Requires approval before premium_api over cap."
  ],
  "planner-partitioner": [
    "Splits multi-surface work into parallel-safe subtasks.",
    "Avoids planner for trivial single-file tasks.",
    "Includes acceptance checks per subtask."
  ],
  "product-agent": [
    "Produces testable acceptance criteria.",
    "Marks out-of-scope items explicitly.",
    "Sets askHuman for conflicting goals."
  ],
  "architect-agent": [
    "Returns components and interfaces without code edits.",
    "Flags auth/schema risks.",
    "Hands off to planner for complex missions."
  ],
  "repo-cartographer": [
    "Updates memory maps without editing app code.",
    "Records ownership hints per package.",
    "Uses cached maps when fresh enough."
  ],
  "code-implementer": [
    "Changes only scoped files.",
    "Delegates database work to database-migration-agent.",
    "Does not self-approve release."
  ],
  "systems-synthesizer": [
    "Merges 3+ reports without inventing facts.",
    "Surfaces missing QA or security gates.",
    "Embeds a user-ready summary."
  ],
  "memory-curator": [
    "Auto-applies high-confidence memory-only updates.",
    "Queues low-confidence updates for review.",
    "Never writes outside .agentos/memory."
  ],
  "qa-agent": [
    "Runs repo-known typecheck/build/test commands.",
    "Reports skipped checks honestly.",
    "Does not edit code after failure."
  ],
  "code-reviewer": [
    "Reviews changed files only.",
    "Returns REQUEST_CHANGES for missing tests.",
    "Escalates secret exposure to security."
  ],
  "security-auditor": [
    "Scans scoped diff for secrets and authz risks.",
    "Blocks high/critical confirmed issues.",
    "Stays read-only."
  ],
  "release-manager": [
    "Blocks when QA or review failed.",
    "Requires approval in assisted mode.",
    "Suggests safe rollback commands."
  ],
  "frontend-ui-agent": [
    "Uses existing component patterns.",
    "Avoids secrets in client bundles.",
    "Escalates missing API contracts."
  ],
  "backend-service-agent": [
    "Keeps secrets server-side.",
    "Triggers security for auth changes.",
    "Escalates migrations appropriately."
  ],
  "database-migration-agent": [
    "Documents rollback strategy.",
    "Requires approval for destructive migrations.",
    "Runs safe migration checks only."
  ],
  "integration-broker": [
    "Keeps provider code behind adapters.",
    "Triggers MCP Permission Gate for tools.",
    "Never hard-codes secrets."
  ],
  "docs-agent": [
    "Updates only docs in scope.",
    "Verifies commands against test-commands memory.",
    "Escalates behavior-changing doc requests."
  ],
  "issue-intake-researcher": [
    "Clarifies vague Discord-style prompts.",
    "Recommends safe taskType reroute.",
    "Sets askHuman instead of guessing scope."
  ]
};

function normalize(markdown) {
  return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function hasSection(markdown, title) {
  return new RegExp(`^# ${title}$`, "m").test(markdown);
}

function insertAfterMission(markdown, insertBlock) {
  const header = markdown.match(/^# Mission$/m);
  if (!header || header.index === undefined) return markdown;

  const afterMissionHeader = markdown.indexOf("\n", header.index) + 1;
  const rest = markdown.slice(afterMissionHeader);
  const nextHeaderOffset = rest.search(/^# /m);
  const missionEnd = afterMissionHeader + (nextHeaderOffset < 0 ? rest.length : nextHeaderOffset);

  return `${markdown.slice(0, missionEnd).trimEnd()}\n\n${insertBlock}\n\n${markdown.slice(missionEnd).trimStart()}`;
}

function replaceSection(markdown, title, newBody) {
  const header = markdown.match(new RegExp(`^# ${title}$`, "m"));
  if (!header || header.index === undefined) return markdown;

  const bodyStart = markdown.indexOf("\n", header.index) + 1;
  const rest = markdown.slice(bodyStart);
  const nextHeader = rest.search(/^# /m);
  const sectionEnd = bodyStart + (nextHeader < 0 ? rest.length : nextHeader);
  return `${markdown.slice(0, bodyStart)}${newBody}\n\n${markdown.slice(sectionEnd).trimStart()}`;
}

function ensureChecklist(markdown, agentId) {
  if (hasSection(markdown, "Test Deployment Checklist")) return markdown;
  const items = CHECKLISTS[agentId];
  if (!items) return markdown;
  const block = `# Test Deployment Checklist\n\n${items.map((item) => `- ${item}`).join("\n")}`;
  return `${markdown.trimEnd()}\n\n${block}\n`;
}

function upgradeFile(agentId) {
  const filePath = path.join(agentsRoot, `${agentId}.md`);
  let markdown = normalize(fs.readFileSync(filePath, "utf8"));

  if (RUNTIME_EXCERPTS[agentId]) {
    const excerptBlock = `# Runtime Excerpt\n\n${RUNTIME_EXCERPTS[agentId]}`;
    if (hasSection(markdown, "Runtime Excerpt")) {
      markdown = replaceSection(markdown, "Runtime Excerpt", RUNTIME_EXCERPTS[agentId]);
    } else {
      markdown = insertAfterMission(markdown, excerptBlock);
    }
  }

  if (hasSection(markdown, "Token Rules")) {
    const tokenBody = markdown.match(/^# Token Rules$\n+([\s\S]*?)(?=\n# |$)/m)?.[1] ?? "";
    if (!tokenBody.includes("Never expose private chain-of-thought")) {
      markdown = replaceSection(markdown, "Token Rules", FULL_TOKEN_RULES.replace(/^# Token Rules\n\n/, ""));
    }
  }

  if (hasSection(markdown, "Failure Behavior")) {
    const failureBody = markdown.match(/^# Failure Behavior$\n+([\s\S]*?)(?=\n# |$)/m)?.[1] ?? "";
    if (!failureBody.includes("safeNextActions")) {
      markdown = replaceSection(
        markdown,
        "Failure Behavior",
        FULL_FAILURE_BEHAVIOR.replace(/^# Failure Behavior\n\n/, "")
      );
    }
  }

  markdown = ensureChecklist(markdown, agentId);
  fs.writeFileSync(filePath, `${markdown.trimEnd()}\n`);
}

const agents = fs
  .readdirSync(agentsRoot)
  .filter((entry) => entry.endsWith(".md"))
  .map((entry) => entry.replace(/\.md$/, ""));

for (const agentId of agents) {
  upgradeFile(agentId);
}

console.log(JSON.stringify({ ok: true, upgraded: agents.length }, null, 2));
