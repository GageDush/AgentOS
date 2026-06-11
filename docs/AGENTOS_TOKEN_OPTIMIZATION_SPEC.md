# AgentOS Token Optimization + Conditional Agent Pipeline

**Purpose:** Implement a subscription-aware, token-efficient AgentOS control layer that routes user tasks through the minimum necessary agents, model lanes, context, and verification gates.

**Primary outcome:** AgentOS should stop treating every request as a full multi-agent workflow. It should classify the task, minimize context, pick the cheapest adequate model/subscription lane, delegate only when useful, verify objectively, and return a compact final result.

**Token rule:** Do not broadcast the full user prompt, repo history, or conversation transcript to every agent. Convert requests into structured task envelopes and pass each agent only the fields it needs.

---

## 0. Compact Runtime Summary

This section is the only part most agents should need during normal operation.

```text
User Prompt
  -> Admin Agent
  -> Task Classifier + Context Minimizer
  -> Quota Steward
  -> Planner / Partition Agent, only if task is complex
  -> Specialist Agents, only as needed
  -> Systems Synthesizer
  -> QA Agent, if code changed
  -> Code Reviewer, if meaningful diff exists
  -> Security Auditor, only if risk triggers match
  -> Release Manager / Final QA
  -> Admin Agent
  -> Commit only with policy approval
```

Default policy:

```text
1. Local/deterministic work first.
2. Local Ollama for cheap classification, summaries, and repo mapping.
3. Subscription tools such as Codex/ChatGPT for high-value coding or reasoning sessions.
4. Metered API calls only as controlled fallback.
5. Do not call every agent. Route conditionally.
6. Do not send full context. Send task envelopes and compact reports.
7. Commit only after required gates pass.
```

---

## 1. Non-goals

Do **not** implement the visual office / Phaser dashboard in this phase.

Do **not** implement a huge autonomous swarm that runs every agent on every prompt.

Do **not** make paid API usage the default path.

Do **not** let reviewer/security agents freely modify code. They should be read-only unless explicitly promoted by the Admin Agent.

---

## 2. Target File Structure

Adapt paths to the existing repo, but prefer this structure if no convention exists.

```text
.agentos/
  config/
    model-lanes.json
    routing-policy.json
    risk-triggers.json
    agent-registry.json
  memory/
    repo-map.md
    decision-log.md
    task-history.jsonl
    model-performance.jsonl
  schemas/
    task-envelope.schema.json
    agent-report.schema.json
    routing-decision.schema.json
  prompts/
    admin-agent.md
    task-classifier.md
    quota-steward.md
    planner.md
    systems-synthesizer.md
    qa-agent.md
    code-reviewer.md
    security-auditor.md
    release-manager.md
  queues/
    premium-queue.json
    deferred-tasks.json
  reports/
    .gitkeep

src/agentos/
  pipeline/
    runTask.ts
    classifyTask.ts
    minimizeContext.ts
    routeByQuota.ts
    planPartitions.ts
    runSpecialists.ts
    synthesizeReports.ts
    runVerificationGates.ts
    finalizeTask.ts
  routing/
    modelRouter.ts
    quotaSteward.ts
    taskRisk.ts
    contextBudget.ts
  memory/
    repoMemory.ts
    taskHistory.ts
    decisionLog.ts
  providers/
    llmProvider.ts
    litellmProvider.ts
    ollamaProvider.ts
    codexHandoff.ts
  types/
    agentos.ts
```

If this is a docs-only repo, create the `.agentos/` files and a `docs/agentos/token-optimization.mdx` summary instead of TypeScript runtime files.

---

## 3. Core Concepts

### 3.1 Admin Agent

The Admin Agent is the control plane. It receives user requests and owns final user-facing output.

Responsibilities:

- Create the initial task envelope.
- Decide whether the request is answer-only, research, repo-analysis, code-change, review, security-sensitive, release, or maintenance.
- Send the task to the classifier/context minimizer.
- Enforce commit policy.
- Return a concise final result.

The Admin Agent should **not** perform heavy implementation, full repo scanning, or final self-review.

### 3.2 Task Classifier + Context Minimizer

This is the first token-saving layer.

Responsibilities:

- Convert raw user input into structured task metadata.
- Determine task type, complexity, risk level, and required context.
- Retrieve only relevant repo/docs/memory.
- Build a compact task envelope.

Use deterministic commands, cached memory, grep/search, and local models before using any premium model.

### 3.3 Quota Steward

This replaces a pure “Finance Agent.” The system should think in subscription capacity, reset windows, and model lanes, not only per-prompt dollars.

Responsibilities:

