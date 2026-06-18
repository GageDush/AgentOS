# AgentOS LLM Router — LiteLLM + Quota Steward (Spec)

**Status:** Draft for implementation  
**Date:** 2026-06-16  
**Audience:** Cursor / Codex implementer, Claude (architecture review)

Use **`chatbox.txt`** for paste-into-Claude chat. This file is the full reference.

---

## Summary

Build a **self-hosted OpenRouter-like control plane** for AgentOS: unified model routing, BYOK, budgets, fallbacks, and activity logs — **without** paying OpenRouter platform fees.

**Inference still costs money** when using paid providers. This spec makes routing, caps, and logging **local and free**; tokens are billed by whoever owns the API key (you).

**Phase 1 (this spec):** LiteLLM sidecar + AgentOS router layer wired to **quota-steward** and **evaluateBudget** before every cloud call.

**Phase 2 (future):** UI router dashboard, virtual keys per env, prompt cache, policy routing.

---

## Problem

| Today | Gap |
|-------|-----|
| `quota-steward` agent + `evaluateQuotaSteward()` exist | Not invoked before every LLM HTTP call |
| `evaluateBudget()` + `AGENTOS_DAILY_BUDGET_USD` exist | Only partially wired; no pre-flight on chat/task runs |
| `packages/agents/llm.ts` calls Ollama directly | Bypasses routing policy |
| `apps/api/providers.ts` = mock / ollama / cloud-stub | No real multi-provider router |
| `apps/gateway` (`:8790`) | **Tool/shell gateway only** — not LLM proxy |
| `ProviderLane` = `mock_local \| ollama_local \| defer` | No `cheap_cloud` / `premium_api` execution path |
| Agent profiles mention LiteLLM | **No LiteLLM integration in code** |

Operators want OpenRouter-style features locally:

- One OpenAI-compatible endpoint  
- Auto-routing / fallback  
- Spend caps & subscription bucket awareness  
- Activity logs  
- BYOK (keys in `.env`, never in prompts)

---

## Goals

1. **Single router entrypoint** for agent/mission LLM calls inside AgentOS.
2. **Quota steward + budget gates** run **before** forwarding to any paid lane.
3. **LiteLLM** as optional sidecar for multi-provider OpenAI-compatible routing (BYOK).
4. **Preserve local-first default:** Ollama when adequate; cloud only when policy allows.
5. **Audit every attempt:** log lane, model, provider, tokens, cost estimate, success/failure.
6. **No secrets in repo** — keys via env; LiteLLM config generated at runtime or from `.env`.

## Non-goals (Phase 1)

- Replacing OpenRouter for external products / billing customers  
- SSO/SAML enterprise admin (defer)  
- Building a full LiteLLM fork inside the monorepo  
- Automatic provider contract negotiation  
- Prompt caching (Phase 2)  
- UI redesign of home “Router” section (Phase 2 — wire to live data after Phase 1 API)

---

## Reference: OpenRouter features → AgentOS mapping

| OpenRouter Enterprise | AgentOS equivalent (Phase 1) |
|----------------------|------------------------------|
| 400+ models | LiteLLM model list + `configs/model-routes.json` aliases |
| Auto-routing / fallback | Router tries alias chain (see config) |
| Budgets & spend controls | `evaluateBudget` + `evaluateQuotaSteward` |
| Activity logs | SQLite `usage_events` + audit events |
| BYOK | `.env` keys → LiteLLM `config.yaml` (gitignored) |
| Rate limits | Local policy only (optional per-key caps Phase 2) |
| Data policy routing | Phase 2 — `allowed_providers` in route config |
| Platform 5.5% fee | **$0** (self-hosted) |

---

## Architecture

### Target topology (Phase 1)

```text
Mission / Task / Agent executor
        │
        ▼
packages/llm-router/          ← NEW (policy + fallback + logging)
  1. resolveRoute(envelope)   ← orchestrator lane + model alias
  2. evaluateQuotaSteward()     ← subscription buckets
  3. evaluateBudget()           ← USD daily/monthly
  4. executeRoute()             ← ollama direct OR LiteLLM proxy
  5. recordUsageEvent()         ← persistence
        │
        ├─► Ollama :11434/api/generate     (local_ollama lane)
        │
        └─► LiteLLM :4000/v1/chat/completions  (cheap_cloud / premium_api)
              ├─ openai/*
              ├─ anthropic/*
              ├─ openrouter/* (optional)
              └─ ...
```

### Service boundaries

