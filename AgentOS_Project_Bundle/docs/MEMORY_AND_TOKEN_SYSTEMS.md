# AgentOS Memory and Token/Credit Management Systems

## Memory management system

AgentOS needs two memory layers:

1. **Structured memory** for known fields, auditability, and filtering.
2. **Vector-ready memory** for future semantic search and RAG.

## Memory types

```text
project_memory
agent_memory
task_memory
user_preference
tool_result
document_chunk
decision_log
error_pattern
```

## Minimum database tables

```text
memories
memory_chunks
memory_links
agent_memory_index
task_memory_index
```

## Memory fields

```ts
type Memory = {
  id: string;
  type: string;
  title: string;
  content: string;
  source: string;
  projectId?: string;
  agentId?: string;
  taskId?: string;
  tags: string[];
  importance: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## Vector-ready fields

```ts
type MemoryChunk = {
  id: string;
  memoryId: string;
  chunkText: string;
  chunkIndex: number;
  embeddingProvider?: string;
  embeddingModel?: string;
  embedding?: number[];
  createdAt: string;
};
```

For MVP, keyword/mock search is acceptable. The schema should be ready for pgvector later.

## Memory API endpoints

```text
GET    /memory
POST   /memory
GET    /memory/:id
PATCH  /memory/:id
POST   /memory/search
POST   /memory/:id/archive
POST   /memory/:id/attach-agent
POST   /memory/:id/attach-task
```

## Memory UI

Clicking the Knowledge area opens:

```text
Memory Browser
Search
Add memory
Pin memory to project
Attach memory to agent
Attach memory to task
View memory source
Archive memory
```

## Memory acceptance criteria

```text
[ ] Memory can be created from dashboard.
[ ] Memory can be searched.
[ ] Memory can be attached to agents/tasks.
[ ] Agent panels show relevant memories.
[ ] Memory search works before real embeddings using keyword/mock mode.
[ ] Vector-ready schema exists for later embedding models.
```

---

# Token and credit management system

## Goal

Prevent runaway API usage and surprise bills.

The token manager should track:

```text
provider
model
prompt_tokens
completion_tokens
total_tokens
estimated_cost
task_id
agent_id
run_id
daily_budget
monthly_budget
hard_limit
warning_threshold
```

## Minimum database tables

```text
usage_events
usage_budgets
usage_alerts
model_prices
provider_accounts
```

## Usage event type

```ts
type UsageEvent = {
  id: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  agentId?: string;
  taskId?: string;
  runId?: string;
  createdAt: string;
};
```

## Budget type

```ts
type UsageBudget = {
  id: string;
  scope: "global" | "provider" | "model" | "agent" | "task";
  scopeId?: string;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  warningThresholdPercent: number;
  hardStopEnabled: boolean;
};
```

## Enforcement logic

Before every real LLM call:

```text
1. Estimate input/output token cost.
2. Check daily budget.
3. Check monthly budget.
4. Check per-agent/per-task budget.
5. If hard stop is exceeded, block the run.
6. If warning threshold is crossed, create alert.
7. Record usage after the call.
8. Show usage in dashboard and Discord.
```

## Token API endpoints

```text
GET    /usage
GET    /usage/summary
GET    /usage/budgets
POST   /usage/budgets
PATCH  /usage/budgets/:id
GET    /usage/alerts
POST   /usage/mock-event
```

## Token UI

Clicking the Finance/Token station opens:

```text
Current spend
Daily spend
Monthly spend
Remaining budget
Provider usage
Model usage
Agent usage
Task usage
Warnings
Hard stop settings
```

## Discord command

```text
/tokens
```

Should return:

```text
Today: $X.XX / $Y.YY
Month: $X.XX / $Y.YY
Top model:
Top agent:
Warnings:
Hard stop:
```

## Token acceptance criteria

```text
[ ] Mock usage is tracked.
[ ] Usage appears in dashboard.
[ ] Budget limits can be configured.
[ ] Warning appears at threshold.
[ ] Agent runs are blocked when hard limit is reached.
[ ] Discord /tokens shows current usage.
```