- Choose one of these lanes:
  - `deterministic`
  - `local_ollama`
  - `cheap_cloud`
  - `subscription_codex`
  - `subscription_chatgpt`
  - `premium_api`
  - `defer_until_reset`
- Enforce budget and quota policy.
- Prevent premium usage for vague/unscoped prompts.
- Require context compression before premium escalation.
- Detect retry loops and stop runaway agents.

### 3.4 Planner / Partition Agent

Only run this when the task is complex enough to justify planning.

Responsibilities:

- Break complex work into subtasks.
- Select required specialist agents.
- Define acceptance criteria and verification gates.
- Produce a minimal execution plan.

Do not partition tiny tasks.

### 3.5 Specialist Agents

Specialists are called only when relevant.

Core specialists:

| Agent | Use when |
|---|---|
| `repo-cartographer` | Repo structure, architecture, unknown codebase |
| `issue-intake-researcher` | Bug reports, vague tickets, unclear requirements |
| `code-implementer` | Actual code changes |
| `frontend-ui-agent` | Frontend changes |
| `backend-service-agent` | API/backend/data changes |
| `qa-agent` | Typecheck, tests, build, deterministic verification |
| `code-reviewer` | Meaningful code diff exists |
| `security-auditor` | Risk triggers match |
| `release-manager` | Commit/package/deploy/final gate |

### 3.6 Systems Synthesizer

The Systems Synthesizer compiles structured agent reports into one usable result.

It should not re-read the entire repo or redo specialist work.

### 3.7 Verification Gates

Verification is objective whenever possible.

Run shell/test/build commands before using LLM reasoning. Use the LLM to interpret failures only when needed.

---

## 4. Data Contracts

### 4.1 TaskEnvelope

Implement this shape in TypeScript, JSON Schema, or the repo’s native language.

```ts
export type TaskType =
  | 'answer_only'
  | 'research'
  | 'repo_analysis'
  | 'code_change'
  | 'review'
  | 'security_review'
  | 'release'
  | 'maintenance';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type ModelLane =
  | 'deterministic'
  | 'local_ollama'
  | 'cheap_cloud'
  | 'subscription_codex'
  | 'subscription_chatgpt'
  | 'premium_api'
  | 'defer_until_reset';

export interface TaskEnvelope {
  taskId: string;
  createdAt: string;
  userGoal: string;
  normalizedGoal: string;
  taskType: TaskType;
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex';
  riskLevel: RiskLevel;
  requiresRepoContext: boolean;
  requiresCodeChange: boolean;
  requiresPlanning: boolean;
  requiresQa: boolean;
  requiresCodeReview: boolean;
  requiresSecurityReview: boolean;
  requiresReleaseGate: boolean;
  preferredLane?: ModelLane;
  selectedLane?: ModelLane;
  filesInScope: string[];
  outOfScope: string[];
  relevantMemoryKeys: string[];
  contextBudgetTokens: number;
  acceptanceCriteria: string[];
  requiredGates: VerificationGate[];
  subtasks: Subtask[];
  notes: string[];
}

export interface VerificationGate {
  name: string;
  command?: string;
  required: boolean;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  reason?: string;
}

export interface Subtask {
  id: string;
  title: string;
  assignedAgent: string;
  modelLane: ModelLane;
  inputKeys: string[];
  acceptanceCriteria: string[];
  status: 'pending' | 'running' | 'complete' | 'blocked' | 'failed';
}
```

### 4.2 RoutingDecision

```ts
export interface RoutingDecision {
  taskId: string;
  selectedLane: ModelLane;
  selectedModelAlias?: string;
  reason: string;
  maxSteps: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxRetries: number;
  allowParallelAgents: boolean;
  requiresHumanApproval: boolean;
  fallbackLane?: ModelLane;
  deferUntil?: string;
  quotaImpact: {
    subscriptionBucket?: string;
    estimatedRelativeCost: 'none' | 'low' | 'medium' | 'high';
    apiSpendCapUsd?: number;
  };
}
```

### 4.3 AgentReport

Every specialist must return a compact report, not a transcript.

```ts
export interface AgentReport {
  taskId: string;
  subtaskId?: string;
  agent: string;
  status: 'complete' | 'blocked' | 'failed' | 'skipped';
  summary: string;
  changedFiles: string[];
  readFiles: string[];
  commandsRun: string[];
  testsRun: string[];
  findings: Finding[];
  risks: string[];
  blockers: string[];
  nextActions: string[];
  handoff: string;
}

export interface Finding {
  severity: 'blocker' | 'major' | 'minor' | 'nit' | 'info';
  area?: string;
  message: string;
  suggestedFix?: string;
}
```