| Service | Port | Role after Phase 1 |
|---------|------|-------------------|
| **API** | 8787 | Exposes `/llm/chat`, `/llm/routes`, `/quota/status`; missions call router |
| **Gateway** | 8790 | Unchanged — sandbox tools/shell only |
| **LiteLLM** | 4000 | Optional sidecar; OpenAI-compatible upstream aggregator |
| **Ollama** | 11434 | Direct for local lane (lower latency, no LiteLLM required) |

**Naming note:** Do not overload `apps/gateway` with LLM proxy in Phase 1 — keep tool gateway separate. LLM routing lives in `packages/llm-router` + API routes.

---

## Existing code to reuse (do not rewrite)

| Module | Path | Use |
|--------|------|-----|
| Quota buckets | `configs/quota-providers.json` | Subscription utilization |
| Quota evaluation | `packages/token-manager/src/quota-steward.ts` | Pre-flight block/warn |
| USD budgets | `packages/token-manager/src/index.ts` → `evaluateBudget` | Daily/monthly caps |
| Lane inference | `packages/orchestrator/src/lane-router.ts` | Task → `ProviderLane` |
| Runtime apply | `packages/runtime/src/index.ts` → `applyQuotaStewardToRoute` | Mission defer |
| Usage events | `packages/shared` → `UsageEvent`, persistence store | Logging |
| Chat providers | `apps/api/src/providers.ts` | Refactor to call `llm-router` |
| Agent LLM | `packages/agents/src/llm.ts` | Refactor to call `llm-router` |
| Env budgets | `.env.example` `AGENTOS_DAILY_BUDGET_USD`, etc. | Already documented |

---

## Configuration

### New files

#### `configs/model-routes.json`

```json
{
  "defaultLane": "local_ollama",
  "aliases": {
    "agentos-coder": {
      "lanes": ["local_ollama", "cheap_cloud"],
      "models": ["ollama/qwen2.5-coder:7b", "openai/gpt-4o-mini"],
      "maxTokens": 8192
    },
    "agentos-premium": {
      "lanes": ["cheap_cloud", "premium_api"],
      "models": ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4-20250514"],
      "requiresApproval": true
    }
  },
  "fallback": {
    "enabled": true,
    "billSuccessfulOnly": true
  }
}
```

#### `configs/litellm.config.yaml.template`

Documented template — **generated** to `.agentos/state/litellm.config.yaml` by setup script (gitignored). Keys from env:

```yaml
model_list:
  - model_name: openai/gpt-4o-mini
    litellm_params:
      model: openai/gpt-4o-mini
      api_key: os.environ/OPENAI_API_KEY
  - model_name: ollama/qwen2.5-coder:7b
    litellm_params:
      model: ollama/qwen2.5-coder:7b
      api_base: http://127.0.0.1:11434
router_settings:
  routing_strategy: simple-shuffle  # Phase 1; latency-based Phase 2
```

### New env vars (`.env.example`)

```bash
# LLM Router / LiteLLM sidecar
FEATURE_LITELLM_PROXY=false          # true when sidecar running
AGENTOS_LITELLM_BASE_URL=http://127.0.0.1:4000
AGENTOS_LLM_ROUTER_MODE=local-first  # local-first | cloud-ok | litellm-only
AGENTOS_LLM_DEFAULT_ALIAS=agentos-coder

# Existing — wire into LiteLLM template
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=                  # optional aggregator BYOK
AGENTOS_DAILY_BUDGET_USD=2
AGENTOS_MONTHLY_BUDGET_USD=20
AGENTOS_HARD_STOP_ENABLED=true
```

---

## Package: `packages/llm-router`

### Public API

```ts
export type LlmRouterRequest = {
  prompt: string;
  messages?: Array<{ role: string; content: string }>;
  alias?: string;                    // model-routes.json key
  model?: string;                    // override
  lane?: TaskEnvelopeModelLane;
  agentId?: string;
  missionId?: string;
  runId?: string;
  estimatedCostUsd?: number;
};

export type LlmRouterResult = {
  ok: boolean;
  text: string;
  provider: string;
  model: string;
  lane: string;
  attempts: Array<{ model: string; ok: boolean; error?: string; durationMs: number }>;
  usage?: { promptTokens?: number; completionTokens?: number; costUsd?: number };
  blocked?: boolean;
  blockReason?: string;
};

export async function routeLlmCall(
  repoRoot: string,
  usageEvents: UsageEvent[],
  request: LlmRouterRequest
): Promise<LlmRouterResult>;
```

### Execution algorithm

```text
1. Load configs/model-routes.json + resolve alias/lane
2. If lane is defer / deterministic → return blocked (no LLM)
3. evaluateQuotaSteward(usageEvents) → if blocked, defer
4. evaluateBudget(usageEvents, budgets, estimatedCost) → if !allowed, block
5. For each model in alias chain (local first):
   a. If ollama/* → direct fetch :11434 (existing logic)
   b. Else if FEATURE_LITELLM_PROXY → POST /v1/chat/completions to LiteLLM
   c. On success → record UsageEvent, return
   d. On failure → try next model if fallback.enabled
6. If all fail → return ok:false with attempts[] (billSuccessfulOnly: no charge for failures)
7. emit audit: llm.route.completed | llm.route.blocked
```

### Extend `ProviderLane` (shared)

Phase 1 add optional lanes (or map at router boundary):

```ts
// packages/shared — extend when router lands
export type ProviderLane =
  | "mock_local"
  | "ollama_local"
  | "cheap_cloud"      // new
  | "premium_api"      // new
  | "defer";
```

Update `inferProviderLaneSmart` to return `cheap_cloud` when `FEATURE_LITELLM_PROXY=true` and task warrants — **only after** router exists (sub-phase).

---

## API surface

### New routes (`apps/api/src/index.ts`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/llm/chat` | Operator/agent chat through router |
| `GET` | `/llm/routes` | List aliases + health (ollama up, litellm up) |
| `GET` | `/llm/activity` | Paginated usage events (last N) |

**Request `POST /llm/chat`:**

```json
{
  "prompt": "Summarize mission state",
  "alias": "agentos-coder",
  "agentId": "code-implementer",
  "missionId": "mission-123"
}
```

**Response:** `LlmRouterResult`

### Refactor existing callers

| Caller | Change |
|--------|--------|
| `apps/api/providers.ts` | Delegate `chat()` to `routeLlmCall` |
| `packages/agents/src/llm.ts` | Replace direct Ollama fetch |
| `apps/api` `POST /tasks/:id/run` | Already uses providers — gets router for free |
| Mission runtime LLM steps | Wire through same package |

---

## LiteLLM sidecar ops

### Setup script: `scripts/setup-litellm.ps1` (+ `.sh`)

1. Check Python/pip or Docker available  
2. Write `.agentos/state/litellm.config.yaml` from template + env  
3. Print start command:

```powershell
# Option A — pip
pip install 'litellm[proxy]'
litellm --config .agentos/state/litellm.config.yaml --port 4000

# Option B — docker
docker run -p 4000:4000 -v ${PWD}/.agentos/state/litellm.config.yaml:/app/config.yaml ghcr.io/berriai/litellm:main-latest --config /app/config.yaml
```

4. Set `FEATURE_LITELLM_PROXY=true` in `.env`

### `package.json` scripts

```json
"llm:litellm:setup": "powershell -File scripts/setup-litellm.ps1",
"llm:litellm:health": "curl -s http://127.0.0.1:4000/health"
```

### Stack integration

Optional: `pnpm stack:background` does **not** auto-start LiteLLM in Phase 1 (explicit opt-in). Document in spec; Phase 2 could add `-IncludeLiteLLM`.

---

## Quota steward wiring (critical)

Today `applyQuotaStewardToRoute` only runs at **mission route** time. Phase 1 also gates **each LLM HTTP call**:

```ts
// Before any cloud call
const quota = evaluateQuotaSteward(events, repoRoot);
if (quota.blocked && !isLocalModel(model)) {
  return { ok: false, blocked: true, blockReason: quota.reason };
}

// Premium providers (anthropic, openai_codex) 
const premiumGate = gatePremiumProviderRun(events, repoRoot, {
  provider: mapModelToQuotaProvider(model),
  agentId, missionId, runId
});
```

Map models → `QuotaProviderId` in `packages/llm-router/src/quota-map.ts`.

Discord `/quota` command already calls `evaluateQuotaSteward` — behavior stays consistent.

---

## Activity logs

Each router call appends `UsageEvent`:

```ts
{
  id: `usage-${Date.now()}-...`,
  provider: "openai" | "ollama" | "anthropic" | ...,
  model: "gpt-4o-mini",
  agentId,
  missionId,
  runId,
  estimatedCostUsd,
  createdAt,
  metadata: { alias, lane, attemptCount, latencyMs, blocked: false }
}
```

Expose via:

- `GET /llm/activity?limit=50`  
- Future: Forge home Router section + Settings → Usage  

---

## UI (Phase 1 minimal)

| Surface | Change |
|---------|--------|
| Settings | Show router mode, LiteLLM health, budget/quota summary (reuse `/quota/status`) |
| Home Router section | **Phase 2** — show live `ROUTED_TODAY` from `/llm/activity` |
| Missions | Display `providerLane` + model on run inspector (already partial) |

Phase 1 = API only + settings readout; no home seed replacement required.

---

## Security