---

## 5. Routing Algorithm

Implement the pipeline as a conditional graph.

### 5.1 High-level algorithm

```ts
export async function runAgentOSTask(rawPrompt: string): Promise<FinalResult> {
  const adminTask = createInitialTaskEnvelope(rawPrompt);

  const classifiedTask = await classifyTask(adminTask);

  const minimizedTask = await minimizeContext(classifiedTask);

  const route = await routeByQuota(minimizedTask);
  minimizedTask.selectedLane = route.selectedLane;

  const plan = minimizedTask.requiresPlanning
    ? await planPartitions(minimizedTask, route)
    : createSingleStepPlan(minimizedTask, route);

  const specialistReports = await runSpecialists(plan, route);

  const synthesis = await synthesizeReports(minimizedTask, specialistReports);

  const verificationReports = await runVerificationGates(
    minimizedTask,
    synthesis,
    specialistReports
  );

  const finalResult = await finalizeTask(
    minimizedTask,
    route,
    specialistReports,
    verificationReports
  );

  await recordTaskHistory(finalResult);

  return finalResult;
}
```

### 5.2 Conditional routing rules

```ts
function shouldRunPlanner(task: TaskEnvelope): boolean {
  return task.complexity === 'complex'
    || task.subtasks.length > 1
    || task.requiresCodeChange
    || task.riskLevel === 'high'
    || task.riskLevel === 'critical';
}

function shouldRunQa(task: TaskEnvelope): boolean {
  return task.requiresCodeChange || task.requiredGates.some(g => g.required);
}

function shouldRunCodeReview(task: TaskEnvelope): boolean {
  return task.requiresCodeChange && task.filesInScope.length > 0;
}

function shouldRunSecurityReview(task: TaskEnvelope): boolean {
  return task.requiresSecurityReview || matchesRiskTriggers(task);
}

function shouldRunReleaseGate(task: TaskEnvelope): boolean {
  return task.requiresReleaseGate || task.requiresCodeChange;
}
```

---

## 6. Model Lane Policy

### 6.1 Lane definitions

Create `.agentos/config/model-lanes.json`.

```json
{
  "lanes": {
    "deterministic": {
      "description": "No LLM. Use shell commands, search, static analysis, cached memory, schemas, and tests.",
      "defaultFor": ["file_listing", "grep", "json_parse", "test_execution", "diff_stats"]
    },
    "local_ollama": {
      "description": "Local model for cheap classification, summarization, repo mapping, and first-pass planning.",
      "defaultFor": ["classification", "summary", "repo_map", "simple_docs", "task_cleanup"]
    },
    "cheap_cloud": {
      "description": "Low-cost hosted model for moderate planning, docs, simple code explanation, and fallback when local fails.",
      "defaultFor": ["moderate_planning", "small_refactor_plan", "test_generation"]
    },
    "subscription_codex": {
      "description": "Preferred high-value lane for focused code implementation sessions using subscription capacity.",
      "defaultFor": ["multi_file_code_change", "debugging", "codex_handoff", "test_fix_loop"]
    },
    "subscription_chatgpt": {
      "description": "Preferred lane for high-reasoning planning, architecture, review, and synthesis when subscription capacity is available.",
      "defaultFor": ["architecture", "hard_reasoning", "final_review"]
    },
    "premium_api": {
      "description": "Metered API fallback. Use only when subscription/local/cheap lanes are unavailable or insufficient.",
      "requiresApprovalByDefault": true
    },
    "defer_until_reset": {
      "description": "Queue task for subscription reset instead of spending paid API budget."
    }
  }
}
```

### 6.2 Quota policy

Create `.agentos/config/routing-policy.json`.

```json
{
  "defaultLane": "local_ollama",
  "apiIsFallbackOnly": true,
  "premiumRequiresCompressedContext": true,
  "premiumRequiresClearAcceptanceCriteria": true,
  "maxRetriesPerTask": 2,
  "maxAgentStepsDefault": 6,
  "maxParallelPremiumAgents": 1,
  "commitMode": "assisted",
  "subscriptionFirst": true,
  "deferNonUrgentWhenPremiumUnavailable": true,
  "hardStops": {
    "stopOnRepeatedFailure": true,
    "stopOnMissingVerificationPath": true,
    "stopOnContextOverflow": true,
    "stopOnUnapprovedPremiumApi": true
  }
}
```

---

## 7. Risk Triggers

Create `.agentos/config/risk-triggers.json`.

Security review is required when a task touches any of these areas:

```json
{
  "securityReviewRequiredFor": [
    "auth",
    "authorization",
    "permissions",
    "api key",
    "secret",
    "token",
    "password",
    "credential",
    "payment",
    "billing",
    "database query",
    "user data",
    "personal data",
    "file system",
    "shell execution",
    "network request",
    "webhook",
    "mcp",
    "sandbox",
    "oauth",
    "jwt",
    "cors",
    "csrf",
    "xss",
    "sql",
    "injection",
    "deserialization"
  ],
  "releaseGateRequiredFor": [
    "deployment",
    "release",
    "package",
    "version",
    "migration",
    "production"
  ]
}
```

---

## 8. Prompt Files

Create compact role prompts under `.agentos/prompts/`. These should be short to avoid token waste.

### 8.1 `admin-agent.md`

```md
# Admin Agent

You are the AgentOS control plane. Create a task envelope, route it through the minimum necessary pipeline, and return the final user-facing result.

Rules:
- Do not solve everything yourself.
- Do not broadcast full context to all agents.
- Prefer deterministic/local work first.
- Require approval before committing unless policy says autopilot.
- Final output must include result, changed files, verification status, risks, and next action.
```

### 8.2 `task-classifier.md`

```md
# Task Classifier + Context Minimizer

Convert raw user input into a compact task envelope.

Output only structured metadata:
- task type
- complexity
- risk level
- required context
- required gates
- files likely in scope
- acceptance criteria

Do not perform implementation. Do not request premium models.
```

### 8.3 `quota-steward.md`

```md
# Quota Steward

Choose the cheapest adequate lane for the task.

Priority:
1. deterministic tools
2. local Ollama
3. cheap cloud
4. subscription Codex/ChatGPT
5. premium API only if approved
6. defer until reset when appropriate

Never use premium models for vague or unscoped work. Require compressed context and acceptance criteria before escalation.
```

### 8.4 `planner.md`

```md
# Planner / Partition Agent

Break only complex tasks into minimal subtasks.

For each subtask define:
- assigned agent
- required input keys
- model lane
- acceptance criteria
- verification gate

Do not summon unnecessary agents.
```

### 8.5 `systems-synthesizer.md`

```md
# Systems Synthesizer

Compile compact agent reports into one usable output.

Do not redo specialist work. Do not re-read the whole repo. Summarize:
- what changed
- what passed
- what failed
- risks
- next actions
```

### 8.6 `qa-agent.md`

```md
# QA Agent

Use objective commands first: typecheck, tests, lint, build, smoke checks.

Only use LLM reasoning to interpret failures when command output is unclear.

Return compact AgentReport with commands run, pass/fail status, and blockers.
```

### 8.7 `code-reviewer.md`

```md
# Code Reviewer

Read-only reviewer. Review meaningful diffs for correctness, regressions, missing tests, migration hazards, and merge readiness.

Use severity: blocker, major, minor, nit, info.

Return verdict: BLOCK, REQUEST_CHANGES, APPROVE_WITH_NOTES, APPROVE.
```

### 8.8 `security-auditor.md`

```md
# Security Auditor

Read-only security review. Run only when risk triggers match or Admin requests it.

Check secrets, auth, authorization, injection, unsafe shell/network/filesystem access, MCP/tool permission risk, user data handling, and logging leaks.

Separate confirmed issues from potential risks.
```

### 8.9 `release-manager.md`

```md
# Release Manager / Final QA

Final gate before commit, package, or release.

Confirm:
- required tests passed
- code review passed
- security review passed if required
- diff is in scope
- commit mode allows commit

Generate commit message. Commit only with policy approval.
```

---

## 9. Context Minimization Rules

Implement these as hard rules.

```text
1. Never send entire repo context by default.
2. Never send full conversation history by default.
3. Send task envelope + relevant files + relevant memory only.
4. Compress before premium escalation.
5. Use cached repo maps instead of rescanning repeatedly.
6. Pass agent reports between agents, not transcripts.
7. Prefer file paths, command output snippets, and acceptance criteria over narrative context.
```

Context budgets:

```json
{
  "trivial": 1000,
  "simple": 3000,
  "moderate": 8000,
  "complex": 16000,
  "premiumMaximumWithoutApproval": 24000
}
```

---

## 10. Commit Policy

Support three modes:

```ts
export type CommitMode = 'manual' | 'assisted' | 'autopilot';
```

Rules:

```text
manual:
  AgentOS prepares summary and commit message. User commits.

assisted:
  AgentOS asks for approval before commit.

autopilot:
  AgentOS may commit only if all required gates pass and diff is within scope.
```

Default: `assisted`.

The Admin Agent should not directly commit. The Release Manager performs commit after policy approval.