1. LiteLLM config with keys lives under `.agentos/state/` — **gitignored**  
2. Never log prompt bodies in audit by default — log hash + length  
3. `FEATURE_CLOUD_PROVIDERS=false` remains kill switch  
4. Premium alias requires `requiresApproval` + existing approval gates for tool execution (separate concern)  
5. Router endpoints require session cookie (same as other API routes)

---

## Testing

### Unit (`packages/llm-router`)

| Test | Assert |
|------|--------|
| Local alias, Ollama up | Returns ollama provider, no LiteLLM call |
| Local fails, fallback to LiteLLM | Second attempt succeeds |
| Quota blocked | `blocked: true`, no HTTP to providers |
| Budget exceeded | `blocked: true`, reason mentions daily limit |
| All models fail | `ok: false`, attempts logged, no usage charge if billSuccessfulOnly |

### Integration smoke

```bash
pnpm llm:smoke          # new script
# 1. health ollama
# 2. POST /llm/chat alias=agentos-coder (mock if no keys)
# 3. GET /llm/routes
# 4. verify usage event appended
```

Add `pnpm llm:smoke` to CI optional job (mock lane only).

---

## Acceptance criteria (Phase 1 done when…)

**Status (2026-06-16, post B/C/D + gated pipeline Stage 1):**

1. [x] `packages/llm-router` exists with `routeLlmCall` + unit tests (`src/index.test.ts`).
2. [x] `configs/model-routes.json` + `configs/litellm.config.yaml.template` + `scripts/setup-litellm.(ps1|sh)` documented.
3. [x] `POST /llm/chat` works Ollama-only (no LiteLLM required) — `pnpm llm:smoke`.
4. [ ] With LiteLLM running + keys set, fallback reaches OpenAI/Anthropic via BYOK — **manual** (operator runs `pnpm llm:litellm:setup` + sets keys).
5. [x] Quota steward + budget block cloud calls when depleted — covered by router unit tests; live manual after keys.
6. [x] `providers.ts` (`ollamaProvider`) and `packages/agents/llm.ts` (`callAgentLlm`) route through `routeLlmCall` — no direct Ollama bypass (Stage 1).
7. [x] Usage events recorded for successful calls (`/llm/chat` → `addUsageEvent`).
8. [ ] `pnpm typecheck` + `pnpm test` pass — **re-run on Windows** after `pnpm install` (new deps `@xyflow/react`, `@agentos/llm-router`).

---

## Implementation plan

| Step | Effort | Deliverable |
|------|--------|-------------|
| 1 | S | `configs/model-routes.json`, env vars, gitignore litellm state |
| 2 | M | `packages/llm-router` core + unit tests |
| 3 | S | API routes `/llm/chat`, `/llm/routes`, `/llm/activity` |
| 4 | S | Refactor `providers.ts` + `llm.ts` |
| 5 | S | `scripts/setup-litellm.ps1`, package.json scripts |
| 6 | S | `pnpm llm:smoke`, docs snippet in AGENTS.md |
| 7 | S | Settings panel: router health readout |

**Estimated size:** one PR ~600–900 LOC + config.

---

## Phase 2 (future spec)

- Home `/` Router section wired to `/llm/activity`  
- Virtual keys per environment (dev/staging/prod)  
- Prompt cache (LiteLLM cache params)  
- Data policy: `allowed_providers: ["ollama", "openai"]` per mission class  
- Optional OpenRouter as one LiteLLM provider (BYOK, not required)  
- `stack:background -IncludeLiteLLM`  

---

## Open questions

1. **Docker vs pip LiteLLM on Windows?** Recommend pip for Gage's machine; Docker optional.  
2. **Extend `ProviderLane` now or map internally?** Recommend extend shared types in same PR.  
3. **Should mission runtime call router for every agent step?** Yes — single choke point.  

---

## References

- LiteLLM proxy: https://docs.litellm.ai/docs/simple_proxy  
- AgentOS quota steward: `.agentos/agents/quota-steward.md`  
- Token spec: `docs/AGENTOS_TOKEN_OPTIMIZATION_SPEC.md`  
- OpenRouter pricing (feature parity target): https://openrouter.ai/pricing  
- System routing: `docs/architecture/system-routing-schematic.md`

---

## PR template

```markdown
## Summary
Self-hosted LLM router: LiteLLM sidecar + quota/budget gates + unified /llm/chat API.

## Test plan
- [ ] Ollama-only path (FEATURE_LITELLM_PROXY=false)
- [ ] LiteLLM fallback with OPENAI_API_KEY
- [ ] Quota block defers cloud call
- [ ] pnpm llm:smoke
- [ ] pnpm typecheck && pnpm test
```