---

## 11. Final Result Contract

Return this shape to the Admin Agent.

```ts
export interface FinalResult {
  taskId: string;
  status: 'complete' | 'blocked' | 'failed' | 'deferred';
  summary: string;
  selectedLane: ModelLane;
  quotaNote: string;
  changedFiles: string[];
  verification: {
    passed: string[];
    failed: string[];
    skipped: string[];
  };
  reviewVerdict?: string;
  securityVerdict?: string;
  commit: {
    mode: 'manual' | 'assisted' | 'autopilot';
    committed: boolean;
    commitHash?: string;
    commitMessage?: string;
    approvalRequired: boolean;
  };
  risks: string[];
  nextActions: string[];
}
```

---

## 12. Acceptance Criteria

Implementation is complete when:

- A task can be converted into a `TaskEnvelope`.
- Task classification sets task type, complexity, risk, and required gates.
- Quota Steward returns a `RoutingDecision`.
- Planner runs only when needed.
- Specialist agents are selected conditionally.
- QA runs for code changes.
- Security review runs only when risk triggers match or is explicitly requested.
- Code review runs for meaningful diffs.
- Release Manager blocks commit if required gates fail.
- The system records task history.
- The final result includes selected lane, quota note, verification, risks, and commit status.
- There is no default behavior that sends the same full prompt/context to every agent.

---

## 13. Suggested Tests

Create unit tests or script checks for these cases.

### Case 1: simple answer-only prompt

Input:

```text
Explain what AGENTS.md is for.
```

Expected:

```text
- taskType = answer_only
- selectedLane = local_ollama or cheap_cloud
- requiresPlanning = false
- requiresQa = false
- requiresSecurityReview = false
- no specialist swarm
```

### Case 2: simple docs edit

Input:

```text
Add a short note to the README explaining the model router.
```

Expected:

```text
- taskType = code_change or maintenance
- risk = low
- QA optional or lightweight
- code review optional/lightweight
- security review false
```

### Case 3: API key storage change

Input:

```text
Add provider API key storage for OpenAI and Gemini.
```

Expected:

```text
- taskType = code_change
- risk >= high
- security review required
- QA required
- code review required
- premium/subscription lane allowed only with compressed context
```

### Case 4: broad vague request

Input:

```text
Make the app better.
```

Expected:

```text
- classify as vague/needs clarification or planning only
- do not use premium API
- do not run implementation agents
- produce scoped options
```

### Case 5: complex implementation

Input:

```text
Implement LiteLLM + Ollama routing with subscription-aware fallback and QA gates.
```

Expected:

```text
- planning required
- likely specialists: repo-cartographer, backend-service-agent, qa-agent, code-reviewer, security-auditor
- route = local prework then subscription_codex or cheap_cloud depending policy
- final release gate required
```

---

## 14. Codex Implementation Prompt

Use this prompt when handing the repo to Codex:

```text
Implement the AgentOS Token Optimization + Conditional Agent Pipeline described in AGENTOS_TOKEN_OPTIMIZATION_SPEC.md.

Priorities:
1. Add the .agentos config, schema, prompt, queue, memory, and report files.
2. Implement the core task envelope, routing decision, and agent report types.
3. Implement a conditional pipeline that does not run every agent by default.
4. Implement task classification, context minimization, quota routing, planning, specialist selection, verification gates, and finalization.
5. Add tests for simple answer-only, docs edit, API-key risk, vague request, and complex implementation routing.
6. Default commit mode must be assisted.
7. Security and code-review agents must be read-only by default.
8. Metered API use must be fallback-only by default.
9. Do not implement the visual office dashboard.

Acceptance criteria:
- The system can classify a raw prompt into a TaskEnvelope.
- The Quota Steward can select deterministic/local/cheap/subscription/premium/defer lanes.
- The Planner is conditional, not mandatory.
- Specialist agents receive scoped task envelopes, not full prompt transcripts.
- QA, code review, security, and release gates run only when required.
- FinalResult reports selected lane, quota note, verification status, risks, and commit status.
```

---

## 15. Implementation Guidance

Build this incrementally.

Recommended order:

```text
1. Types and schemas
2. Static config files
3. Task classifier
4. Context minimizer using existing repo search/memory
5. Quota Steward lane decision
6. Planner conditional logic
7. Specialist selection stub
8. QA/security/review gate stubs
9. FinalResult synthesis
10. Tests
11. Optional LiteLLM/Ollama provider integration
12. Optional Codex handoff generator
```

The first working version may stub actual LLM calls and use deterministic routing. Do not block the architecture on live provider integration.

